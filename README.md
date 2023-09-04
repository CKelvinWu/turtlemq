
![TurtleMQ](https://user-images.githubusercontent.com/57265307/195789115-d8d5f253-d5f5-461c-aa4a-43943cfbf896.png)

# TurtleMQ

A distributed message queue system with multiple services 
including message queue server, voting server, IP locator, 
monitor, and a client npm package
# Contents

- [Links](#Links)
- [Demo](#Demo)
- [Features](#Features)
- [Architecture](#Architecture)
- [Tech Stack](#Tech-Stack)
- [How to Start the TurtleMQ Service](#How-to-Start-the-TurtleMQ-Service)
- [FAQ](#FAQ)
- [Contact](#Contact)

# Links

[Turtle Watcher](http://turtlemq.com)

## Default Account
Username  | Password |
--------- | -------- |
turtle    | turtle |

# Demo

![produce_consume](https://user-images.githubusercontent.com/57265307/195866415-938187c1-3adf-4fb5-818d-6b25c18d9055.gif)

# Features
 
* Provides a distributed message queue system with heartbeat, health check, 
  replication, reconnection, and recovery mechanisms

* Implemented *Turtle Message Queue Protocol (TMQP)* based on TCP 
  for communication between services

* [*tmqp-client*](https://www.npmjs.com/package/tmqp-client) an open source npm package for 
  establishing connections to [TurtleMQ](https://github.com/CKelvinWu/turtlemq/) Server 

* [*Turtlekeeper*](https://github.com/CKelvinWu/turtlekeeper) a health checking server to 
  vote unhealthy server down with Redis in Lua script 

* [*Turtle Finder*](https://github.com/CKelvinWu/turtlekeeper/tree/main/turtleFinder) a HTTP server locating IP of *TurtleMQ* master 

* [*Turtle Watcher*](https://github.com/CKelvinWu/turtlemq/tree/main/turtleWatcher) a surveillance dashboard 
  for monitoring queue size, storage, and server status 

* Provides services with Docker images to increase 
  the flexibility in various environments and easy installation

* Been able to handle over 10000 TMQP requests in a second

* Stored queue messages with JavaScript array and manipulated 
  with two pointers for reducing O(n) time complexity to O(1) during message consumption

# Architecture

![Architecture](https://user-images.githubusercontent.com/57265307/195824205-2bc5bf52-423d-4e00-b2a4-523fa442f736.png)

## Services

TurtleMQ contains five services. Each of them performs their duties and communicates with 
Turtle Message Queue Protocol (TMQP).

### TurtleMQ
A message queue storage server. The messages will be stored in both master and replicas.

  * Master: 

    1. Handle incoming produce, consume, delete ... requests from clients.

    2. Forward requests to the replicas.

    3. Create connections and deliver queues and messages to newly joined replicas. 
    
  * Replica: 

    1. Handle incoming produce, consume, delete ... requests from master.

    2. Become a master if been selected as master. 

### Turtlekeeper

  A health-checking and role-setting server. Checking TurtleMQ servers' health by 
  sending heartbeats. Holding elections for unhealthy servers and remove

### Turtle Finder

  The TurtleMQ master server can be changed due to poor network or unexpected crushes.
  The Turtle Finder server helps to locate the current TurtleMQ master IP.

### Turtle Watcher

  A surveillance dashboard for monitoring queue size, storage, 
  and server status. 

### tmqp-client

  An open source npm package of a client to make connections to TurtleMQ server for Node.js.


# Tech Stack

**Client:** HTML, CSS, JavaScript, Pug, jQuery, tmqp-client

**Server:** Node.js (Express)

**Cache:** Redis (ElastiCache)



# How to Start the TurtleMQ Service

There are two modes to start a TurtleMQ service.

## normal mode

1. Start a TurtleMQ server

  ```shell
    docker run -dit -e REDIS_HOST=<redis-host> -e REDIS_PASSWORD=<redis-password> -p 5566:5566 kelvin5363/turtlemq
  ```
  
  Environment Variables  | Discription | Default |
  ----------- | -------- |---------------|
  NODE_ENV    | `development` for regular Redis connection, `production` for Redis TLS connection (Default)  | `production` |
  PORT        | TurtleMQ server port | 5566 |
  DEFAULT_QUEUE_LENGTH | Message queue default length | 1000 |
  MIN_KEEPED_HISTROY_TIME | How long you wanna keep queue history time (ms) | 3600000 |
  HISTORY_INTERVAL | History saved interval | 5000 |
  CLUSTER_MODE | Set `on` to enable cluster mode | off |
  REDIS_HOST| Redis host | localhost |
  REDIS_PORT| Redis port | 6379 |
  REDIS_USER| Redis user | default |
  REDIS_PASSWORD| Redis password | |


2. Start a Turtle Watcher

  ```shell
    docker run -dit -e TMQP_HOST=<host-ip> -e REDIS_HOST=<redis-host> -e REDIS_PASSWORD=<redis-password> -e SESSION_SECRET=<session-secret> -p 15566:15566 kelvin5363/turtlewatcher
  ```
  
  Environment Variables  | Discription | Default |
  ----------- | -------- |---------------|
  NODE_ENV    | `development` for regular Redis connection, `production` for Redis TLS connection (Default)  | `production` |
  PORT        | Turtle Watcher server port | 15566 |
  SESSION_SECRET | For signing the session ID cookie | |
  CLUSTER_MODE | Set `on` to enable cluster mode | off |
  TMQP_HOST| In cluster mode please set to the Turtle Finder's host. In normal mode please set it to the TurtleMQ master server host. | localhost |
  TMQP_PORT| In cluster mode please set to the Turtle Finder's port. In normal mode please set it to the TurtleMQ master server port. | 5566 |
  REDIS_HOST| Redis host | localhost |
  REDIS_PORT| Redis port | 6379 |
  REDIS_USER| Redis user | default |
  REDIS_PASSWORD| Redis password | |

3. Install tmqp-client in your application

  ```shell
    npm i tmqp-client
  ```

See more for using [tmqp-client](https://www.npmjs.com/package/tmqp-client) to publish/consume messages to TurtleMQ server.

## cluster mode

1. Start Turtlekeeper

  ```shell
    docker run -dit -e REDIS_HOST=<redis-host> -e REDIS_PASSWORD=<redis-password> kelvin5363/turtlekeeper  
  ```

  Environment Variables  | Discription | Default |
  ----------- | -------- |---------------|
  NODE_ENV    | `development` for regular Redis connection, `production` for Redis TLS connection (Default)  | `production` |
  HOST        | Turtlekeeper host | localhost |
  PORT        | Turtlekeeper port | 25566 |
  REDIS_HOST  | Redis host | localhost |
  REDIS_PORT  | Redis port | 6379 |
  REDIS_USER  | Redis user | default |
  REDIS_PASSWORD| Redis password | |
  QUORUM      | The quorum is the number of Turtlekeeper that need to agree about the fact the master is not reachable | 2 |
  HEARTRATE   | The interval of the heartbeat signal for checking the TurtleMQ server's health  | 3 |
  UNHEALTHY_COUNT| The failure heartbeat times need to be reached to vote for an unhealthy TurtleMQ server | 3 |


2. Start a Turtle Finder

  ```shell
    docker run -dit -e REDIS_HOST=<redis-host> -e REDIS_PASSWORD=<redis-password> kelvin5363/turtlefinder 
  ```

  Environment Variables  | Discription | Default |
  ----------- | -------- |---------------|
  NODE_ENV    | `development` for regular Redis connection, `production` for Redis TLS connection (Default)  | `production` |
  PORT        | Turtle Finder port | 25566 |
  REDIS_HOST| Redis host | localhost |
  REDIS_PORT| Redis port | 6379 |
  REDIS_USER| Redis user | default |
  REDIS_PASSWORD| Redis password | |

3. Start a server

  ```shell
    docker run -dit -e PORT=<port> -e CLUSTER_MODE=on -e REDIS_HOST=<redis-host> -e REDIS_PASSWORD=<redis-password> -p <port>:<port>kelvin5363/turtlemq
  ```

  Environment Variables  | Discription | Default |
  ----------- | -------- |---------------|
  NODE_ENV    | `development` for regular Redis connection, `production` for Redis TLS connection (Default)  | `production` |
  PORT        | TurtleMQ server port | 5566 |
  DEFAULT_QUEUE_LENGTH | Message queue default length | 1000 |
  MIN_KEEPED_HISTROY_TIME | How long you wanna keep queue history time (ms) | 3600000 |
  HISTORY_INTERVAL | History saved interval | 5000 |
  CLUSTER_MODE | Set `on` to enable cluster mode | off |
  REDIS_HOST| Redis host | localhost |
  REDIS_PORT| Redis port | 6379 |
  REDIS_USER| Redis user | default |
  REDIS_PASSWORD| Redis password | |

4. Start a Turtle Watcher

  ```shell
    docker run -dit --name turtlewatcher -e CLUSTER_MODE=on -e TMQP_HOST=<turtle-finder-host> -e TMQP_PORT=<turtle-finder-port> -e REDIS_HOST=<redis-host> -e REDIS_PASSWORD=<redis-password> -e SESSION_SECRET=<session-secret> -p 15566:15566 kelvin5363/turtlewatcher
  ```

  Environment Variables  | Discription | Default |
  ----------- | -------- |---------------|
  NODE_ENV    | `development` for regular Redis connection, `production` for Redis TLS connection (Default)  | `production` |
  PORT        | Turtle Watcher server port | 15566 |
  SESSION_SECRET | For signing the session ID cookie | |
  CLUSTER_MODE | Set `on` to enable cluster mode | off |
  TMQP_HOST| In cluster mode please set to the Turtle Finder's host. In normal mode please set to the TurtleMQ master server host. | localhost |
  TMQP_PORT| In cluster mode please set to the Turtle Finder's port. In normal mode please set to the TurtleMQ master server port. | 5566 |
  REDIS_PORT| Redis port | 6379 |
  REDIS_HOST| Redis host | localhost |
  REDIS_USER| Redis user | default |
  REDIS_PASSWORD| Redis password | |

5. Install tmqp-client in your application

  ```shell
    npm i tmqp-client
  ```

See more for using [tmqp-client](https://www.npmjs.com/package/tmqp-client) to publish/consume messages to TurtleMQ server.

# FAQ

### Q1. Why Use Message Queue

* Better Performance
* Increased Reliability
* Granular Scalability
* Simplified Decoupling
* Break Up Apps
* Migrate to Microservices
* Shift to Serverless

# Contact

Thank you for using tmqp-client :-)

Email: c.kelvin.wu@gmail.com

Linkedin: https://www.linkedin.com/in/chung-kai-wu/
