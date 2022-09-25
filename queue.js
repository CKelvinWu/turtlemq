require('dotenv');
const EventEmitter = require('node:events');
const { redis } = require('./redis');
const group = require('./group');
const { deleteQueues } = require('./util');

const {
  DEFAULT_QUEUE_LENGTH, HISTORY_KEY, QUEUE_LIST,
} = process.env;
const HISTORY_INTERVAL = +process.env.HISTORY_INTERVAL;
const MIN_KEEPED_HISTROY_TIME = +process.env.MIN_KEEPED_HISTROY_TIME;

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
      req.send({
        id: req.body.id,
        method: 'consume',
        queue: this.name,
        success: true,
        pending: true,
      });
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

  delete(req) {
    // const name = req.body.queue;
    delete group.queueChannels[this.name];
    req.send({
      id: req.body.id,
      method: 'delete',
      queue: this.name,
      success: true,
    });
  }
}

const saveHistory = async () => {
  if (group.role !== 'master') {
    setTimeout(() => {
      saveHistory();
    }, 5000);
    return;
  }
  const keys = Object.keys(group.queueChannels);
  keys.forEach(async (name) => {
    const currentTime = Date.now();
    const queueSize = group.queueChannels[name].getQueueLength();
    const historyKey = HISTORY_KEY + name;
    const latestHistory = await redis.lindex(historyKey, -1);

    // first history
    if (!latestHistory) {
      await redis.rpush(historyKey, JSON.stringify({
        time: currentTime - HISTORY_INTERVAL,
        queueSize: 0,
      }));
      await redis.rpush(historyKey, JSON.stringify({ time: currentTime, queueSize }));
      return;
    }

    // history exceed interval
    const { time, queueSize: lastQueueSize } = JSON.parse(latestHistory);
    if (lastQueueSize === queueSize) {
      return;
    }
    // last interval has insert value
    if (currentTime - HISTORY_INTERVAL * 2 > time) {
      const history = { time: currentTime - HISTORY_INTERVAL, queueSize: lastQueueSize };
      await redis.rpush(historyKey, JSON.stringify(history));
    }
    await redis.rpush(historyKey, JSON.stringify({ time: currentTime, queueSize }));

    // remove old history
    const historyLength = await redis.llen(historyKey);
    if (historyLength > (2 * MIN_KEEPED_HISTROY_TIME) / HISTORY_INTERVAL) {
      await redis.lrem(historyKey, historyLength - MIN_KEEPED_HISTROY_TIME / HISTORY_INTERVAL);
    }
  });
  setTimeout(() => {
    saveHistory();
  }, 5000);
};

// create queue if not exist
const createQueue = (name, maxLength = 0) => {
  if (!group.queueChannels[name]) {
    group.queueChannels[name] = new Queue(name);
  }
  if (!group.queueChannels[name].isSettedMaxLength && maxLength) {
    group.queueChannels[name].setMaxLength(maxLength);
    redis.hset(QUEUE_LIST, name, maxLength);
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
    return;
  } catch (error) {
    console.log(error);
    req.send({ success: false, message: 'consume error' });
  }
};

const deleteQueue = async (req) => {
  const { queue } = req.body;
  console.log(queue);
  try {
    await deleteQueues(queue);
    group.queueChannels[queue]?.delete(req);
  } catch (error) {
    console.log(error);
    req.send({ success: false, message: 'delete error' });
  }
};

const setQueue = (req) => {
  const { queueChannels } = req.body;
  Object.keys(queueChannels).forEach((key) => {
    const {
      maxLength, queue, head, tail,
    } = queueChannels[key];
    const queueObj = createQueue(key, maxLength);
    queueObj.queue = queue;
    queueObj.head = head;
    queueObj.tail = tail;
  });
  return req.send({ success: true, message: 'set queue successifully' });
};

saveHistory();

module.exports = {
  produce, consume, setQueue, deleteQueue,
};
