const initMondayClient = require('monday-sdk-js');

const getItemName = async (token, itemId) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setToken(token);

    const query = `query($itemId: [Int]) {
        items (ids: $itemId) {
          name
        }
      }`;

    const response = await mondayClient.api(query, {variables: {itemId}});

    return response.data.items[0].name;
  } catch (err) {
    console.error(err);
  }
};

const getColumnValue = async (token, itemId, columnId) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setToken(token);

    const query = `query($itemId: [Int], $columnId: [String]) {
        items (ids: $itemId) {
          column_values(ids:$columnId) {
            value
          }
        }
      }`;
    const variables = { columnId, itemId };

    const response = await mondayClient.api(query, { variables });

    return response.data.items[0].column_values[0].value;
  } catch (err) {
    console.error(err);
  }
};

const changeColumnValue = async (token, boardId, itemId, columnId, value) => {
  try {
    const mondayClient = initMondayClient({ token });

    const query = `mutation change_column_value($boardId: Int!, $itemId: Int!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
        id
      }
    }`;

    value = value || JSON.stringify({});

    const variables = { boardId, columnId, itemId, value };
    console.log('changeColumnValue', JSON.stringify(variables));
    const response = await mondayClient.api(query, { variables });

    return response;
  } catch (err) {
    console.error(err);
  }
};

async function createItem(token, fields) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `mutation create_item($itemName: String!, $boardId: Int!, $groupId: String!, $columnValues: JSON!) {
      create_item(item_name: $itemName, board_id: $boardId, group_id: $groupId, column_values: $columnValues) {
        id
      }
    }`;

    fields.columnValues = fields.columnValues ? JSON.stringify(fields.columnValues) : fields.columnValues;

    return await mondayClient.api(query, {variables: fields});
  } catch (err) {
    console.error(err);
  }
}

async function getBoardName(token, boardId) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `query($boardId: [Int]) {
      boards(ids: $boardId) {
        name
      }
    }`;

    const response = await mondayClient.api(query, {variables: {boardId}});

    return response.data.boards[0].name;
  } catch (err) {
    console.error(err);
  }
}

async function getBoardColumns(token, boardId) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `query($boardId: [Int]) {
      boards(ids: $boardId) {
        columns {
          id
          title
          type
          settings_str
        }
      }
    }`;

    const response = await mondayClient.api(query, {variables: {boardId}});

    return response.data.boards[0].columns;
  } catch (err) {
    console.error(err);
  }
}

async function getItemIdByColumnValue(token, boardId, columnId, columnValue) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `query ($boardId: Int!, $columnId: String!, $columnValue: String!) {
      items_by_column_values(board_id: $boardId, column_id: $columnId, column_value: $columnValue) {
        id
      }
    }`;

    const variables = {boardId, columnId, columnValue};

    const response = await mondayClient.api(query, {variables});

    console.log('mondayService | getItemIdByColumnValue', boardId, columnId, columnValue, response, response.data);

    if (response.data && response.data.items_by_column_values && response.data.items_by_column_values.length > 0) {
      return Number(response.data.items_by_column_values[0].id);
    } else {
      return new Promise((resolve) => {
        setTimeout(async () => {
          resolve(await getItemIdByColumnValue(...arguments));
        }, 5000);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function addSubscribersToBoard(token, boardId, subscribersIds) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `mutation add_subscribers_to_board($boardId: Int!, $subscribersIds: [Int]!) {
      add_subscribers_to_board(board_id: $boardId, user_ids: $subscribersIds, kind: owner) {
        id
      }
    }`;

    const variables = {boardId, subscribersIds};

    return await mondayClient.api(query, {variables});
  } catch (err) {
    console.error(err);
  }
}

async function getTeamMembers(token, teamId) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `query($teamId: [Int]) {
      teams(ids: $teamId) {
        users {
          id
        }
      }
    }`;

    const response = await mondayClient.api(query, {variables: {teamId}});

    return response.data.teams[0].users;
  } catch (err) {
    console.error(err);
  }
}

async function getBoardItems(token, boardId) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `query($boardId: [Int]) {
      boards(ids: $boardId) {
        items(limit: 100) {
          id
          group {
            id
          }
        }
      }
    }`;

    const response = await mondayClient.api(query, {variables: {boardId}});

    return response.data.boards[0].items;
  } catch (err) {
    console.error(err);
  }
}

async function getBoardGroups(token, boardId) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `query($boardId: [Int]) {
      boards(ids: $boardId) {
        groups {
          id
          title
        }
      }
    }`;

    const response = await mondayClient.api(query, {variables: {boardId}});

    return response.data.boards[0].groups;
  } catch (err) {
    console.error(err);
  }
}

async function getItemCreatorId(token, itemId) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `query($itemId: [Int]) {
      items(ids: $itemId) {
        creator {
          id
        }
      }
    }`;

    const response = await mondayClient.api(query, {variables: {itemId}});

    return Number(response.data.items[0].creator.id);
  } catch (err) {
    console.error(err);
  }
}

async function getItemFields(token, itemId) {
  try {
    const mondayClient = initMondayClient({token});

    const query = `query($itemId: [Int]) {
      items(ids: $itemId) {
        column_values {
          id
          title
          value
        }
      }
    }`;

    const response = await mondayClient.api(query, {variables: {itemId}});

    return response.data.items[0].column_values;
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  getItemName,
  getColumnValue,
  changeColumnValue,
  createItem,
  getBoardName,
  getBoardColumns,
  getItemIdByColumnValue,
  addSubscribersToBoard,
  getBoardItems,
  getBoardGroups,
  getTeamMembers,
  getItemCreatorId,
  getItemFields,
};
