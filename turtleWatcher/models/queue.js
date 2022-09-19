/* eslint-disable no-await-in-loop */
const { redis } = require('../utils/redis');
const { tmqp } = require('../utils/tmqp');

const {
  QUEUE_LIST, HISTORY_KEY, STATE_KEY, MASTER_KEY, REPLICA_KEY,
} = process.env;
const HISTORY_TIME = 60 * 60 * 1000;
const HISTORY_INTERVAL = 5000;

const getQueue = async () => {
  const queueList = await redis.hkeys(QUEUE_LIST);
  const queueInfo = {};
  const time = Date.now();
  for (const queue of queueList) {
    const results = await redis.lrange(
      `${HISTORY_KEY}${queue}`,
      -(HISTORY_TIME / HISTORY_INTERVAL) - 1,
      -1,
    );
    const startTime = time - (+HISTORY_TIME);
    const data = [];
    // if the latest data points is less than numbers of interval
    const latestResult = JSON.parse(results.at(-1));
    if (latestResult?.time < startTime) {
      data.push({ time: time - (+HISTORY_TIME), queueSize: latestResult?.queueSize });
      data.push({ time, queueSize: latestResult?.queueSize });
    } else {
      data.push({ time: time - (+HISTORY_TIME), queueSize: 0 });
      // if there is any history in past an hour
      for (let i = 0; i < results.length; i++) {
        const history = JSON.parse(results[i]);
        if (time - history.time < +HISTORY_TIME) {
          data.push(history);
        }
      }
    }

    // // push current time stamp
    // data.push({ time, queueSize: data.at(-1)?.queueSize });
    const maxLength = await redis.hget(QUEUE_LIST, queue);
    queueInfo[queue] = {};
    queueInfo[queue].queueSize = data;
    queueInfo[queue].maxLength = maxLength;
    console.log(queueInfo[queue]);
  }
  const result = {};
  result.queueInfo = queueInfo;
  const master = await redis.get(MASTER_KEY);
  const replicas = await redis.hkeys(REPLICA_KEY);
  if (master) {
    result.master = master;
  }
  if (replicas.length) {
    result.replicas = replicas;
  }
  return result;
};

const produce = async (queue, messages) => {
  await tmqp.produce(queue, messages);
};

const consume = async (queue, quantity) => {
  const messages = await tmqp.consume(queue, quantity);
  return messages;
};

const deleteQueue = async (queue) => {
  const messages = await tmqp.delete(queue);
  return messages;
};

module.exports = {
  getQueue, produce, consume, deleteQueue,
};