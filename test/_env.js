/*jslint indent:4 */
var path = require('path');
var fs = require('fs');

function searchRoot(root) {
    if (global.__root || root.length === 0) {
        return;
    }
    try {
        fs.statSync(path.join(root, 'package.json'));

        global.__root = root;
        global.__lib = global.__lib || path.join(global.__root, 'lib');
        global.__test = global.__test || path.join(global.__root, 'test');
        global.__resource = global.__resource || path.join(global.__root, 'resource');

        if (require.paths.indexOf(global.__lib)) {
            require.paths.push(global.__lib);
        }
    } catch (e) {
        searchRoot(path.dirname(root));
    }
}
searchRoot(__dirname);