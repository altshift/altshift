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
var style = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    exports.JSLintTest = require('lint').vows.createTest([__filename, __filenameTested]);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * StyleTest
 ******************************************************************************/
var StyleTest = vows.describe('style module').addBatch({


});

exports.StyleTest = StyleTest;