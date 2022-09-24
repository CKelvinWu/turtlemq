const asyncHandler = require('express-async-handler');
const User = require('../models/user');

const login = asyncHandler(async (req, res) => {
  const { user, password } = req.body;
  try {
    const isAuth = await User.login(user, password);
    if (!isAuth) {
      return res.status(403).json({ success: false, message: 'wrong email or password' });
    }
  } catch (error) {
    console.log(error);
    return res.status(403).json({ success: false, message: error.message });
  }

  req.session.user = user;
  req.session.isAuth = true;
  return res.status(200).json({ success: true });
});

const logout = asyncHandler(async (req, res) => {
  req.session.isAuth = false;
  res.redirect('/login');
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const message = await User.changePassword(currentPassword, newPassword);
  if (!message.success) {
    return res.status(403).json(message);
  }
  return res.status(200).json(message);
});

module.exports = {
  login,
  logout,
  changePassword,
};
