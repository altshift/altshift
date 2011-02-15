/*jslint nodejs: true, indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

var env = require('../../_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.TEST, global.LIB),
    path.basename(__filename).replace('-test.js', '.js')
);

/**
 * Imports
 */
var PORT = 60000;
var server = require(__filenameTested);
var promise = require(path.join(global.LIB, 'altshift', 'promise')),
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
                report = {};

            report.server = createServer(function (request) {

            });

            report.listenPromise = report.server.listen(PORT);

            when(report.listenPromise, function () {
                self.callback(null, report);
            });
        },
        "should return a Promise when server is ready": function (topic) {
            assert.ok(promise.isPromise(topic.listenPromise));
        },
        teardown: function (topic) {
            topic.server.stop();
        }
    }
});

exports.ServerTest = ServerTest;