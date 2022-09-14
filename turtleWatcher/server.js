require('dotenv').config();
const express = require('express');

const { PORT } = process.env;

const app = express();

app.use(express.json());

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
