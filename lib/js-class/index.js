/*jslint nodejs: true, indent:4 */
/**
 * Imports
 */
//global.JS = {};
//global.JSCLASS_PATH = path.join(path.dirname(__dirname), 'js-class');
/**
 * Auto-load bundled middleware with getters.
 */
var jsClass = require('./core').JS;
module.exports = jsClass;