require('dotenv').config();
const { redis } = require('./redis');
const { getCurrentIp } = require('./util');

const {
  MASTER_KEY, STATE_KEY, REPLICA_KEY, CHANNEL,
} = process.env;

module.exports = class Group {
  constructor(master, replicas, turtlekeepers) {
    // this.role = '';
    this.master = master;
    this.replicas = new Set(replicas);
    this.turtlekeepers = new Set(turtlekeepers);
  }

  async init() {
    // FIXME: shuld handle race condition

    this.ip = await getCurrentIp();
    const master = await redis.get(MASTER_KEY);
    if (master) {
      // check replica
      this.role = 'replica';
      await redis.set(`turtlemq:replica:${this.ip}`, this.ip);
      await redis.hset(REPLICA_KEY, this.ip, 1);
      const message = { method: 'join', ip: this.ip };
      await redis.publish(CHANNEL, JSON.stringify(message));
      return;
    }
    await redis.set(MASTER_KEY, this.ip);
    await redis.set(STATE_KEY, 'active');

    this.role = 'master';
  }

  replicasLength() {
    return Array.from(this.replicas).length;
  }

  turtlekeepersLength() {
    return Array.from(this.turtlekeepers).length;
  }

  getReplicas() {
    return Array.from(this.replicas);
  }

  getTurtlekeepers() {
    return Array.from(this.turtlekeepers);
  }

  addReplicas(replica) {
    this.replicas.add(replica);
  }

  addTurtlekeepers(turtlekeeper) {
    this.turtlekeepers.add(turtlekeeper);
  }

  removeReplicas(replica) {
    this.replicas.delete(replica);
  }

  removeTurtlekeepers(Turtlekeeper) {
    this.Turtlekeepers.delete(Turtlekeeper);
  }
};
