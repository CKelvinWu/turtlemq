const express = require('express');

const router = express.Router();
const { login, monitor } = require('../controllers/monitor');
const { auth } = require('../utils/auth');

router.get('/', auth, monitor);

router.get('/login', login);

module.exports = router;
