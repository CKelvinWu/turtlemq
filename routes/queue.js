const express = require('express');

const router = express.Router();
const queueControllers = require('../controllers/queue');

router.post('/init', queueControllers.init);

router.post('/produce', queueControllers.produce);

router.post('/consume', queueControllers.consume);

module.exports = router;
