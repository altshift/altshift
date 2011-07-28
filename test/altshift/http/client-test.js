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
var client = require(__filenameTested);
var promise = require(path.join(env.LIB, 'altshift', 'promise')),
    when = promise.when;

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
exports.JSLintTest = env.JSLintTest([__filenameTested, __filename]);

/*******************************************************************************
 * ClientTest
 ******************************************************************************/
function createClient(options) {
    return new client.Client(options);
}

function createServer(port, callback) {
    callback = callback || function () {};

    var serverTest = require('http').createServer(function (request, response) {
        if (request.url !== '/timeout') {
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.end('Helloworld');
        } else {
            //Let the request timeout
        }


    });

    serverTest.listen(port, 'localhost', callback);
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
                },
                port = env.getNewPort();

            report.server = createServer(port, function () {

                // promise accepted
                report.promiseAccepted = client.request({
                    url: 'http://localhost:' + port + '/'
                }).then(function (response) {
                    report.promiseAcceptedResult = response;
                    return response.body.read();
                }).then(function (reponseBody) {
                    report.promiseAcceptedBody = reponseBody;
                    return true;
                });

                // promise refused
                report.promiseRefused = client.request({
                    url: 'http://localhost:' + (port + 1) + '/'
                }).then(function (success) {
                    //Should never happen
                }, function (error) {
                    report.promiseRefusedError = error;
                });

                // promise timeout
                report.promiseTimeout = client.request({
                    url: 'http://localhost:' + port + '/timeout'
                }).then(function (success) {
                  //Should never happen
                }, function (error) {
                    report.promiseTimeoutError = error;
                });


                report.promiseAccepted
                    .and(report.promiseRefused, report.promiseTimeout)
                    .then(function () {
                        report.server.close();
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
        }
    }


});

exports.ClientTest = ClientTest;