/*jslint nodejs: true, indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    env = require('./_env');
var __filenameTested = env.toFileTested(__filename);

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
        }
    }
});

exports.JSClassTest = JSClassTest;