require('dotenv').config();
const express = require('express');

const { PORT, API_VERSION } = process.env;
const indexRouter = require('./routes/index');
const queueRouter = require('./routes/queue');

const app = express();

app.use(express.json());
app.set('view engine', 'pug');
app.use('/public', express.static('./public'));

app.use('/', indexRouter);
app.use(`/api/${API_VERSION}/queue`, queueRouter);

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
