const {
  stringToHostAndPort, getCurrentIp, getState, getMaster, setMaster,
  setReplica, setState, publishToChannel, getReplicasConfig,
} = require('./util');
const Turtlekeeper = require('./connection');

async function createConnection(config) {
  const turtleKeeper = new Turtlekeeper(config);
  const connection = await turtleKeeper.connect();
  return connection;
}

class Group {
  constructor() {
    this.queueChannels = {};
    this.connections = [];
  }

  async init() {
    // FIXME: shuld handle race condition and unhealthy replica
    this.ip = await getCurrentIp();
    const state = await getState();
    if (state && state !== 'active') return;

    const master = await getMaster();
    if (!state || master === this.ip) {
      await setMaster(this.ip);
      await setState('active');
      this.role = 'master';
      const message = { method: 'join', ip: this.ip, role: this.role };
      await publishToChannel(message);
      return;
    }
    // check replica
    this.role = 'replica';
    // await redis.set(`turtlemq:replica:${this.ip}`, this.ip);
    await setReplica(this.ip);
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
    const message = { method: 'setqueue', queueChannels: this.queueChannels };
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
