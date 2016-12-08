const lambda = require('./tp-lambda'),
  StopWatch = require('./common/stopwatch.utils'),
  config = require('./common/config'),
  logger = require('./common/logger.utils');


process.env.outputSQS = `https://sqs.eu-central-1.amazonaws.com/596942977384/hands-on-${config.groupName}`;
lambda.handler({
  "Bucket": "michelin-hands-on",
  "Key": `${config.groupName}/poi.json`
  }, new FakeContext('function-test'));








function FakeContext (functionName) {
  const timer = new StopWatch();
  const maxExecutionTime = 300000;

  this.succeed = function(param) { logger.info('--> FAKE contexte succeed : ', JSON.stringify(param));};
  this.fail = function(param) { logger.info('--> FAKE contexte fail : ', param);};
  this.getRemainingTimeInMillis = function() {
    return Math.max(maxExecutionTime - timer.elapseTime(), 0);
  }
  this.functionName = functionName;
  this.invokeid = "localinvokeid";
};