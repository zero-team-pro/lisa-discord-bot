import 'module-alias/register';
import * as dotenv from 'dotenv';
dotenv.config();

import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';

import { admin, auth, channel, mastercard, metrics, module, outline, server, telegram } from './api';
import { Bridge } from './controllers/bridge';
import { Prometheus, PrometheusService } from './controllers/prometheus';
import authMiddleware from './middlewares/auth';
import { sequelize } from './models';
import { initRedisSync } from './utils';

const { DB_FORCE, RABBITMQ_URI, SHARD_COUNT } = process.env;

Prometheus.setService(PrometheusService.Gateway);

const redis = initRedisSync();

const bridge = new Bridge('gateway', {
  url: RABBITMQ_URI,
  shardCount: Number.parseInt(SHARD_COUNT),
});

const databasesInit = async () => {
  let isDatabaseOk = true;
  // TODO: Make it scalable, allow some amount of errors per time
  let redisErrorCount = 0;
  const MAX_REDIS_ERROR_COUNT = 100;

  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection has been established successfully.');
    !!DB_FORCE && console.log('FORCE recreating database');
    await sequelize.sync({ alter: false, force: !!DB_FORCE });
    console.log('PostgreSQL has been updated to current models successfully.');
  } catch (error) {
    isDatabaseOk = false;
    console.error('PostgreSQL init error:', error);
  }
  try {
    redis.on('error', (err) => {
      console.log('Redis Client Error:', err);
      redisErrorCount++;
      if (redisErrorCount > MAX_REDIS_ERROR_COUNT) {
        console.log('[Redis] Disconnecting. Error count exceeded max');
        redis.disconnect();
      }
    });
    console.log('Redis connecting...');
    await redis.connect();
    console.log('Redis connection has been established successfully.');
  } catch (error) {
    isDatabaseOk = false;
    console.error('Redis init error:', error);
  }
};

const initList = [bridge.init(), databasesInit()];

/* API Express */

console.log('API initialisation...');

const app = express();

// TODO: Refactor
app.use((req, res, next) => {
  Prometheus.requestsInc();
  let isProceeded = false;
  const stopRequestDurationTimer = Prometheus.startHttpRequestDurationTimer();

  res.on('finish', () => {
    console.log('Express event: finish');
    if (!isProceeded) {
      isProceeded = true;
      stopRequestDurationTimer({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
    }
  });

  res.on('close', () => {
    console.log('Express event: close');
    if (!isProceeded) {
      isProceeded = true;
      stopRequestDurationTimer({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
    }
  });

  res.on('error', () => {
    console.error('Express event: error');
    if (!isProceeded) {
      isProceeded = true;
      stopRequestDurationTimer({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
    }
  });

  next();
});

app.set('bridge', bridge);
app.set('redis', redis);

app.use(cors());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static
app.use('/static', express.static('public'));
app.use('/metrics', metrics);

// Public Routes
app.use('/auth', auth);

// Auth check
app.use(authMiddleware);

// Private Routes
app.use('/server', server);
app.use('/channel', channel);
app.use('/module', module);
app.use('/admin', admin);
app.use('/telegram', telegram);
app.use('/vpn/outline', outline);
app.use('/mastercard', mastercard);

app.use((err, _req, res, _next) => {
  // TODO: Logger
  console.log(err);

  if (typeof err?.code === 'number' && err?.code >= 100 && err?.code < 600) {
    res.status(err.code).send({
      status: 'ERROR',
      code: err.code,
      message: err.message,
    });
  } else {
    res.status(500).send({
      status: 'ERROR',
      code: 500,
      message: err.message,
    });
  }
});

Promise.all(initList).then(() => {
  bridge.receiveMessages();
  app.listen(80, () => {
    console.info('Running API on port 80');
  });
});
