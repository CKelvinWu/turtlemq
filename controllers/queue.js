const EventEmitter = require('node:events');

const queueChannels = {};
class Queue extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.isInitialized = false;
    this.subscribers = [];
    this.head = 0;
    this.tail = 0;
    this.maxLength = 0;
    this.queue = [];
    this.on('consume', () => {
      const res = this.subscribers.shift();
      this.consume(res);
    });
  }

  setMaxLength(maxLength) {
    this.maxLength = maxLength;
    this.queue = Array(maxLength).fill(null);
    this.isInitialized = true;
  }

  forwardHead() {
    this.head = (this.head + 1) % this.maxLength;
  }

  forwardTail() {
    this.tail = (this.tail + 1) % this.maxLength;
  }

  produce(message, res) {
    if (this.queue[this.head] !== null) {
      res.send({
        id: res.id,
        method: 'produce',
        success: false,
        message: 'queue overflow',
      });
      return false;
    }
    res.send({
      id: res.id,
      method: 'produce',
      success: true,
      message: 'produce message',
    });
    this.queue[this.head] = message;
    this.forwardHead();

    if (this.subscribers.length) {
      this.emit('consume');
    }
    return true;
  }

  consume(res) {
    // Hang the consumer if queue is empty
    if (this.queue[this.tail] === undefined || this.queue[this.tail] === null) {
      this.subscribers.push(res);
      return null;
    }
    const message = this.queue[this.tail];
    this.queue[this.tail] = null;
    this.forwardTail();
    res.send({
      id: res.id,
      method: 'consume',
      queue: this.name,
      success: true,
      message,
    });
    console.log(`Consume queueArray: ${JSON.stringify(queueChannels.test.queue)}`);
    return message;
  }
}

// create queue if not exist
const createQueue = (name, maxLength = 0) => {
  if (!queueChannels[name]) {
    queueChannels[name] = new Queue(name);
  }
  if (!queueChannels[name].isInitialized && maxLength) {
    queueChannels[name].setMaxLength(maxLength);
  }
  return queueChannels[name];
};

const produce = (req, res) => {
  const { body } = req;
  const { queue: name, message } = body;
  try {
    const maxLength = body.maxLength || 1000;
    const queueObj = createQueue(name, maxLength);
    return queueObj.produce(message, res);
  } catch (error) {
    console.log(error);
    return res.send({ success: false, message: 'produce error' });
  }
};

const consume = (req, res) => {
  const { body } = req;
  const { queue: name } = body;
  try {
    const queueObj = createQueue(name);
    queueObj.consume(res);
    return null;
  } catch (error) {
    console.log(error);
    return res.send({ success: false, message: 'consume error' });
  }
};

module.exports = { produce, consume };
