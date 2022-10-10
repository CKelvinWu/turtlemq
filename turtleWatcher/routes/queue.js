const express = require('express');

const router = express.Router();
const {
  queueInfo, produce, consume, deleteQueue,
} = require('../controllers/queue');
const { auth } = require('../utils/auth');

router.get('/', auth, queueInfo);

router.post('/produce', auth, produce);

router.post('/consume', auth, consume);

router.post('/delete', auth, deleteQueue);

module.exports = router;
