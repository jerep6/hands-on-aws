'use strict';

var moment = require('moment');

var StopWatch = function () {
  this.startDate = moment().valueOf();
};

StopWatch.prototype.elapseTime = function() {
  return moment().valueOf() - this.startDate;
};

module.exports = StopWatch;