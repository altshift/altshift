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