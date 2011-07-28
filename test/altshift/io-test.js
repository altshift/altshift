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
var io = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
exports.JSLintTest = env.JSLintTest([__filenameTested, __filename]);

/*******************************************************************************
 * IoTest
 ******************************************************************************/
var IoTest = vows.describe('io module').addBatch({

});

exports.IoTest = IoTest;