const express = require('express');

const router = express.Router();
const {
  monitor,
} = require('../controllers/monitor');

router.get('/', monitor);

module.exports = router;
