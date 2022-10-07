const net = require('net');

class SocketConnection {
  constructor(config) {
    this.config = config;
    this.unhealthyCount = 0;
    this.socket = new net.Socket();
    this.socket.setKeepAlive(true, 5000);
    this.connect();
  }

  reconnect() {
    setTimeout(async () => {
      this.connect();
    }, 3000);
  }

  end() {
    this.client.end();
  }

  // FIXME: don't need promise, and call connect in constructor
  connect() {
    this.client = this.socket.connect(this.config);

    this.client.on('error', (error) => {
      console.log(error);
    });

    this.client.on('end', () => {
      // console.log('disconnected from server');
    });
  }

  send(messages) {
    this.client.write(`${JSON.stringify(messages)}\r\n\r\n`);
  }

  disconnect() {
    this.connection.end();
  }
}

module.exports = SocketConnection;
