require('dotenv').config();
const crypto = require('crypto');
const {
  stringToHostAndPort, getCurrentIp,
  setPending, publishToChannel, getReplicasConfig, setRole,
} = require('./util');
const SocketConnection = require('./connection');

// const ROLE = process.env.ROLE || 'replica';
const CLUSTER_MODE = process.env.CLUSTER_MODE || 'off';
const ROLE = CLUSTER_MODE === 'on' ? 'replica' : 'master';

const randomId = () => crypto.randomBytes(8).toString('hex');

class Channel {
  constructor() {
    this.queueChannels = {};
    this.connections = [];
    this.id = randomId();
    this.init();
  }

  async init() {
    this.ip = await getCurrentIp();
    if (ROLE === 'master') {
      const role = await setRole(this.ip);
      this.role = role;
      const message = { method: 'join', ip: this.ip, role: this.role };
      await publishToChannel(message);
      return;
    }

    // check replica
    this.role = 'replica';
    await setPending(this.ip);
    const message = { method: 'join', ip: this.ip, role: this.role };
    await publishToChannel(message);
    this.createReplicaConnections();
  }

  async createReplicaConnections() {
    if (this.role !== 'master') {
      return;
    }
    const replicasConfig = await getReplicasConfig();
    replicasConfig.forEach(async (replicaConfig) => {
      const connection = new SocketConnection(replicaConfig);
      this.connections.push(connection);
      this.setQueue(connection);
    });
  }

  async createReplicaConnection(ip) {
    if (this.role !== 'master') {
      return;
    }
    const replicaConfig = stringToHostAndPort(ip);
    const connection = new SocketConnection(replicaConfig);
    this.connections.push(connection);
    this.setQueue(connection);
  }

  setQueue(connection) {
    const message = { id: this.id, method: 'setQueue', queueChannels: this.queueChannels };
    connection.send(message);
  }

  async send(message) {
    for (let i = 0; i < this.connections.length; i++) {
      const connection = this.connections[i];
      connection.send(message);
    }
  }
}
const channel = new Channel();
module.exports = channel;
