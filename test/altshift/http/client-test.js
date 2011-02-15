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
        if (request.url !== '/timeout') {
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.end('Helloworld');
        } else {
            //Let the request timeout
        }


    });

    serverTest.listen(3000, 'localhost', callback);
    return serverTest;
}


var ClientTest = vows.describe('Client class').addBatch({
    'request()': {
        topic: function () {
            var self = this,
                client = createClient({
                    timeout: 300
                }),
                report = {
                    response: null,
                    promise: null,
                    server: null
                };

            report.server = createServer(function () {

                // promise accepted
                report.promiseAccepted = client.request({
                    url: 'http://localhost:3000/'
                }).then(function (response) {
                    report.promiseAcceptedResult = response;
                    return response.body.read();
                }).then(function (reponseBody) {
                    report.promiseAcceptedBody = reponseBody;
                    return true;
                });

                // promise refused
                report.promiseRefused = client.request({
                    url: 'http://localhost:3001/'
                }).then(function (success) {
                    //Should never happen
                }, function (error) {
                    report.promiseRefusedError = error;
                });

                // promise timeout
                report.promiseTimeout = client.request({
                    url: 'http://localhost:3000/timeout'
                }).then(function (success) {
                  //Should never happen
                }, function (error) {
                    report.promiseTimeoutError = error;
                });


                report.promiseAccepted
                    .and(report.promiseRefused, report.promiseTimeout)
                    .then(function () {
                        self.callback(null, report);
                    });
            });
        },
        'should return a promise': function (topic) {
            assert.ok(promise.isPromise(topic.promiseAccepted));
        },
        'should return a reponse object when request is correct': function (topic) {
            assert.notEqual(topic.promiseAcceptedResult, null);
            assert.equal(topic.promiseAcceptedBody, 'Helloworld');
        },
        'should return an error object request fails': function (topic) {
            assert.notEqual(topic.promiseRefusedError, null);
            assert.ok(topic.promiseRefusedError instanceof Error);
        },
        'should return an error object request times out': function (topic) {
            assert.notEqual(topic.promiseTimeoutError, null);
            assert.equal(topic.promiseTimeoutError.code, 'timeout');
        },
        teardown: function (topic) {
            topic.server.close();
        }
    }


});

exports.ClientTest = ClientTest;