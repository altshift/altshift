/*jslint indent:4 */
/**
 * Imports
 */
var fs = require('fs'),
    promise = require('./promise');

//Shortcuts
var defer = promise.defer,
    when = promise.when,
    convertNodeAsyncFunction = promise.convertNodeAsyncFunction;

//convert all the non-sync functions
for (var property in fs) {
    if (property.match(/Sync$/) || property.match(/watch/)) {
        exports[property] = fs[property];
    } else {
        exports[property] = convertNodeAsyncFunction(fs[property]);
    }
}

//convert the functions that don't have a declared callback
exports.writeFile = convertNodeAsyncFunction(fs.writeFile, true);
exports.readFile = convertNodeAsyncFunction(fs.readFile, true);