const asyncHandler = require('express-async-handler');

const monitor = asyncHandler(async (req, res) => {
  res.render('monitor');
});
const login = asyncHandler(async (req, res) => {
  res.render('login');
});

module.exports = {
  monitor,
  login,
};
