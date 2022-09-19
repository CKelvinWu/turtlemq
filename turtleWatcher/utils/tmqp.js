// FIXME: change to npm package
const Tmqp = require('../../../tmqp/tmqp');

const tmqp = new Tmqp({ host: 'localhost', port: 3001 });

module.exports = { tmqp };
