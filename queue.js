require('dotenv');
const EventEmitter = require('node:events');
const { redis } = require('./cache/cache');
const channel = require('./channel');
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
    console.log(`Produce ${this.name}: ${JSON.stringify(messages)}`);

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
    console.log(`Consume ${this.name}: ${JSON.stringify(messages)}`);
    return messages;
  }

  delete(req) {
    // const name = req.body.queue;
    delete channel.queueChannels[this.name];
    req.send({
      id: req.body.id,
      method: 'delete',
      queue: this.name,
      success: true,
    });
    console.log(`Delete ${this.name}`);
  }
}

const saveHistory = async () => {
  if (channel.role !== 'master') {
    setTimeout(() => {
      saveHistory();
    }, 5000);
    return;
  }
  const keys = Object.keys(channel.queueChannels);
  keys.forEach(async (name) => {
    const currentTime = Date.now();
    const queueSize = channel.queueChannels[name].getQueueLength();
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

    // history queue size remain the same
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
    const maxCountOfSavedHistory = (2 * MIN_KEEPED_HISTROY_TIME) / HISTORY_INTERVAL;
    if (historyLength > maxCountOfSavedHistory) {
      await redis.ltrim(
        historyKey,
        -maxCountOfSavedHistory - 1,
        -1,
      );
    }
  });
  setTimeout(() => {
    saveHistory();
  }, 5000);
};

// create queue if not exist
const createQueue = (name, maxLength = 0) => {
  if (!channel.queueChannels[name]) {
    channel.queueChannels[name] = new Queue(name);
  }
  if (!channel.queueChannels[name].isSettedMaxLength && maxLength) {
    channel.queueChannels[name].setMaxLength(maxLength);
    redis.hset(QUEUE_LIST, name, maxLength);
  }
  return channel.queueChannels[name];
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
  const { queue: name } = req.body;
  try {
    const queueObj = createQueue(name);
    await deleteQueues(name);
    queueObj.delete(req);
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
