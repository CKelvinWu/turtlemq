const Redis = require('ioredis');
require('dotenv').config();

const env = process.env.NODE_ENV || 'production';
const { CHANNEL } = process.env;
const { tmqp } = require('./tmqp');

const redisConf = {
  development: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    retryStrategy() {
      const delay = Math.min(5000);
      return delay;
    },
  },
  production: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    tls: {},
    retryStrategy() {
      const delay = Math.min(5000);
      return delay;
    },
  },
};
const redis = new Redis(redisConf[env]);

const subscriber = redis.duplicate();
subscriber.subscribe(CHANNEL, () => {
  console.log(`subscribe channel: ${CHANNEL}`);
});

subscriber.on('message', async (channel, message) => {
  const data = JSON.parse(message);
  const { method } = data;
  if (method === 'setMaster') {
    tmqp.reconnect();
    console.log('tmqp reconnecting...');
  }
});

module.exports = { redis };
