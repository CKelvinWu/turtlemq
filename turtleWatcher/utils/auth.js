const auth = async (req, res, next) => {
  if (!req.session?.isAuth) {
    return res.status(401).json({ success: false, message: 'unauthorized' });
  }
  return next();
};

const authPage = async (req, res, next) => {
  if (!req.session?.isAuth) {
    return res.redirect('/login');
  }
  return next();
};

module.exports = { authPage, auth };
