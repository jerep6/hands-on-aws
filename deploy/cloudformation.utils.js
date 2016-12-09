'use strict';

const awsUtils = require('./common/aws.utils'),
  AWS = awsUtils.configureSDK(require('aws-sdk')),
  logger = require('./common/logger.utils'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  fs = require('fs'),
  path = require('path'),
  mime = require('mime-types'),
  config = require('./common/config');

function CloudFormation() {
  this.awsSdk = new AWS.CloudFormation({apiVersion: '2010-05-15'});
};

CloudFormation.prototype.waitStackStatus = function (stackId, statusProgress, statusOK) {
  var self = this;
  statusProgress = statusProgress || [];
  statusOK = statusOK || [];

  var defered = Promise.defer();
  var params = {
    StackName: stackId
  };

  (function describe() {
    self.awsSdk.describeStacks(params, function (err, data) {
      if (err || !data || data.Stacks.length === 0) {
        logger.error(err);
        defered.reject();
        return;
      }
      var stack = data.Stacks[0];
      if (statusProgress.indexOf(stack.StackStatus) > -1) {
        logger.info('Waiting for stack completion: ', stack.StackStatus);
        setTimeout(function () {
          describe();
        }, 5000);
      } else {
        if (statusOK.indexOf(stack.StackStatus) > -1) {
          logger.info('Stack complete: ', stack.StackStatus);
          defered.resolve(stack);
        }
        else {
          logger.info('Stack in error: ', stack.StackStatus);
          defered.reject();
        }
      }
    });
  })();

  return defered.promise;
};

CloudFormation.prototype.waitStackDeleted = function (stackId) {
  return this.waitStackStatus(stackId, ['DELETE_IN_PROGRESS'], ['DELETE_COMPLETE']);
};


CloudFormation.prototype.waitStackCreation = function (stackId) {
  return this.waitStackStatus(stackId, ['CREATE_IN_PROGRESS'], ['CREATE_COMPLETE']);
};

CloudFormation.prototype.waitStackUpdate = function (stackId) {
  return this.waitStackStatus(stackId, ['UPDATE_IN_PROGRESS', 'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS'], ['UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE', 'CREATE_COMPLETE']);
};

CloudFormation.prototype.createStack = function (params) {
  var defered = Promise.defer();

  logger.debug('Create stack ' + params.StackName + ' with parameters ' + JSON.stringify(params));

  this.awsSdk.createStack(params, function (err, data) {
    if (err) {
      logger.error(err, err.stack);
      defered.reject(err);
      return;
    }
    logger.info('Cloudformation stack ' + params.StackName + ' is ok', data);
    defered.resolve(data);
  });

  return defered.promise;
};

CloudFormation.prototype.updateStack = function (params, handleStackNotModified) {
  var self = this;
  var defered = Promise.defer();

  logger.debug('Update stack ' + params.StackName + ' with parameters ' + JSON.stringify(params));

  this.awsSdk.updateStack(params, function (err, data) {
    if (err) {
      // Stack is not modified, so describe stack for return value
      if (handleStackNotModified && err.code === 'ValidationError' && err.message === 'No updates are to be performed.') {
        defered.resolve(self.describeStacksByName(params.StackName));
      } else {
        logger.error(err, err.stack);
        defered.reject(err);
        return;
      }
    }
    logger.info('Cloudformation update stack ' + params.StackName + ' is ok', data);
    defered.resolve(data);
  });

  return defered.promise;
};

CloudFormation.prototype.deleteStack = function (stackName) {
  var defered = Promise.defer();

  this.awsSdk.deleteStack({StackName: stackName}, function(err, data) {
    if (err) {
      logger.error('Cloudformation delete stack ' + stackName + ' is ko with error : ' + err);
      defered.reject(err);
    }
    logger.debug('Cloudformation delete stack ' + stackName + ' is ok');
    defered.resolve(data);
  });

  return defered.promise;
};

CloudFormation.prototype.describeStacksByName = function (stackName) {
  var defered = Promise.defer();

  var params = {
    StackName: stackName
  };
  this.awsSdk.describeStacks(params, function (err, data) {
    var stack = _.get(data, 'Stacks[0]');
    defered.resolve(stack);
  });
  return defered.promise;
};

CloudFormation.prototype.describeStackEvents = function (stackName) {
  var defered = Promise.defer();

  var params = {
    StackName: stackName
  };
  this.awsSdk.describeStackEvents(params, function (err, data) {
    defered.resolve(data);
  });
  return defered.promise;
};

CloudFormation.prototype.debugInformations = function (stackName) {
  var self = this;
  // Describe stack
  return this.describeStacksByName(stackName)
    .then(function (stack) {
      logger.info('Stack description for ' + stackName + ': ', JSON.stringify(stack));
    })
    .then(function () {
      return self.describeStackEvents(stackName);
    })
    .then(function (events) {
      logger.info('Events on stack ' + stackName + ':', JSON.stringify(events));
    });
};

CloudFormation.prototype.isStackExist = function (stackName) {
  return this.describeStacksByName(stackName)
    .then(function (stack) {
      return stack !== undefined;
    });
};

CloudFormation.prototype.createOrUpdateStack = function (stackName, tpl, parameters, tags) {
  const self = this;
  return self.isStackExist(stackName)
    .then((exist) => {
      let promise;
      if(!exist) {
        promise = self.createStack({
          StackName: stackName,
          Capabilities: ['CAPABILITY_IAM'],
          Parameters: parameters,
          OnFailure: 'ROLLBACK',
          Tags: tags,
          TemplateBody: JSON.stringify(tpl),
          TimeoutInMinutes: 30
        });
      }
      else {
        promise = self.updateStack({
          StackName: stackName,
          Capabilities: ['CAPABILITY_IAM'],
          Parameters: parameters,
          TemplateBody: JSON.stringify(tpl)
        }, true);
      }
      return promise.then((stack) => {
        return { create: !exist, update: exist, stackId: stack.StackId}
      })
    });
};

CloudFormation.prototype.waitStackComplete = function (createOrUpdateData) {
  const self = this;
    if(createOrUpdateData.create) {
      return self.waitStackCreation(createOrUpdateData.stackId);
    } else {
      return self.waitStackUpdate(createOrUpdateData.stackId);
    }
  };

module.exports = CloudFormation;