require('dotenv').config();
const net = require('net');
const queueRoutes = require('./queue');
const group = require('./group');
const { redis } = require('./redis');
const { ip, getReqHeader } = require('./util');

const { PORT, CHANNEL } = process.env;

// const group = new Group();
(async () => {
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
    socket.on('readable', () => {
      const reqHeader = getReqHeader(socket);

      if (!reqHeader) return;

      const body = JSON.parse(reqHeader);
      const request = {
        body,
        socket,
        send(data) {
          console.log(`\n${new Date().toISOString()} - Response: ${JSON.stringify(data)}`);
          const message = `${JSON.stringify(data)}\r\n\r\n`;
          socket.write(message);
        },
        end() {
          socket.end();
        },
      };

      // Send the request to the handler
      requestHandler(request);
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
  console.log(`\n${new Date().toISOString()} - Request: ${JSON.stringify(req.body)}`);
  const method = req.body.method.toLowerCase();

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
