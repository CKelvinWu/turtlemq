const express = require('express');

const router = express.Router();
const queueControllers = require('../controllers/queue');

router.post('/init', queueControllers.init);

module.exports = router;
