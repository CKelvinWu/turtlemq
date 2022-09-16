/* eslint-disable no-await-in-loop */
const { redis } = require('../utils/redis');

const { QUEUE_LIST, HISTORY_KEY } = process.env;
const HISTORY_TIME = 60 * 60 * 1000;
const HISTORY_INTERVAL = 5000;

const getQueue = async () => {
  const queueList = await redis.smembers(QUEUE_LIST);
  const queueInfo = {};
  const time = Date.now();
  for (const queue of queueList) {
    const results = await redis.lrange(
      `${HISTORY_KEY}${queue}`,
      -(HISTORY_TIME / HISTORY_INTERVAL) - 1,
      -1,
    );

    const data = [];
    if ((HISTORY_TIME / HISTORY_INTERVAL) + 1 > results.length) {
      data.push({ time: time - (+HISTORY_TIME), queueSize: 0 });
    }

    for (let i = 0; i < results.length; i++) {
      const history = JSON.parse(results[i]);
      // if there is any history in past an hour
      if (time - history.time < +HISTORY_TIME) {
        data.push(history);
      }
    }
    data.push({ time, queueSize: data.at(-1)?.queueSize });
    queueInfo[queue] = data;
  }
  return queueInfo;
};

module.exports = { getQueue };
