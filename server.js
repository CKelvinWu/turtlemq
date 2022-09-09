require('dotenv').config();
const net = require('net');
const queueControllers = require('./controllers/queue');
const Group = require('./group');
const { getCurrentIp } = require('./util');

const group = new Group();
(async () => {
  await group.init();
})();

const { PORT } = process.env;

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
      let reqBuffer = Buffer.from('');
      let buf;
      let reqHeader;
      while (true) {
        buf = socket.read();
        if (buf === null) break;

        reqBuffer = Buffer.concat([reqBuffer, buf]);

        // Indicating end of a request
        const marker = reqBuffer.indexOf('\r\n\r\n');
        if (marker !== -1) {
          // Record the data after \r\n\r\n
          const remaining = reqBuffer.slice(marker + 4);
          reqHeader = reqBuffer.slice(0, marker).toString();
          // Push the extra readed data back to the socket's readable stream
          socket.unshift(remaining);
          break;
        }
      }

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
    const ip = await getCurrentIp();
    return req.send({
      success: true,
      id: req.body.id,
      role: group.role,
      method,
      ip,
    });
  }
  return queueControllers[method](req);
});

webServer.listen(PORT, () => {
  console.log(`server is listen on prot ${PORT}....`);
});
