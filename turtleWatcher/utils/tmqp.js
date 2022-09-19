// FIXME: change to npm package
require('dotenv').config();
const Tmqp = require('../../../tmqp/tmqp');

const { TMQP_HOST, TMQP_PORT } = process.env;

const tmqp = new Tmqp({ host: TMQP_HOST, port: TMQP_PORT, cluster: true });

module.exports = { tmqp };
