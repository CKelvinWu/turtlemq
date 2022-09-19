require('dotenv').config();
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const { redis } = require('./utils/redis');

const { PORT, API_VERSION } = process.env;
const indexRouter = require('./routes/index');
const queueRouter = require('./routes/queue');
const userRouter = require('./routes/user');

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    name: 'sid',
    saveUninitialized: false,
    resave: false,
    store: new RedisStore({ client: redis }),
  }),
);

app.use(express.json());
app.set('view engine', 'pug');
app.use('/public', express.static('./public'));

app.use('/', indexRouter);
app.use(`/api/${API_VERSION}/queue`, queueRouter);
app.use(`/api/${API_VERSION}/user`, userRouter);

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  if (err.status === 500) {
    console.log(err.message);
  }
  res.json({ success: false, message: err.message });
  next();
});

app.listen(PORT, () => {
  console.log(`server is listen on port ${PORT}....`);
});
