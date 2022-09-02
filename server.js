require('dotenv').config();
const net = require('net');
const queueControllers = require('./controllers/queue');

const { PORT } = process.env;

function createWebServer(requestHandler) {
  const server = net.createServer((connection) => {
    connection.on('error', () => {
      console.log('client disconnect forcefully');
    });
    connection.on('end', () => {
      console.log('client disconnect');
    });
  });

  function handleConnection(socket) {
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

      /* Request-related business */
      const body = JSON.parse(reqHeader);
      const request = {
        body,
        socket,
      };

      /* Response-related business */
      const response = {
        send(data) {
          const message = `${JSON.stringify(data)}\r\n\r\n`;
          socket.write(message);
        },
      };

      // Send the request to the handler!
      requestHandler(request, response);
    });
    socket.on('end', () => {
      console.log('socket end ');
    });

    socket.write('connected');
  }

  server.on('connection', handleConnection);
  return server;
}

const webServer = createWebServer((req, res) => {
  console.log(`\n${new Date().toISOString()} - ${req.body.method} ${JSON.stringify(req.body)}`);
  const method = req.body.method.toLowerCase();
  queueControllers[method](req, res);
});

webServer.listen(PORT, () => {
  console.log(`server is listen on prot ${PORT}....`);
});
