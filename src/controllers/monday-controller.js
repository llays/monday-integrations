const mondayService = require('../services/monday-service');
const fetch = require('node-fetch');

async function cloneItem(req, res) {
  const {shortLivedToken} = req.session;
  const {payload} = req.body;

  try {
    const {inputFields} = payload;
    const {boardId, itemId, nameContains, targetGroupTitle, targetBoardId, linkColumnTitle} = inputFields;

    if (!await checkIfNameContains(shortLivedToken, itemId, nameContains)) {
      return res.status(200).send({});
    }

    const targetGroupId = await getGroupIdByTitle(shortLivedToken, targetBoardId, targetGroupTitle);
    const campaignDomain = await getCampaignDomain(shortLivedToken, boardId);
    const linkColumn = await findColumnByParam(shortLivedToken, targetBoardId, 'title', linkColumnTitle);
    const columnValues = await getColumnValues(shortLivedToken, boardId, targetBoardId, itemId, linkColumn.id);

    await mondayService.createItem(shortLivedToken, {
      boardId: targetBoardId,
      groupId: targetGroupId,
      itemName: campaignDomain,
      columnValues: columnValues,
    });

    return res.status(200).send({});
  } catch (err) {
    console.error(err);

    return res.status(500).send({ message: 'internal server error' });
  }
}

async function checkIfNameContains(shortLivedToken, itemId, nameContains) {
  const name = await mondayService.getItemName(shortLivedToken, itemId);

  return !name.toLowerCase().includes(nameContains.toLowerCase());  // inverted
}

async function getCampaignDomain(token, boardId) {
  const boardName = await mondayService.getBoardName(token, boardId);

  return boardName.split(' ')[0];
}

async function findColumnByParam(token, boardId, paramKey, paramValue) {
  const boardColumns = await mondayService.getBoardColumns(token, boardId);

  const filteredColumns = boardColumns.filter((column) => {
    return column[paramKey].toLowerCase() === paramValue.toLowerCase();
  });

  return filteredColumns[0];
}

function convertStatusValue(column, columnValue) {
  const statusLabels = JSON.parse(column.settings_str).labels;
  const statusIndex = JSON.parse(columnValue).index;
  const label = statusLabels[statusIndex];

  return JSON.stringify({label});
}

async function getColumnValues(token, boardId, targetBoardId, itemId, linkColumnId) {
  const sourceItemFields = await mondayService.getItemFields(token, itemId);
  const filteredSourceItemFields = sourceItemFields.filter((field) => field.value !== null);

  const targetColumns = await mondayService.getBoardColumns(token, targetBoardId);
  const targetColumnValues = {};

  targetColumns.forEach((targetColumn) => {
    const correspondedField = filteredSourceItemFields.filter((sourceColumn) => sourceColumn.title === targetColumn.title)[0];

    if (typeof correspondedField === 'undefined') return;

    targetColumnValues[targetColumn.id] = JSON.parse(correspondedField.value);
  });

  targetColumnValues[linkColumnId] = {
    url: `https://${process.env.MONDAY_ACCOUNT_SUBDOMAIN}.monday.com/boards/${boardId}/pulses/${itemId}`,
    text: `${boardId}:${itemId}`,
  };

  return targetColumnValues;
}

async function syncItem(req, res) {
  const {shortLivedToken} = req.session;
  const {payload} = req.body;

  try {
    const {inputFields} = payload;
    const {boardId, itemId, columnId, nameContains, anotherBoardId, linkColumnTitle} = inputFields;

    if (!await checkIfNameContains(shortLivedToken, itemId, nameContains)) {
      return res.status(200).send({});
    }

    const linkColumn = await findColumnByParam(shortLivedToken, anotherBoardId, 'title', linkColumnTitle);

    if (columnId === linkColumn.id) {
      return res.status(200).send({});
    }

    const {targetBoardId, targetItemId} = (
      await getTargetIds(shortLivedToken, boardId, anotherBoardId, itemId, linkColumn.id)
    );

    const sourceColumn = await findColumnByParam(shortLivedToken, boardId, 'id', columnId);
    const targetColumn = await findColumnByParam(shortLivedToken, targetBoardId, 'title', sourceColumn.title);

    if (!targetColumn) {
      throw new Error(`Target column ${sourceColumn.title} doesn't exist`);
    }

    let sourceColumnValue = await mondayService.getColumnValue(shortLivedToken, itemId, columnId);

    if (sourceColumn.type === 'color') {
      sourceColumnValue = convertStatusValue(sourceColumn, sourceColumnValue);
    }

    await mondayService.changeColumnValue(shortLivedToken, targetBoardId, targetItemId, targetColumn.id, sourceColumnValue);

    return res.status(200).send({});
  } catch (err) {
    console.error(err);

    return res.status(500).send({ message: 'internal server error' });
  }
}

async function getTargetIds(token, boardId, anotherBoardId, itemId, columnId) {
  let targetBoardId;
  let targetItemId;
  let columnValue;

  if (boardId === anotherBoardId) {
    columnValue = await mondayService.getColumnValue(token, itemId, columnId);
    const targetIds = JSON.parse(columnValue).text.split(':');

    targetBoardId = Number(targetIds[0]);
    targetItemId = Number(targetIds[1]);
  } else {
    columnValue = `${boardId}:${itemId}`;

    targetBoardId = anotherBoardId;
    targetItemId = await mondayService.getItemIdByColumnValue(token, anotherBoardId, columnId, columnValue);
  }

  return {targetBoardId, targetItemId};
}

async function subscribeTeam(req, res) {
  const {shortLivedToken} = req.session;
  const {payload} = req.body;

  try {
    const {inputFields} = payload;
    const {boardId, teamId} = inputFields;

    const teamMembers = await mondayService.getTeamMembers(shortLivedToken, teamId);
    const membersIds = teamMembers.map((member) => member.id);

    await mondayService.addSubscribersToBoard(shortLivedToken, boardId, membersIds);

    return res.status(200).send({});
  } catch (err) {
    console.error(err);

    return res.status(500).send({ message: 'internal server error' });
  }
}

async function mapExistingItems(req, res) {
  const {shortLivedToken} = req.session;
  const {webhookUrl, inputFields} = req.body.payload;
  const {boardId} = inputFields;

  try {
    const items = await mondayService.getBoardItems(shortLivedToken, boardId);

    setTimeout(() => {
      items.forEach((item) => callAction(webhookUrl, boardId, Number(item.id)));
    }, 5000);

    return res.status(200).send({});
  } catch (err) {
    console.error(err);

    return res.status(500).send({message: 'internal server error'});
  }
}

async function callAction(webhookUrl, boardId, itemId) {
  const body = {trigger: {outputFields: {boardId, itemId}}};
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': process.env.MONDAY_SIGNING_SECRET,
  };

  await fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
}

async function getGroupIdByTitle(token, boardId, groupTitle) {
  const groups = await mondayService.getBoardGroups(token, boardId);
  const group = groups.filter((group) => group.title.toLowerCase() === groupTitle.toLowerCase());

  return group[0].id;
}

async function recipeSubscribed(req, res) {
  const {webhookUrl} = req.body.payload;

  try {
    setTimeout(() => {
      callAction(webhookUrl);
    }, 5000);

    return res.status(200).send({});
  } catch (err) {
    console.error(err);

    return res.status(500).send({message: 'internal server error'});
  }
}

async function recipeUnsubscribed(req, res) {
  return res.status(200).send({});
}

async function setMonth(req, res)  {
  const {shortLivedToken} = req.session;
  const {payload} = req.body;

  try {
    const {inputFields} = payload;
    const {boardId, itemId, nameContains, columnId} = inputFields;

    if (!await checkIfNameContains(shortLivedToken, itemId, nameContains)) {
      return res.status(200).send({});
    }

    const todayDateJSON = getTodayDateJSON();

    await mondayService.changeColumnValue(shortLivedToken, boardId, itemId, columnId, todayDateJSON);

    return res.status(200).send({});
  } catch (err) {
    console.error(err);

    return res.status(500).send({ message: 'internal server error' });
  }
}

async function assignCreator(req, res)  {
  const {shortLivedToken} = req.session;
  const {payload} = req.body;

  try {
    const {inputFields} = payload;
    const {boardId, itemId, nameContains, columnId} = inputFields;

    if (!await checkIfNameContains(shortLivedToken, itemId, nameContains)) {
      return res.status(200).send({});
    }

    const creatorId = await mondayService.getItemCreatorId(shortLivedToken, itemId);
    const creatorJSON = getCreatorJSON(creatorId);

    await mondayService.changeColumnValue(shortLivedToken, boardId, itemId, columnId, creatorJSON);

    return res.status(200).send({});
  } catch (err) {
    console.error(err);

    return res.status(500).send({ message: 'internal server error' });
  }
}

function getTodayDateJSON() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const date = '01';
  // const date = String(now.getUTCDate()).padStart(2, '0');

  return JSON.stringify({date: `${year}-${month}-${date}`});
}

function getCreatorJSON(creatorId) {
  return JSON.stringify({
    personsAndTeams: [{
      id: creatorId,
      kind: 'person',
    }],
  });
}

module.exports = {
  cloneItem,
  syncItem,
  subscribeTeam,
  mapExistingItems,
  recipeSubscribed,
  recipeUnsubscribed,
  setMonth,
  assignCreator,
};
