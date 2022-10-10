const express = require('express');

const router = express.Router();
const { login, monitor } = require('../controllers/monitor');
const { authPage } = require('../utils/auth');

router.get('/', authPage, monitor);

router.get('/login', login);

module.exports = router;
