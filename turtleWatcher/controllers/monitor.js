const asyncHandler = require('express-async-handler');

const monitor = asyncHandler(async (req, res) => {
  res.render('monitor');
});
const login = asyncHandler(async (req, res) => {
  if (req.session.isAuth) {
    return res.redirect('/');
  }
  return res.render('login', { isLogout: true });
});

module.exports = {
  monitor,
  login,
};
