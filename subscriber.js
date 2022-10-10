const { redis } = require('./cache/cache');
const channel = require('./channel');
const { deleteQueues } = require('./util');

const { CHANNEL, QUEUE_LIST } = process.env;

const subscriber = redis.duplicate();
subscriber.subscribe(CHANNEL, () => {
  console.log(`subscribe channel: ${CHANNEL}`);
});

subscriber.on('message', async (ch, message) => {
  // FIXME: catch parse error
  const data = JSON.parse(message);
  const { method } = data;
  if (method === 'setMaster') {
    if (channel.ip === data.ip) {
      channel.role = 'master';
      console.log('\n====================\nI am the new master\n====================\n');
      // create connection to all replicas
      await channel.createReplicaConnections();

      const queueList = await redis.hkeys(QUEUE_LIST);
      const keys = Object.keys(channel.queueChannels);
      const removeKeys = queueList.filter((queue) => !keys.includes(queue));
      for (const key of removeKeys) {
        deleteQueues(key);
      }
    }
  } else if (method === 'join') {
    console.log(`channel.role:${channel.role},  data.role:${data.role}`);
    if (channel.role === 'master' && data.role !== 'master') {
      // Create a connection to new replica
      await channel.createReplicaConnection(data.ip);
    }
  }
});
