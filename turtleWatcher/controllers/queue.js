const asyncHandler = require('express-async-handler');
const Queue = require('../models/queue');

const queue = asyncHandler(async (req, res) => {
  const data = await Queue.getQueue();
  res.send(data);
});

module.exports = {
  queue,
};
