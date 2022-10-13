require('dotenv').config();
require('./subscriber');
const net = require('net');
const queueRoutes = require('./queue');
const channel = require('./channel');

const { PORT } = process.env;

function getConnectionHandler(requestHandler) {
  return (socket) => {
    let reqBuffer = Buffer.from('');
    socket.on('data', (buf) => {
    // const buf = socket.read();
      if (!buf) return;
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

        try {
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
        } catch (error) {
          console.log(error);
        }
      }
    });
    socket.on('error', () => {
      console.log('socket error ');
    });
    socket.write('{ "message": "connected" }\r\n\r\n');
  };
}

function createTurtleMQServer(requestHandler) {
  const server = net.createServer((connection) => {
    connection.on('error', () => {
      console.log('client disconnect forcefully');
    });
    connection.on('end', () => {
      // console.log('client disconnect');
    });
  });

  const connectionHandler = getConnectionHandler(requestHandler);
  server.on('connection', connectionHandler);
  return server;
}

const webServer = createTurtleMQServer(async (req) => {
  // console.log(`\n${new Date().toISOString()} - Request: ${JSON.stringify(req.body)}`);
  const { method } = req.body;

  // response self role only
  if (method === 'heartbeat') {
    const { setRole } = req.body;
    channel.role = setRole;
    return req.send({
      success: true,
      id: req.body.id,
      role: channel.role,
      method,
      ip: channel.ip,
    });
  }
  req.role = channel.role;
  if (channel.role === 'master') {
    channel.send(req.body);
  }
  return queueRoutes[method](req);
});

webServer.listen(PORT, async () => {
  console.log(`server is listen on prot ${PORT}....`);
});
