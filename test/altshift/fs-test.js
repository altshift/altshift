/*jslint nodejs: true, indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

var env = require('../_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.TEST, global.LIB),
    path.basename(__filename).replace('-test.js', '.js')
);

/**
 * Imports
 */
var fs = require(__filenameTested);
var promise = require(path.join(global.LIB, 'altshift', 'promise')),
    when = promise.when;

var RESOURCE_DIR = path.join(global.RESOURCE, 'test', 'fs_test');

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

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