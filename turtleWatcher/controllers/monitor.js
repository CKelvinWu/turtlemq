const asyncHandler = require('express-async-handler');

const monitor = asyncHandler(async (req, res) => {
  res.render('monitor');
});

module.exports = {
  monitor,
};
