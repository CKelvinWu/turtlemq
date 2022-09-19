const express = require('express');

const router = express.Router();
const {
  queueInfo, produce, consume, deleteQueue,
} = require('../controllers/queue');

router.get('/', queueInfo);

router.post('/produce', produce);

router.post('/consume', consume);

router.post('/delete', deleteQueue);

module.exports = router;
