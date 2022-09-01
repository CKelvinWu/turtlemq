const queueChannels = {};
const queueInit = (queue, maxLength) => {
  queueChannels[queue] = {
    queue: Array(maxLength).fill(null),
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
  res.send({ success: true });
};

const produce = (req, res) => {
  const { body } = req;
  const { queue, message } = body;
  try {
    const queueObj = queueChannels[queue];
    const { maxLength, head } = queueObj;
    const queueArray = queueObj.queue;

    if (!(queueArray[head] === undefined || queueArray[head] === null)) {
      return res.send({ success: false, msg: 'queue overflow' });
    }
    queueArray[head] = message;
    queueObj.head = (head + 1) % maxLength;

    console.log(`queueArray: ${JSON.stringify(queueChannels)} ,head: ${queueObj.head}`);
    return res.send({ success: true });
  } catch (error) {
    console.log(error);
    return res.send({ success: false, msg: 'produce error' });
  }
};

const consume = (req, res) => {
  const { body } = req;
  const { queue } = body;
  try {
    const queueObj = queueChannels[queue];
    const { maxLength, tail } = queueObj;
    const queueArray = queueObj.queue;

    if (queueArray[tail] === undefined || queueArray[tail] === null) {
      return res.send({ success: true, msg: 'empty queue' });
    }

    const message = queueArray[tail];
    queueArray[tail] = null;
    queueObj.tail = (tail + 1) % maxLength;

    console.log(`queueArray: ${JSON.stringify(queueChannels)} ,tail: ${queueObj.tail}`);
    return res.send({ success: true, message });
  } catch (error) {
    console.log(error);
    return res.send({ success: false, msg: 'consume error' });
  }
};

module.exports = { init, produce, consume };
