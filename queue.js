require('dotenv');
const EventEmitter = require('node:events');
const group = require('./group');

const { DEFAULT_QUEUE_LENGTH } = process.env;
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
      const req = this.subscribers.shift();
      this.consume(req);
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

  produce(messages, req) {
    // check if queue has enough space
    for (let i = this.head; i < messages.length; ++i % this.maxLength) {
      if (this.queue[i] !== null) {
        req.send({
          id: req.body.id,
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
    req.send({
      id: req.body.id,
      method: 'produce',
      success: true,
      message: 'produce message',
      messages,
    });
    console.log(`Produce queue: ${JSON.stringify(messages)}`);

    if (this.subscribers.length) {
      this.emit('consume');
    }
    return true;
  }

  consume(req) {
    // Hang the consumer if queue is empty
    if (this.queue[this.tail] === undefined || this.queue[this.tail] === null) {
      this.subscribers.push(req);
      return null;
    }

    const messages = [];
    for (let i = 0; i < req.body.nums; i++) {
      if (!this.queue[this.tail]) {
        break;
      }
      messages.push(this.queue[this.tail]);
      this.queue[this.tail] = null;
      this.forwardTail();
    }

    req.send({
      id: req.body.id,
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
  if (!group.queueChannels[name]) {
    group.queueChannels[name] = new Queue(name);
  }
  if (!group.queueChannels[name].isSettedMaxLength && maxLength) {
    group.queueChannels[name].setMaxLength(maxLength);
  }
  return group.queueChannels[name];
};

const produce = (req) => {
  const { body } = req;
  const { queue: name, messages } = body;
  try {
    const maxLength = body.maxLength || +DEFAULT_QUEUE_LENGTH;
    const queueObj = createQueue(name, maxLength);
    return queueObj.produce(messages, req);
  } catch (error) {
    console.log(error);
    return req.send({ success: false, message: 'produce error' });
  }
};

const consume = (req) => {
  const { body } = req;
  const { queue: name } = body;
  try {
    const queueObj = createQueue(name);
    queueObj.consume(req);
    return null;
  } catch (error) {
    console.log(error);
    return req.send({ success: false, message: 'consume error' });
  }
};

const setqueue = (req) => {
  const { queueChannels } = req.body;
  Object.keys(queueChannels).forEach((key) => {
    const {
      maxLength, queue, head, tail,
    } = queueChannels[key];
    const queueObj = createQueue(key, maxLength);
    queueObj.produce(queue, req);
    group.queueChannels[key].head = head;
    group.queueChannels[key].tail = tail;
  });
  return req.send({ success: true, message: 'set queue successifully' });
};

module.exports = { produce, consume, setqueue };
