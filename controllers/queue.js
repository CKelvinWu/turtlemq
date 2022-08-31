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

const produce = (req, res) => {
  const { body } = req;
  const { queue, message } = body;
  try {
    const queueObj = queueChannels[queue];
    const { maxLength, head, tail } = queueObj;
    const queueArray = queueObj.queue;

    if ((head + 1) % maxLength === tail) {
      return res.status(404).json({ success: false, msg: 'queue overflow' });
    }
    queueObj.head = (head + 1) % maxLength;
    queueArray[(head + 1) % maxLength] = message;

    console.log(`queueArray: ${JSON.stringify(queueChannels)} ,head: ${queueObj.head}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(404).json({ success: false, msg: 'produce error' });
  }
};

module.exports = { init, produce };
