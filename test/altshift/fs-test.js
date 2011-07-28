/*jslint nodejs: true, indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    env = require('../_env');

var __filenameTested = env.toFileTested(__filename);

/**
 * Imports
 */
var fs = require(__filenameTested);
var promise = require(path.join(env.LIB, 'altshift', 'promise')),
    when = promise.when;

var RESOURCE_DIR = path.join(env.RESOURCE, 'test', path.basename(__filename).replace('.js', ''));

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
exports.JSLintTest = env.JSLintTest([__filenameTested, __filename]);

/*******************************************************************************
 * FsTest
 ******************************************************************************/
var FsTest = vows.describe('fs module').addBatch({
    'readFile()': {
        topic: function () {
            var self = this,
                filePath = path.join(RESOURCE_DIR, 'test.ext'),
                report = {
                    returnValue: fs.readFile(filePath)
                };

            when(report.returnValue, function (result) {
                report.result = result.toString('utf8');
                self.callback(null, report);
            });
        },
        "should be instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should return the file content": function (topic) {
            assert.equal(topic.result, 'Helloworld');
        }
    },
    'readFile(..., callback)': {
        topic: function () {
            var self = this,
                filePath = path.join(RESOURCE_DIR, 'test.ext'),
                report = {
                    returnValue: fs.readFile(filePath, function (error, result) {
                        report.result = result.toString('utf8');
                        self.callback(null, report);
                    })
                };
        },
        "should be instance of Promise": function (topic) {
            assert.ok(promise.isPromise(topic.returnValue));
        },
        "should return the file content": function (topic) {
            assert.equal(topic.result, 'Helloworld');
        }
    }

});

exports.FsTest = FsTest;