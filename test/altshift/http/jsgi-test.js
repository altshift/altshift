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
var jsgi = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * RequestTest
 ******************************************************************************/
var RequestTest = vows.describe('Request class').addBatch({

});

/*******************************************************************************
 * ResponseTest
 ******************************************************************************/
var ResponseTest = vows.describe('Response class').addBatch({

});

exports.RequestTest = RequestTest;
exports.ResponseTest = ResponseTest;