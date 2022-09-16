/* eslint-disable no-await-in-loop */
const { redis } = require('../utils/redis');

const { QUEUE_LIST, HISTORY_KEY } = process.env;
const HISTORY_TIME = 60 * 60 * 1000;

const getQueue = async () => {
  const queueList = await redis.smembers(QUEUE_LIST);
  const queueInfo = {};
  const time = Date.now();
  for (const queue of queueList) {
    const results = await redis.lrange(`${HISTORY_KEY}${queue}`, 0, -1);
    // if results.lenth = 0
    const data = [];
    for (let i = 0; i < results.length; i++) {
      const history = JSON.parse(results[i]);
      // if there is any history in past an hour
      if (time - history.time < +HISTORY_TIME) {
        data.push(history);
      }
    }
    // if there is non history in past an hour
    if (!data.at(-1)?.queueSize) {
      const result = await redis.lindex(`${HISTORY_KEY}${queue}`, -1);
      const history = JSON.parse(result);
      data.push(
        { time: time - (+HISTORY_TIME), queueSize: history.queueSize },
        // { time: time - 5000, queueSize: history.queueSize },
        // { time, queueSize: history.queueSize },
      );
    } else {
      data.push({ time: Date.now(), queueSize: data.at(-1)?.queueSize });
    }
    queueInfo[queue] = data;
  }
  return queueInfo;
};

module.exports = { getQueue };
