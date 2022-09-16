const http = require('http');
require('dotenv').config();
const { redis } = require('./redis');

const {
  NODE_ENV, PORT, STATE_KEY, MASTER_KEY, REPLICA_KEY, CHANNEL, QUEUE_LIST, HISTORY_KEY,
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

async function getState() {
  const state = await redis.get(STATE_KEY);
  return state;
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

async function setState(state) {
  const states = ['active', 'voting'];
  if (states.includes(state)) {
    await redis.set(STATE_KEY, state);
  }
}

async function publishToChannel(message) {
  await redis.publish(CHANNEL, JSON.stringify(message));
}

function getReqHeader(client) {
  let reqHeader;
  while (true) {
    let reqBuffer = Buffer.from('');
    const buf = client.read();
    if (buf === null) break;

    reqBuffer = Buffer.concat([reqBuffer, buf]);

    // Indicating end of a request
    const marker = reqBuffer.indexOf('\r\n\r\n');
    if (marker !== -1) {
      // Record the data after \r\n\r\n
      const remaining = reqBuffer.slice(marker + 4);
      reqHeader = reqBuffer.slice(0, marker).toString();
      // Push the extra readed data back to the socket's readable stream
      client.unshift(remaining);
      break;
    }
  }
  return reqHeader;
}

const deleteQUeue = (name) => {
  const historyKey = HISTORY_KEY + name;
  redis.srem(QUEUE_LIST, name);
  redis.del(historyKey);
};

module.exports = {
  stringToHostAndPort,
  getCurrentIp,
  getState,
  getMaster,
  setMaster,
  getReplicas,
  setReplica,
  setState,
  publishToChannel,
  getReqHeader,
  getReplicasConfig,
  deleteQUeue,
};
