const TP_GROUP_NAME = "group1";

module.exports = {
  groupName: process.env.GroupName || TP_GROUP_NAME,
  logmatic: {
    host: "api.logmatic.io",
    key:  "vnfON-PWTc-Ne0GS_JQsKg",
    name: `hands-on-${process.env.GroupName || TP_GROUP_NAME}`,
    port: 10515,
    use: true
  },
  deploy: {
    "bucket": "michelin-hands-on"
  }
};