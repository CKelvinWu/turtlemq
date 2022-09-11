// const http = require('http');
require('dotenv').config();
const { redis } = require('./redis');

const {
  HOST, PORT, STATE_KEY, MASTER_KEY, REPLICA_KEY, CHANNEL,
} = process.env;

async function getCurrentIp() {
  return new Promise((resolve) => {
    resolve(`${HOST}:${PORT}`);
    // http.get({ host: 'api.ipify.org', port: 80, path: '/' }, (resp) => {
    //   resp.on('data', (ip) => {
    //     console.log(`My public IP address is: ${ip}`);
    //     resolve(`${ip}:${PORT}`);
    //   });
    // }).end();
  });
}

const ip = `${HOST}:${PORT}`;

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

module.exports = {
  stringToHostAndPort,
  getCurrentIp,
  ip,
  getState,
  getMaster,
  setMaster,
  getReplicas,
  setReplica,
  setState,
  publishToChannel,
  getReqHeader,
  getReplicasConfig,
};
