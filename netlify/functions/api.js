const serverlessHttp = require('serverless-http');
const { app } = require('../../server/index');

exports.handler = serverlessHttp(app);
