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


  // Récupération des variables d'environnement (file SQS et host ES) [Hint : process.env]
  const outputSQS = '';

  // Instantiation des SDK AWS avec les configuration
  // SQS : http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html
  // S3 : http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
  const s3 = new AWS.S3({apiVersion: '2006-03-01'});
  const sqs = new AWS.SQS({apiVersion: '2012-11-05'});


  // 1 Lecture S3
  // 2 Validation des POIS lu
  // 3 Envoi dans SQS
  const p = Promise.resolve(); // [Hint : use promise to chain functions]


  // Logue la fin de l'exécution et signale la terminaison au contexte
  return lambdaEnd(p, event, context, timer, logMetadata);




  // ########## Function definition into ##########
  /**
   * TODO
   *  Lire le fichier dans le bucket S3 de votre groupe.
   *  Convertir le résultat en JSON car S3 renvoi un Buffer
   *  Logger la lecture OK avec le temps d'exécution de la fonction + size fichier
   *  Logger la lecture KO avec le temps d'exécution de la fonction + erreur
   *
   *  Documentation de l'API : http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
   */

  /**
   *  Hints :
   *  - Conversion JSON : JSON.parse(result.Body.toString());
   *  - Taille en byte : result.ContentLength
   *
   */
  function readS3File (bucket, key) {
    // Timer pour logguer le temps d'exécution de la fonction
    const timerFct = new StopWatch();


    return s3.getObject().promise()
      .then(result => {

      })
      .catch(err => {

        throw err;
      });
  }

  /**
   * TODO
   *  Vérifier que l'attribut datasheet.address.countryCode soit égal à "FRA" (FRANCE)
   *  Vérifier que l'attribut datasheet.hotel_stars soit compris entre 0 et 5
   *  Vérifier que l'attribut datasheet.pricemin_gm21 soit strictement positif
   *
   *  Ne retourner que les POI français et logger ceux qui ne passe pas la contrainte. (uuid et valeur country)
   *  Logger le nombre de POI passant le validateur et le temps d'exécution
   */

  /**
   *  Hints :
   *  - _.filter pour filter le tableau
   *  - _.get pour lire sans se soucier des valeurs nulles
   *
   * LOGS à placer :
   * - logger.warn(`Country is not valid`, _.assign({ids: _.get(elt, 'uuid'), validationerror: {parameter: "countryCode", value: _.get(elt, 'datasheet.address.countryCode')}}, logMetadata));
   * - logger.warn(`Stars are not valid`, _.assign({ids: _.get(elt, 'uuid'), validationerror: {parameter: "hotel_stars", value: _.get(elt, 'datasheet.hotel_stars')}}, logMetadata));
   * - logger.warn(`Price is not valid`, _.assign({ids: _.get(elt, 'uuid'), validationerror: {parameter: "pricemin_gm21", value: _.get(elt, 'datasheet.pricemin_gm21')}}, logMetadata));
   */
  function validate(arrayOfLine) {
    const validPoi = [];

    return validPoi;
  }


  /**
   * TODO
   *  Pour chaque élement du tableau envoi un message dans SQS
   *  Logguer l'envoi OK (queue, ids: 1 seul identifiant puisque envoi unitaire, count: 1 puisque unitaire)
   *  Logguer l'envoi KO (queue, error)
   *  Logger le temps d'exécution pour envoyer tous les messages
   *
   *  http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html
   */

  /**
   *  Hints :
   *  - _.map pour convertir le tableau de POI en tableau de promesses
   *  - function sendMessage pour envoyer dans SQS
   *  - Promise.all pour attentre la finition de toutes les promesses
   *
   * LOGS à placer :
   *  - logger.debug('Send to SQS OK', _.assign({queue: outputSQS, count: 1, ids: message.uuid}, logMetadata));
   *  - logger.error('Send to SQS KO', _.assign({queue: outputSQS, size: params.MessageBody.length, error: _.get(err, 'stack', err)}, logMetadata));
   *  - logger.debug(`Send all messages into SQS OK`, _.assign({count: result.length, etape: "send-SQS", durationFct: timerFct.elapseTime()}, logMetadata));
   */
  function sendToSQS (arrayOfMessageToSend) {

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