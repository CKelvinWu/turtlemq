// FIXME: change to npm package
require('dotenv').config();
const Tmqp = require('tmqp-client');

const { TMQP_HOST, TMQP_PORT, CLUSTER_MODE } = process.env;

const tmqp = new Tmqp({ host: TMQP_HOST, port: TMQP_PORT, CLUSTER_MODE: CLUSTER_MODE === 'true' });

module.exports = { tmqp };
