/*jslint indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

require('./_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.__test, global.__lib),
    path.basename(__filename).replace('_test.js', ''),
    'index.js'
);

/**
 * Imports
 */
var jsclass = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * JSClassTest
 ******************************************************************************/
var JSClassTest = vows.describe('JSClass module').addBatch({
    "require('js-class')": {
        topic: function () {
            return jsclass;
        },
        'should not return undefined': function (topic) {
            assert.notEqual(topic, undefined);
        },
        'should have modules of the core (Class, Module, ...)': function (topic) {
            assert.isFunction(topic.Class);
            assert.isFunction(topic.Module);
            assert.isFunction(topic.Interface);
        },
        'should have modules of the stdlib (Comparable, Enumerable, ...)': function (topic) {
            assert.isObject(topic.Comparable);
            assert.isObject(topic.Enumerable);
        }
    }
});

exports.JSClassTest = JSClassTest;