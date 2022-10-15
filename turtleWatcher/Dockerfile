FROM node:16.17-alpine3.15

ENV NODE_ENV="production" \
  PORT=15566 \
  API_VERSION="1.0" \
  MASTER_KEY="turtlemq:master" \
  REPLICA_KEY="turtlemq:replicas" \
  CHANNEL="turtlemq:channel" \
  QUEUE_LIST="queueList" \
  HISTORY_KEY="history:" \
  USER_KEY="turtlemq:user" \
  DEFAULT_USER="turtle" \
  SESSION_SECRET="" \
  TMQP_HOST=localhost \
  TMQP_PORT=5566 \
  CLUSTER_MODE="off" \
  REDIS_PORT=6379 \  
  REDIS_HOST="localhost" \
  REDIS_USER="default" \
  REDIS_PASSWORD=""

WORKDIR /turtleWatcher

COPY . .

RUN npm install

EXPOSE ${PORT}

CMD [ "node", "server.js" ]
