const asyncHandler = require('express-async-handler');
const Queue = require('../models/queue');

const queue = asyncHandler(async (req, res) => {
  const data = await Queue.getQueue();
  console.log(data);
  res.send(data);
});

module.exports = {
  queue,
};
