'use strict';
const winston = require('winston'),
  config = require('./config'),
  Logstash = require('winston-logstash').Logstash;

const logger = new winston.Logger({
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4
  },
  colors: {
    trace: 'gray'
  },
  transports: [],
  exitOnError: false
});

logger.add(winston.transports.Console, {
    handleExceptions: true,
    humanReadableUnhandledException: true,
    level: 'trace',
    timestamp: function () {
      return new Date().toISOString();
    },
    colorize: true
  }
);

if (config.logmatic.use) {
  console.log('Use logmatic logger', config.logmatic.name);
  logger.add(Logstash, {
      handleExceptions: true,
      max_connect_retries: -1,
      level: 'debug',
      port: config.logmatic.port,
      ssl_enable: true,
      node_name: config.logmatic.name,
      meta: {logmaticKey: config.logmatic.key},
      host: config.logmatic.host
    }, false
  );
}

module.exports = logger;
