const http = require('http');
require('dotenv').config();
const { redis } = require('./cache/cache');

const {
  NODE_ENV, PORT, MASTER_KEY, REPLICA_KEY, PENDING_KEY, CHANNEL, QUEUE_LIST, HISTORY_KEY,
} = process.env;

async function getCurrentIp() {
  return new Promise((resolve) => {
    http.get({ host: 'api.ipify.org', port: 80, path: '/' }, (res) => {
      res.on('data', (ip) => {
        // console.log(`My public IP address is: ${ip}`);
        if (NODE_ENV === 'development') {
          resolve(`localhost:${PORT}`);
        }
        resolve(`${ip}:${PORT}`);
      });
    }).end();
  });
}

function stringToHostAndPort(address) {
  return { host: address.split(':')[0], port: address.split(':')[1] };
}

async function setMaster(ip) {
  await redis.set(MASTER_KEY, ip);
}

async function getReplicas() {
  const replicas = await redis.hkeys(REPLICA_KEY);
  return replicas;
}

async function getReplicasConfig() {
  const replicas = await redis.hkeys(REPLICA_KEY);
  const replicasConfig = replicas.map((replica) => stringToHostAndPort(replica));
  return replicasConfig;
}

async function setPending(key) {
  // await redis.hset(REPLICA_KEY, key, 1);
  await redis.sadd(PENDING_KEY, key);
}

async function publishToChannel(message) {
  await redis.publish(CHANNEL, JSON.stringify(message));
}

const deleteQueues = (name) => {
  const historyKey = HISTORY_KEY + name;
  redis.hdel(QUEUE_LIST, name);
  redis.del(historyKey);
};

async function setRole(ip) {
  const role = await redis.setRole(2, MASTER_KEY, REPLICA_KEY, ip);
  return role;
}

module.exports = {
  stringToHostAndPort,
  getCurrentIp,
  setMaster,
  getReplicas,
  setPending,
  publishToChannel,
  getReplicasConfig,
  deleteQueues,
  setRole,
};
