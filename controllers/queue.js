class Queue {
  constructor(name) {
    this.name = name;
    this.isInitialized = false;
    this.consumer = [];
    this.head = 0;
    this.tail = 0;
    this.maxLength = 0;
    this.queue = [];
  }

  setMaxLength(maxLength) {
    this.maxLength = maxLength;
    this.queue = Array(maxLength).fill(null);
    this.isInitialized = true;
  }

  forwordHead() {
    this.head = (this.head + 1) % this.maxLength;
  }

  forwordTail() {
    this.tail = (this.tail + 1) % this.maxLength;
  }

  produce(message) {
    if (!(this.queue[this.head] === undefined || this.queue[this.head] === null)) {
      return false;
    }
    this.queue[this.head] = message;
    this.forwordHead();
    return true;
  }

  consume() {
    if (this.queue[this.tail] === undefined || this.queue[this.tail] === null) {
      return false;
    }
    const message = this.queue[this.tail];
    this.queue[this.tail] = null;
    this.forwordTail();
    return message;
  }
}

const queueChannels = {};
const createQueue = (queue, maxLength = 0) => {
  if (!queueChannels[queue]) {
    queueChannels[queue] = new Queue(queue);
  }
  if (!queueChannels[queue].isInitialized && maxLength) {
    queueChannels[queue].setMaxLength(maxLength);
  }
  return queueChannels[queue];
};

const produce = (req, res) => {
  const { body } = req;
  const { queue, message } = body;
  try {
    // create queue if not exist
    const maxLength = body.maxLength || 1000;
    const queueObj = createQueue(queue, maxLength);
    const result = queueObj.produce(message);
    if (!result) {
      return res.send({ success: false, msg: 'queue overflow' });
    }
    console.log(`queueArray: ${JSON.stringify(queueObj.queue)} ,head: ${queueObj.head}`);
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
    const queueObj = createQueue(queue);
    if (!queueObj.isInitialized) {
      return res.send({ success: false, msg: 'queue not initialized' });
    }
    const message = queueObj.consume();
    if (!message) {
      return res.send({ success: true, msg: 'empty queue' });
    }

    console.log(`queueArray: ${JSON.stringify(queueChannels)} ,tail: ${queueObj.tail}`);
    return res.send({ success: true, message });
  } catch (error) {
    console.log(error);
    return res.send({ success: false, msg: 'consume error' });
  }
};

module.exports = { produce, consume };
