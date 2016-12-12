'use strict';

const awsUtils = require('./common/aws.utils'),
  AWS = awsUtils.configureSDK(require('aws-sdk')),
  Promise = require('bluebird'),
  _ = require('lodash'),
  StopWatch = require('./common/stopwatch.utils'),
  logger = require('./common/logger.utils'),
  config = require('./common/config');



exports.handler = function(event, context) {
  const timer = new StopWatch();
  const logMetadata = Object.freeze({key: config.groupName, invokeid: context.invokeid || 'defaultid'});

  logger.debug('Event', _.assign({data: event}, logMetadata));
  logger.debug('Context', _.assign({data: _.omit(context, ["succeed", "fail"])}, logMetadata));
  logger.debug('Env', _.assign({data: process.env}, logMetadata));


  // Récupération des variables d'environnement (file SQS et host ES)
  const outputSQS = process.env.OutputSQS;

  // Instantiation des SDK AWS avec les configuration
  // SQS : http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html
  // S3 : http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
  const s3 = new AWS.S3({apiVersion: '2006-03-01'});
  const sqs = new AWS.SQS({apiVersion: '2012-11-05'});


  const p = readS3File(event.Bucket, event.Key)
    .then(validate)
    .then(sendToSQS);


  return lambdaEnd(p, event, context, timer, logMetadata);




  // ########## Function definition into ##########
  function readS3File (bucket, key) {
    return Promise.resolve();
  }

  function validate(arrayOfLine) {
    const validPoi = [];
    return validPoi;
  }


  function sendToSQS (arrayOfMessageToSend) {
    const timerFct = new StopWatch();
    const promises = _.map(arrayOfMessageToSend, message => {

      const params = {
        MessageBody: JSON.stringify(message),
        QueueUrl: outputSQS
      };
      return sqs.sendMessage(params).promise()
        .then(data => {
          logger.debug('Send to SQS OK', _.assign({queue: outputSQS, count: 1, ids: message.uuid}, logMetadata));
          return data;
        })
        .catch(err => {
          logger.error('Send to SQS KO', _.assign({queue: outputSQS, count:1, ids: message.uuid, size: params.MessageBody.length, error: _.get(err, 'stack', err)}, logMetadata));
          throw err;
        });
    });

    return Promise.all(promises).then(result => {
      logger.debug(`Send all messages into SQS OK`, _.assign({count: result.length, etape: "send-SQS", durationFct: timerFct.elapseTime()}, logMetadata));
      return result;
    });
  }
};


function lambdaEnd(promise, event, context, timer, logMetadata) {
  return promise
    .finally(() => {
      const memoryUsed = Math.round(process.memoryUsage().rss);
      logger.info("Lambda execution time", _.assign({}, logMetadata, {memory:memoryUsed, duration: timer.elapseTime(), durationFct: timer.elapseTime(), etape: "lambda-end"}));
    })
    .then((data) => {
      logger.info("End lambda OK", _.assign({}, logMetadata, {status: "ok"}));
      return data;
    })
    .catch(err => {
      logger.error("End lambda KO", _.assign({}, logMetadata, {status: "ko", error: _.get(err, 'stack', _.get(err, 'message', err))}));
      throw err;
    })
    // Wait for sending all logs
    .finally(() => new Promise((resolve, reject) => { setTimeout(resolve, 400)}))
    .then(context.succeed)
    .catch(context.fail);
};