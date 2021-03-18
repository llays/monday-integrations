const router = require('express').Router();
const {authenticationMiddleware} = require('../middlewares/authentication');
const mondayController = require('../controllers/monday-controller');

router.post('/monday/clone_item', authenticationMiddleware, mondayController.cloneItem);
router.post('/monday/clone_item_by_person', authenticationMiddleware, mondayController.cloneItemByPerson);
router.post('/monday/sync_item', authenticationMiddleware, mondayController.syncItem);
router.post('/monday/sync_item_by_person', authenticationMiddleware, mondayController.syncItemByPerson);
router.post('/monday/subscribe_team', authenticationMiddleware, mondayController.subscribeTeam);
router.post('/monday/map_existing_items', authenticationMiddleware, mondayController.mapExistingItems);
router.post('/monday/recipe_subscribed', authenticationMiddleware, mondayController.recipeSubscribed);
router.post('/monday/recipe_unsubscribed', authenticationMiddleware, mondayController.recipeUnsubscribed);
router.post('/monday/set_month', authenticationMiddleware, mondayController.setMonth);
router.post('/monday/assign_creator', authenticationMiddleware, mondayController.assignCreator);

module.exports = router;
