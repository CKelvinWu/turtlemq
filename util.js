const http = require('http');
require('dotenv').config();
const { redis } = require('./redis');

const {
  NODE_ENV, PORT, MASTER_KEY, REPLICA_KEY, CHANNEL, QUEUE_LIST, HISTORY_KEY,
} = process.env;

async function getCurrentIp() {
  return new Promise((resolve) => {
    http.get({ host: 'api.ipify.org', port: 80, path: '/' }, (res) => {
      res.on('data', (ip) => {
        console.log(`My public IP address is: ${ip}`);
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

async function getMaster() {
  const master = await redis.get(MASTER_KEY);
  return master;
}

async function setMaster(IP) {
  await redis.set(MASTER_KEY, IP);
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

async function setReplica(key) {
  await redis.hset(REPLICA_KEY, key, 1);
}

async function publishToChannel(message) {
  await redis.publish(CHANNEL, JSON.stringify(message));
}

const deleteQueues = (name) => {
  const historyKey = HISTORY_KEY + name;
  redis.hdel(QUEUE_LIST, name);
  redis.del(historyKey);
};

module.exports = {
  stringToHostAndPort,
  getCurrentIp,
  getMaster,
  setMaster,
  getReplicas,
  setReplica,
  publishToChannel,
  getReplicasConfig,
  deleteQueues,
};
