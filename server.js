require('dotenv').config();
const express = require('express');

const app = express();
const { API_VERSION } = process.env;
const PORT = process.env.PORT || 3000;
const queueRoute = require('./routes/queue');

app.use(express.json());

app.use(`/api/${API_VERSION}/queue`, queueRoute);

app.listen(PORT, () => {
  console.log(`server is listen on prot ${PORT}....`);
});
