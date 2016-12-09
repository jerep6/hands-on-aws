'use strict';

const deployUtils = require('./deploy.utils'),
  config = require('./common/config');

exports.deploy = function (cloudformationTemplatePath, VPCStackName) {
  const tpl = require(cloudformationTemplatePath);
  const files = {};

  function extractS3Information(moduleName, s3UploadInfo) {
    files[moduleName] = { bucket: s3UploadInfo.bucket, key: s3UploadInfo.key };
  }

  function getParameterForCloudformation () {
    return [
      { ParameterKey: 'LambdaS3Bucket', ParameterValue: files['lambda'].bucket, UsePreviousValue: false },
      { ParameterKey: 'LambdaS3Key', ParameterValue: files['lambda'].key, UsePreviousValue: false },
      { ParameterKey: 'GroupName', ParameterValue: config.groupName, UsePreviousValue: false }
    ];
  }


  // ########## UPLOAD ALL FILES ##########
  return deployUtils.uploadLambdaZip('', 'lambda')
    .then(s3info => extractS3Information('lambda', s3info))

    // ########## Create cloudformation stack ##########
    .then(() => deployUtils.sendCloudformation(tpl, `hands-on-lambda-${config.groupName}`, getParameterForCloudformation))
    .catch((err) => console.log('Error:', err.stack));

};


exports.deploy("./handson-lambda.template.json", "vpc-dev");