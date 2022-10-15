FROM node:16.17-alpine3.15

ENV NODE_ENV="production" \
  HOST="localhost" \
  PORT=5566 \
  DEFAULT_QUEUE_LENGTH=1000 \
  MASTER_KEY="turtlemq:master" \
  REPLICA_KEY="turtlemq:replicas" \
  PENDING_KEY="turtlemq:pending" \
  CHANNEL="turtlemq:channel" \
  QUEUE_LIST="queueList" \
  HISTORY_KEY="history:" \
  MIN_KEEPED_HISTROY_TIME=3600000 \
  HISTORY_INTERVAL=5000 \
  CLUSTER_MODE="off" \
  REDIS_PORT=6379 \  
  REDIS_HOST="localhost" \
  REDIS_USER="default" \
  REDIS_PASSWORD=""

WORKDIR /turtlemq

COPY . .

RUN npm install

EXPOSE ${PORT}

CMD [ "node", "server.js" ]
