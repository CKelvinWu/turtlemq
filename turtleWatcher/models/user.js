require('dotenv').config();
const argon2 = require('argon2');
const { redis } = require('../utils/redis');

const { USER_KEY, DEFAULT_USER } = process.env;

(async () => {
  const isSettedUser = await redis.exists(USER_KEY);
  if (isSettedUser) {
    return;
  }
  const hash = await argon2.hash(DEFAULT_USER);
  await redis.hset(USER_KEY, DEFAULT_USER, hash);
})();

const login = async (user, password) => {
  const isUser = await redis.hget(USER_KEY, user);
  if (!isUser) {
    throw new Error('No such user!');
  }
  const hash = await redis.hget(USER_KEY, DEFAULT_USER);
  const isAuth = await argon2.verify(hash, password);
  if (isAuth) {
    return true;
  }
  throw new Error('Wrong password!');
};

const changePassword = async (currentPassword, newPassword) => {
  const hash = await redis.hget(USER_KEY, DEFAULT_USER);
  const isAuth = await argon2.verify(hash, currentPassword);
  if (!isAuth) {
    return { success: false, message: 'Wrong password!' };
  }
  const newHash = await argon2.hash(newPassword);
  await redis.hset(USER_KEY, DEFAULT_USER, newHash);
  return { success: true, message: 'Update password successifully!' };
};

module.exports = { login, changePassword };
