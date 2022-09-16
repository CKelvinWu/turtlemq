require('dotenv');
const EventEmitter = require('node:events');
const { redis } = require('./redis');
const group = require('./group');

const {
  DEFAULT_QUEUE_LENGTH, HISTORY_KEY, HISTORY_INTERVAL, QUEUE_LIST,
} = process.env;

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

  getQueueLength() {
    const { head, tail, maxLength } = this;
    // Either empty of overflow
    if (head === tail) {
      return this.queue[head] !== null ? maxLength : 0;
    }
    return ((head - tail + maxLength) % maxLength);
  }

  produce(messages, req) {
    // check if queue has enough space
    const { head, maxLength } = this;
    for (let i = head; i < messages.length + head; i++) {
      if (this.queue[i % maxLength] !== null) {
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
      this.queue[head] = message;
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
      if (this.queue[this.tail] === null) {
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
const saveHistory = async (name, queueSize) => {
  redis.sadd(QUEUE_LIST, name);
  const historyKey = HISTORY_KEY + name;
  const latestHistory = await redis.lindex(historyKey, -1);
  // first history
  if (!latestHistory) {
    const history = { time: Date.now(), queueSize };
    await redis.rpush(historyKey, JSON.stringify(history));
    return;
  }

  // history exceed interval
  const { time } = JSON.parse(latestHistory);
  if (Date.now() - time > HISTORY_INTERVAL) {
    const history = { time: Date.now(), queueSize };
    await redis.rpush(historyKey, JSON.stringify(history));
    return;
  }
  // update history in interval
  const history = { time, queueSize };
  await redis.lset(historyKey, -1, JSON.stringify(history));
};

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
    queueObj.produce(messages, req);
    if (req.role === 'master') {
      saveHistory(name, queueObj.getQueueLength());
    }
    return;
  } catch (error) {
    console.log(error);
    req.send({ success: false, message: 'produce error' });
  }
};

const consume = (req) => {
  const { body } = req;
  const { queue: name } = body;
  try {
    const queueObj = createQueue(name);
    queueObj.consume(req);
    if (req.role === 'master') {
      saveHistory(name, queueObj.getQueueLength());
    }
    return;
  } catch (error) {
    console.log(error);
    req.send({ success: false, message: 'consume error' });
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

setInterval(() => {
  if (group.role !== 'master') {
    return;
  }
  const keys = Object.keys(group.queueChannels);
  keys.forEach((name) => {
    saveHistory(name, group.queueChannels[name].getQueueLength());
  });
}, 5000);
module.exports = { produce, consume, setqueue };
