'use strict';

const Promise = require('bluebird'),
  proxy = require('proxy-agent');

exports.configureSDK = function(sdk) {

  // Configure proxy
  if(process.env.http_proxy) {
    sdk.config.update({ httpOptions: { agent: proxy(process.env.http_proxy) } });
  } else {
    AWS.config.update({ httpOptions: { agent: new https.Agent({maxSockets: 500}) } });
  }
  // Use bluebird as Promise
  sdk.config.setPromisesDependency(Promise);

  sdk.config.update({region: 'eu-central-1'});

  return sdk;
}