// const http = require('http');
require('dotenv').config();

const { HOST, PORT } = process.env;

function getCurrentIp() {
  return new Promise((resolve) => {
    resolve(`${HOST}:${PORT}`);
    // http.get({ host: 'api.ipify.org', port: 80, path: '/' }, (resp) => {
    //   resp.on('data', (ip) => {
    //     console.log(`My public IP address is: ${ip}`);
    //     resolve(`${ip}:${PORT}`);
    //   });
    // }).end();
  });
}

module.exports = { getCurrentIp };
