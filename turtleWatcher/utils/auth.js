const auth = async (req, res, next) => {
  if (!req.session?.isAuth) {
    return res.redirect('/login');
  }
  return next();
};

module.exports = { auth };
