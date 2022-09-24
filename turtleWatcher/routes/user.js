const express = require('express');

const router = express.Router();
const {
  login, logout, changePassword,
} = require('../controllers/user');
const { auth } = require('../utils/auth');

router.post('/login', login);

router.get('/logout', logout);

router.put('/password', changePassword);

module.exports = router;
