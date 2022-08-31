const queueChannels = {};
const queueInit = (queue, maxLength) => {
  queueChannels[queue] = {
    queue: [],
    maxLength,
    head: 0,
    tail: 0,
  };
};

const init = (req, res) => {
  const { body } = req;
  const { queue } = body;
  const maxLength = body.maxLength || 1000;
  if (!queueChannels[queue]) queueInit(queue, maxLength);
  console.log(queueChannels);
  res.status(200).json({ success: true });
};

module.exports = { init };
