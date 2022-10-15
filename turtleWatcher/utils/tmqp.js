require('dotenv').config();
const Tmqp = require('tmqp-client');

const { TMQP_HOST, TMQP_PORT, CLUSTER_MODE } = process.env;

const tmqp = new Tmqp({ host: TMQP_HOST, port: TMQP_PORT, cluster: CLUSTER_MODE === 'on' });

module.exports = { tmqp };
