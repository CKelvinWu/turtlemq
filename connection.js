const net = require('net');

class Turtlekeeper {
  constructor(config) {
    this.config = config;
    this.unhealthyCount = 0;
    this.socket = new net.Socket();
    this.socket.setKeepAlive(true, 5000);
  }

  async reconnect() {
    setTimeout(async () => {
      await this.connect(this.config);
      // reconnect timeout
    }, 3000);
  }

  send(messages) {
    this.client.write(`${JSON.stringify(messages)}\r\n\r\n`);
  }

  end() {
    this.client.end();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const client = this.socket.connect(this.config);
      let reqBuffer = Buffer.from('');
      client.on('readable', () => {
        const buf = client.read();
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

          const object = JSON.parse(reqHeader);
          if (object.message === 'connected') {
            resolve(this);
          }
          reject();
        }
      });

      client.on('error', (error) => {
        console.log(error);
      });
      client.on('end', () => {
        // console.log('disconnected from server');
      });
      this.client = client;
    });
  }

  disconnect() {
    this.connection.end();
  }
}

module.exports = Turtlekeeper;
