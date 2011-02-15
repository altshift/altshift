/*jslint nodejs: true, indent:4 */
/**
 * Imports
 */
global.JS = {};
//global.JSCLASS_PATH = path.join(path.dirname(__dirname), 'js-class');
/**
 * Auto-load bundled middleware with getters.
 */
require('./core');
require('./stdlib');

module.exports = global.JS;