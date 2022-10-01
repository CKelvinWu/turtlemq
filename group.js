require('dotenv').config();
const crypto = require('crypto');
const {
  stringToHostAndPort, getCurrentIp, setMaster,
  setPending, publishToChannel, getReplicasConfig,
} = require('./util');
const Turtlekeeper = require('./connection');

const ROLE = process.env.ROLE || 'replica';

const randomId = () => crypto.randomBytes(8).toString('hex');
async function createConnection(config) {
  const turtleKeeper = new Turtlekeeper(config);
  const connection = await turtleKeeper.connect();
  return connection;
}

class Group {
  constructor() {
    this.queueChannels = {};
    this.connections = [];
    this.id = randomId();
  }

  async init() {
    // FIXME: shuld handle race condition and unhealthy replica
    this.ip = await getCurrentIp();
    if (ROLE === 'master') {
      await setMaster(this.ip);
      this.role = ROLE;
      const message = { method: 'join', ip: this.ip, role: this.role };
      await publishToChannel(message);
      return;
    }

    // check replica
    this.role = 'replica';
    await setPending(this.ip);
    const message = { method: 'join', ip: this.ip, role: this.role };
    await publishToChannel(message);
  }

  async createReplicaConnections() {
    if (this.role !== 'master') {
      return;
    }
    const replicasConfig = await getReplicasConfig();
    replicasConfig.forEach(async (replicaConfig) => {
      const connection = await createConnection(replicaConfig);
      this.connections.push(connection);
      this.setQueue(connection);
    });
  }

  async createReplicaConnection(ip) {
    if (this.role !== 'master') {
      return;
    }
    const replicaConfig = stringToHostAndPort(ip);
    const connection = await createConnection(replicaConfig);
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
const group = new Group();
module.exports = group;
