const express = require('express');

const router = express.Router();
const {
  queue,
} = require('../controllers/queue');

router.get('/', queue);

module.exports = router;
