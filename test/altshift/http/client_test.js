/*jslint indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

var env = require('../../_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.TEST, global.LIB),
    path.basename(__filename).replace('_test.js', '.js')
);

/**
 * Imports
 */
var client = require(__filenameTested);
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
 * ClientTest
 ******************************************************************************/
function createClient(options) {
    return new client.Client(options);
}

function createServer(callback) {
    callback = callback || function () {};

    var serverTest = require('http').createServer(function (request, response) {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end('Helloworld');
    });

    serverTest.listen(3000, 'localhost', callback);
    return serverTest;
}


var ClientTest = vows.describe('Client class').addBatch({
    'request()': {
        topic: function () {
            var self = this,
                client = createClient({
                    timeout: 3000
                }),
                report = {
                    response: null,
                    promise: null,
                    server: null
                };

            report.server = createServer(function () {
                report.promise = client.request({
                    url: 'http://localhost:3000/'
                });

                when(report.promise, function (response) {
                    report.response = response;

                    self.callback(null, report);
                }, function (error) {
                    self.callback(error);
                });
            });
        },
        'should return a promise': function (topic) {
            assert.ok(promise.isPromise(topic.promise));
        },
        'should return a reponse object when promise fullfilled': function (topic) {
            assert.notEqual(topic.response, null);
            assert.equal(topic.response.body, 'Helloworld');
        },
        teardown: function (topic) {
            topic.server.close();
        }
    }


});

exports.ClientTest = ClientTest;