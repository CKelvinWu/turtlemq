class Queue {
  constructor(name) {
    this.name = name;
    this.isInitialized = false;
    this.consumer = [];
    this.consumerPointer = 0;
    this.head = 0;
    this.tail = 0;
    this.maxLength = 0;
    this.queue = [];
    this.triggerConsume = false;
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

  produce(message) {
    if (!(this.queue[this.head] === undefined || this.queue[this.head] === null)) {
      return false;
    }
    this.queue[this.head] = message;
    this.forwardHead();
    return true;
  }

  consume() {
    if (this.queue[this.tail] === undefined || this.queue[this.tail] === null) {
      return null;
    }
    const message = this.queue[this.tail];
    this.queue[this.tail] = null;
    this.forwardTail();
    return message;
  }

  addConsumer(res) {
    this.consumer.push(res);
    if (!this.triggerConsume) {
      setInterval(() => {
        if (this.consumer[this.consumerPointer]) {
          const message = this.consume();
          if (message) {
            this.consumer[this.consumerPointer].send({ success: true, msg: message });
          }
          this.consumerPointer = (this.consumerPointer + 1) % this.consumer.length;
        }
      }, 1000);
      this.triggerConsume = true;
    }
  }
}

const queueChannels = {};
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
    // create queue if not exist
    const maxLength = body.maxLength || 1000;
    const queueObj = createQueue(name, maxLength);
    const result = queueObj.produce(message);
    if (!result) {
      return res.send({ success: false, msg: 'queue overflow' });
    }
    console.log(`Produce queueArray: ${JSON.stringify(queueObj.queue)}`);
    return res.send({ success: true });
  } catch (error) {
    console.log(error);
    return res.send({ success: false, msg: 'produce error' });
  }
};

const consume = (req, res) => {
  const { body } = req;
  const { queue: name } = body;
  try {
    const queueObj = createQueue(name);
    if (!queueObj.isInitialized) {
      return res.send({ success: false, msg: 'queue not initialized' });
    }
    queueObj.addConsumer(res);
    console.log(`Consume queueArray: ${JSON.stringify(queueChannels)}`);
    return res.send({ success: true, msg: 'successifully subscribe' });
  } catch (error) {
    console.log(error);
    return res.send({ success: false, msg: 'consume error' });
  }
};

module.exports = { produce, consume };
