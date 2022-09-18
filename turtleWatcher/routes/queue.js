const express = require('express');

const router = express.Router();
const {
  queueInfo, produce, consume,
} = require('../controllers/queue');

router.get('/', queueInfo);

router.post('/produce', produce);

router.post('/consume', consume);

module.exports = router;
