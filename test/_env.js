/*jslint nodejs: true, indent:4 */
var path = require('path');
var fs = require('fs');
var vows = require('vows');

var env = {},
    port = 55000;
function searchRoot(root) {
    if (env.ROOT || env.length === 0) {
        return;
    }
    try {
        fs.statSync(path.join(root, 'package.json'));

        env.ROOT = root;
        env.LIB = env.LIB || path.join(env.ROOT, 'lib');
        env.TEST = env.__test || path.join(env.ROOT, 'test');
        env.RESOURCE = env.__resource || path.join(env.ROOT, 'resource');

        env.TEST_SUFFIX = '-test.js';
        if (require.paths.indexOf(env.LIB)) {
            require.paths.push(env.LIB);
        }
    } catch (e) {
        searchRoot(path.dirname(root));
    }
}
searchRoot(__dirname);

//module.exports = env;
/*for (var property in env) {
    if (env.hasOwnProperty(property)) {
        global[property] = env[property];
    }
}*/

env.getNewPort = function () {
    var freePort = port;
    port += 1;
    return freePort;
};

env.toFileTested = function (filename) {
    var root = path.dirname(filename).replace(env.TEST, env.LIB),
        pathnames = [
            path.join(
                root,
                path.basename(filename).replace(env.TEST_SUFFIX, '.js')
            ),
            path.join(
                root,
                path.basename(filename).replace(env.TEST_SUFFIX, ''),
                'index.js'
            )
        ],
        pathname, i;
    for (i = 0; i < pathnames.length; i += 1) {
        pathname = pathnames[i];

        try {
            fs.lstatSync(pathname);
        } catch (e) {
            continue;
        }
        return pathname;
    }

    throw new Error('cannot find module tested for "' + filename + '"');
};

env.JSLintTest = function (filenames) {
    var lint;
    try {
        lint = require('lint');
    } catch (e) {
        console.warn('Warning: JSLint not found try `npm install lint`');
    }

    if (lint) {
        return lint.vows.createTest(filenames);
    }
};

module.exports = env;