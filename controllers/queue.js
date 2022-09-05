require('dotenv');
const EventEmitter = require('node:events');

const { DEFAULT_QUEUE_LENGTH } = process.env;
const queueChannels = {};
class Queue extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.isSettedMaxLength = false;
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
    this.isSettedMaxLength = true;
  }

  forwardHead() {
    this.head = (this.head + 1) % this.maxLength;
  }

  forwardTail() {
    this.tail = (this.tail + 1) % this.maxLength;
  }

  produce(messages, res) {
    // check if queue has enough space
    for (let i = this.head; i < messages.length; ++i % this.maxLength) {
      if (this.queue[i] !== null) {
        res.send({
          id: res.id,
          method: 'produce',
          success: false,
          message: 'queue overflow',
        });
        return false;
      }
    }

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      this.queue[this.head] = message;
      this.forwardHead();
    }
    res.send({
      id: res.id,
      method: 'produce',
      success: true,
      message: 'produce message',
    });
    console.log(`Consume queue: ${JSON.stringify(messages)}`);

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

    const messages = [];
    for (let i = 0; i < res.body.nums; i++) {
      if (!this.queue[this.tail]) {
        break;
      }
      messages.push(this.queue[this.tail]);
      this.queue[this.tail] = null;
      this.forwardTail();
    }

    res.send({
      id: res.id,
      method: 'consume',
      queue: this.name,
      success: true,
      messages,
    });
    console.log(`Consume queue: ${JSON.stringify(messages)}`);
    return messages;
  }
}

// create queue if not exist
const createQueue = (name, maxLength = 0) => {
  if (!queueChannels[name]) {
    queueChannels[name] = new Queue(name);
  }
  if (!queueChannels[name].isSettedMaxLength && maxLength) {
    queueChannels[name].setMaxLength(maxLength);
  }
  return queueChannels[name];
};

const produce = (req, res) => {
  const { body } = req;
  const { queue: name, messages } = body;
  try {
    const maxLength = body.maxLength || +DEFAULT_QUEUE_LENGTH;
    const queueObj = createQueue(name, maxLength);
    return queueObj.produce(messages, res);
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
