'use strict';

const Promise = require('bluebird'),
  proxy = require('proxy-agent'),
  https = require('https');

exports.configureSDK = function(sdk) {

  // Configure proxy
  if(process.env.http_proxy) {
    sdk.config.update({ httpOptions: { agent: proxy(process.env.http_proxy) } });
  } else {
    sdk.config.update({ httpOptions: { agent: new https.Agent({maxSockets: 500}) } });
  }
  // Use bluebird as Promise
  sdk.config.setPromisesDependency(Promise);

  sdk.config.update({region: 'eu-central-1'});

  return sdk;
};


exports.getVPCInformation = function (AWS, VPCStackName) {
  return new Promise((resolve, reject) => {
    this.cloudformation.describeStacksByName(VPCStackName)
      .then(function (stack) { // Extract groups managed by stack

        var vpcId =  extractOutput(stack, 'vpcId');

        var publicSubnetsIds = [
          extractOutput(stack, 'publicSubnet0Id'),
          extractOutput(stack, 'publicSubnet1Id'),
          extractOutput(stack, 'publicSubnet2Id')
        ];

        var privateSubnetsIds = [
          extractOutput(stack, 'privateSubnet0Id'),
          extractOutput(stack, 'privateSubnet1Id'),
          extractOutput(stack, 'privateSubnet2Id')
        ];

        if (vpcId) {
          var vpcInformation = {vpcId: vpcId, publicSubnetsIds: publicSubnetsIds, privateSubnetsIds: privateSubnetsIds};
          logger.debug('VPC information : ', vpcInformation);
          resolve(vpcInformation);
        }
        else {
          reject(new Error(`Stack ${VPCStackName} doesn't exist or vpc information are empty`));
        }
      });
  });

};

function extractOutput(stack, outputName) {
  return _.get(_.find((stack || {}).Outputs, ['OutputKey', outputName]), 'OutputValue');
}