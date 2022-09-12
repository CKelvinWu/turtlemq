const net = require('net');
const { getReqHeader } = require('./util');

class Turtlekeeper {
  constructor(config) {
    this.config = config;
    this.unhealthyCount = 0;
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
      const client = net.connect(this.config);

      client.once('readable', () => {
        const reqHeader = getReqHeader(client);
        if (!reqHeader) return;
        const object = JSON.parse(reqHeader);

        if (object.message === 'connected') {
          resolve(this);
        }
        reject();
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
