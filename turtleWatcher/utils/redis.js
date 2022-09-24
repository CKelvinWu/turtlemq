const Redis = require('ioredis');
require('dotenv').config();

const env = process.env.NODE_ENV || 'production';

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

module.exports = { redis };
