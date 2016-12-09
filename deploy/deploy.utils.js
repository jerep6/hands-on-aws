'use strict';

const awsUtils = require('./common/aws.utils'),
  AWS = awsUtils.configureSDK(require('aws-sdk')),
  cloudformation = new (require('./cloudformation.utils'))(),
  logger = require('./common/logger.utils'),
  zipUtils = require('./zip.utils'),
  fs = require('fs'),
  path = require('path'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  glob = require("glob"),
  mime = require('mime-types'),
  config = require('./common/config');

const BUCKET = config.deploy.bucket;
const ROOT_PATH = path.resolve(__dirname, '..');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

function moduleDirectory(partner, type, moduleName) {
  return path.resolve(ROOT_PATH, partner, moduleName);
};

function moduleVersion(partner, type, moduleName) {
  return require(path.resolve(moduleDirectory(partner, type, moduleName),  "package.json")).version;
};

function zipPath (partner, moduleName, version) {
  return path.join(ROOT_PATH, 'dist', `${partner}-${moduleName}-${version}.zip`);
};

function s3Path (type, zipPath) {
  return `package/${type}/${path.basename(zipPath)}`;
};


function zipModuleFiles (partner, type, moduleName) {
  // Get version in package.json
  const versionToDeploy = moduleVersion(partner, type, moduleName);
  // Compute zip path on hard drive
  const zipDestination = zipPath(partner, moduleName, versionToDeploy);

  const fileToZip = glob.sync(moduleDirectory(partner, type, moduleName) + '/*');
  return zipUtils.zip(zipDestination, fileToZip)
    .then(() => zipDestination);
};

function getCloudformationTemplate(partner, moduleName) {
  return path.resolve(ROOT_PATH, partner, `${partner}-${lambda}.template.json`);
}

function createOrUpdateStack (tpl, stackName, parametersCloudformation) {
  return cloudformation.isStackExist(stackName)
    .then((exist) => {
      let promise;
      if(!exist) {
        promise = cloudformation.createStack({
          StackName: stackName,
          Capabilities: ['CAPABILITY_IAM'],
          Parameters: parametersCloudformation,
          OnFailure: 'ROLLBACK',
          Tags: [],
          TemplateBody: JSON.stringify(tpl),
          TimeoutInMinutes: 30
        });
      }
      else {
        promise = cloudformation.updateStack({
          StackName: stackName,
          Capabilities: ['CAPABILITY_IAM'],
          Parameters: parametersCloudformation,
          TemplateBody: JSON.stringify(tpl)
        }, true);
      }
      return promise.then((stack) => {
        return { create: !exist, update: exist, stackId: stack.StackId}
      });
    });
};

function waitStackComplete (createOrUpdateData) {
  if(createOrUpdateData.create) {
    return cloudformation.waitStackCreation(createOrUpdateData.stackId);
  } else {
    return cloudformation.waitStackUpdate(createOrUpdateData.stackId);
  }
};

exports.uploadZipFile = function(partner, type, zipPath) {
  const S3path = s3Path(type, zipPath);
  return uploadFile(BUCKET, zipPath, S3path)
    .then(() => {
      return {
        bucket: BUCKET,
        key: S3path
      };
    });
};


exports.uploadLambdaZip = function (partner, lambdaName) {
  const moduleType = 'lambda';
  return zipModuleFiles(partner, moduleType, lambdaName) // Zip lambda files
    .then((zipPath) => exports.uploadZipFile(partner, moduleType, zipPath)); // Upload lambda ZIP
};

exports.sendCloudformation = function (tpl, stackName, paramaterFunction) {
  return Promise.resolve()
    .then(paramaterFunction)
    .then((params) => createOrUpdateStack(tpl, stackName, params))
    .then(waitStackComplete);
};


function uploadFile (bucket, filePath, forcedName) {
  return new Promise((resolve, reject) => {
    // If file doesn't exist
    if (!fs.lstatSync(filePath).isFile()) {
      reject(new Error('File ' + filePath + ' doesn\'t exist'));
      return;
    }

    // Extract file name
    var name = forcedName || path.basename(filePath);
    var fileContent = fs.readFileSync(filePath);

    var params = {
      Bucket: bucket,
      Key: name,
      ACL: 'authenticated-read',
      Body: fileContent,
      ContentType: mime.lookup(filePath)
    };

    logger.debug('Upload ' + filePath + '(' + name + ') to ' + params.Bucket);
    s3.putObject(params).promise()
      .then(() => {
        logger.info(name + ' is uploaded');
        resolve();
      }).catch(reject);
  });
};