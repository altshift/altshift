/*jslint nodejs: true, indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    env = require('../../_env');

var __filenameTested = env.toFileTested(__filename);

/**
 * Imports
 */
var http = require(path.join(env.LIB, 'altshift', 'http'));
var server = require(__filenameTested);
var promise = require(path.join(env.LIB, 'altshift', 'promise')),
    when = promise.when;

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * ServerTest
 ******************************************************************************/
function createServer(requestHandler, options) {
    return new server.Server(requestHandler, options);
}

function createRequest(url) {
    return http.request({
            url: url
        }).then(function (response) {
            return response.body.read();
        });
}

var ServerTest = vows.describe('Server class').addBatch({
    'new Server()': {
        topic: function () {
            return createServer({});
        },
        "should return an instance of server": function (topic) {
            assert.ok(topic instanceof server.Server);
        }
    },
    "listen(port)": {
        topic: function () {
            var self = this,
                report = {},
                port = env.getNewPort();

            report.server = createServer(function (request) {

            });

            report.listenPromise = report.server.listen(port);

            when(report.listenPromise, function () {
                report.server.stop();
                self.callback(null, report);
            });
        },
        "should return a Promise when server is ready": function (topic) {
            assert.ok(promise.isPromise(topic.listenPromise));
        }
    },
    "onRequest()": {
        topic: function () {
            var self = this,
                port = env.getNewPort(),
                report = {};

            report.server = createServer(function (request) {
                return new http.Response({
                    headers: {
                        "Transfer-Encoding": "utf8"
                    },
                    body: ['hello world']
                });
            });

            when(report.server.listen(port), function () {
                createRequest('http://localhost:' + port + '/mypath')
                    .then(function (responseBody) {
                        report.responseBody = responseBody;
                        report.server.stop();
                        self.callback(null, report);
                    });
            });
        },
        "should return a correct response body": function (topic) {
            assert.equal(topic.responseBody, 'hello world');
        }
    }
});

exports.ServerTest = ServerTest;