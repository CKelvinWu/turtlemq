require('dotenv').config();
const net = require('net');
const queueRoutes = require('./queue');
const group = require('./group');
const { redis } = require('./redis');
const { getCurrentIp, deleteQueues } = require('./util');

const { PORT, CHANNEL, QUEUE_LIST } = process.env;
let ip;

(async () => {
  ip = await getCurrentIp();
  await group.init();
  await group.createReplicaConnections();
})();

const subscriber = redis.duplicate();
subscriber.subscribe(CHANNEL, () => {
  console.log(`subscribe channel: ${CHANNEL}`);
});

subscriber.on('message', async (channel, message) => {
  const data = JSON.parse(message);
  const { method } = data;
  if (method === 'setMaster') {
    if (ip === data.ip) {
      group.role = 'master';
      console.log('\n====================\nI am the new master\n====================\n');
      // create connection to all replicas
      await group.createReplicaConnections();

      const queueList = await redis.hkeys(QUEUE_LIST);
      const keys = Object.keys(group.queueChannels);
      const removeKeys = queueList.filter((queue) => !keys.includes(queue));
      for (const key of removeKeys) {
        deleteQueues(key);
      }
    }
  } else if (method === 'join') {
    if (group.role === 'master' && data.role !== 'master') {
      // Create a connection to new replica
      await group.createReplicaConnection(data.ip);
    }
  }
});

function createTurtleMQServer(requestHandler) {
  const server = net.createServer((connection) => {
    connection.on('error', () => {
      console.log('client disconnect forcefully');
    });
    connection.on('end', () => {
      // console.log('client disconnect');
    });
  });

  function connectionHandler(socket) {
    let reqBuffer = Buffer.from('');
    socket.on('readable', () => {
      const buf = socket.read();
      reqBuffer = Buffer.concat([reqBuffer, buf]);

      while (true) {
        if (reqBuffer === null) break;
        // Indicating end of a request
        const marker = reqBuffer.indexOf('\r\n\r\n');
        // Find no seperator
        if (marker === -1) break;
        // Record the data after \r\n\r\n
        const reqHeader = reqBuffer.slice(0, marker).toString();
        // Keep hte extra readed data in the reqBuffer
        reqBuffer = reqBuffer.slice(marker + 4);

        const body = JSON.parse(reqHeader);
        const request = {
          body,
          socket,
          send(data) {
            // console.log(`\n${new Date().toISOString()} - Response: ${JSON.stringify(data)}`);
            const message = `${JSON.stringify(data)}\r\n\r\n`;
            socket.write(message);
          },
          end() {
            socket.end();
          },
        };

        // Send the request to the handler
        requestHandler(request);
      }
    });
    socket.on('error', () => {
      console.log('socket error ');
    });
    socket.write('{ "message": "connected" }\r\n\r\n');
  }

  server.on('connection', connectionHandler);
  return server;
}

const webServer = createTurtleMQServer(async (req) => {
  // console.log(`\n${new Date().toISOString()} - Request: ${JSON.stringify(req.body)}`);
  const { method } = req.body;
  req.role = group.role;
  // response self role only
  if (method === 'heartbeat') {
    return req.send({
      success: true,
      id: req.body.id,
      role: group.role,
      method,
      ip,
    });
  }
  if (group.role === 'master') {
    group.send(req.body);
  }
  return queueRoutes[method](req);
});

webServer.listen(PORT, () => {
  console.log(`server is listen on prot ${PORT}....`);
});
