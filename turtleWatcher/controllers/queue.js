const asyncHandler = require('express-async-handler');
const Queue = require('../models/queue');

const queueInfo = asyncHandler(async (req, res) => {
  const data = await Queue.getQueue();
  res.send(data);
});

const produce = asyncHandler(async (req, res) => {
  const { queue, messages } = req.body;
  await Queue.produce(queue, messages);
  res.send({ success: true });
});

const consume = asyncHandler(async (req, res) => {
  const { queue, quantity } = req.body;
  const messages = await Queue.consume(queue, quantity);
  res.send({ success: true, messages });
});

module.exports = {
  queueInfo,
  produce,
  consume,
};
