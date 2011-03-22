/*jslint nodejs: true, indent:4 */
/**
 * Imports
 */
var fs = require('fs'),
    path = require('path'),

    //Core & utils
    core = require('./core'),
    isArray = core.isArray,
    isString = core.isString,
    slice = Array.prototype.slice,
    args = function (_args) {
        return isArray(_args) ? _args : slice.call(_args);
    },

    //Promises
    promise = require('./promise'),
    defer = promise.defer;

function _matchAllPatterns(str, patterns) {
    var i, length;
    for (i = 0, length = patterns.length; i < length; i += 1) {
        if (!patterns[i].test(str)) {
            return false;
        }
    }

    return true;
}

function _matchNoPatterns(str, patterns) {
    var i, length;
    for (i = 0, length = patterns.length; i < length; i += 1) {
        if (patterns[i].test(str)) {
            return false;
        }
    }

    return true;
}

function _toRegExp(stringOrRegexp) {
    if (stringOrRegexp instanceof RegExp) {
        return stringOrRegexp;
    }

    if (!isString(stringOrRegexp)) {
        throw new Error(stringOrRegexp + ' should be a string or RegExp');
    }

    if (stringOrRegexp.match('/^([^a-zA-Z0-9\\\\]).+?\\1[ims]?$/')) {
        return stringOrRegexp;
    }

    var strictLeadingDot = true,
        strictWildcardSlash = true,
        firstByte = true,
        escaping = false,
        inCurlies = 0,
        regexp = '',
        char, i;
    for (i = 0; i < stringOrRegexp.length; i += 1) {
        char = stringOrRegexp[i];
        if (firstByte) {
            if (strictLeadingDot && char !== '.') {
                regexp += "(?=[^\\.])";// (?=[^\.])
            }

            firstByte = false;
        }

        if (char === '/') {
            firstByte = true;
        }

        if (char === '.' || char === '(' || char === ')' || char === '|' || char === '+' || char === '^' || char === '$') {
            regexp += "\\" + char + "";
        } else if (char === '*') {
            regexp += escaping ? '\\*' : (strictWildcardSlash ? '[^/]*' : '.*');
        } else if (char === '?') {
            regexp += escaping ? '\\?' : (strictWildcardSlash ? '[^/]' : '.');
        } else if (char === '{') {
            regexp += escaping ? '\\{' : '(';
            if (!escaping) {
                inCurlies += 1;
            }
        } else if (char === '}' && inCurlies) {
            regexp += escaping ? '}' : ')';
            if (!escaping) {
                inCurlies -= 1;
            }
        } else if (char === ',' && inCurlies) {
            regexp += escaping ? ',' : '|';
        } else if (char === '\\') {
            if (escaping) {
                regexp += '\\\\';
                escaping = false;
            } else {
                escaping = true;
            }

            continue;
        } else {
            regexp += char;
        }
        escaping = false;
    }

    return new RegExp('^' + regexp + '$');
}

function _walkRecursiveAsync(filePath, filter, callback, _depth, _env) {
    _env.leafs += 1;
    fs.stat(filePath, function (error, stats) {
        var fileInfo = {file: filePath, stat: stats, depth: _depth};

        //There is an error
        if (error) {
            _env.leafs -= 1;
            if (_env.leafs <= 0) {
                callback(null, _env.result);
            }
            return;
        }

        //For file
        if (stats.isFile()) {
            if (filter(fileInfo)) {
                _env.result.push(fileInfo);
            }

            _env.leafs -= 1;
            if (_env.leafs <= 0) {
                callback(null, _env.result);
                return;
            }

        //For directory
        } else if (stats.isDirectory()) {
            if (filter(fileInfo)) {
                if (_depth > 0) {
                    _env.result.push(fileInfo);
                }

                // Directory - walk recursive
                fs.readdir(filePath, function (error, files) {
                    var i, length;

                    _env.leafs -= 1;
                    for (i = 0; i < files.length; i += 1) {
                        _walkRecursiveAsync(path.join(filePath, files[i]), filter, callback, _depth + 1, _env);
                    }

                    //Check if finished
                    if (_env.leafs <= 0) {
                        callback(null, _env.result);
                        return;
                    }
                });
            } else {
                _env.leafs -= 1;
            }
        } else {
            //TODO: implement symlinks?
        }


        if (_env.leafs <= 0) {
            callback(null, _env.result);
        }
    });
}

function _walkRecursiveSync(filePath, filter, _depth) {

    var fileInfo, results;

    results = [];
    fileInfo = {file: filePath, stat: fs.statSync(filePath), depth: _depth};

    if (fileInfo.stat.isFile()) {
        if (filter(fileInfo)) {
            results.push(fileInfo);
        }
    } else if (fileInfo.stat.isDirectory()) {
        if (filter(fileInfo)) {
            if (_depth > 0) {
                results.push(fileInfo);
            }

            // Directory - walk recursive
            fs.readdirSync(filePath).forEach(function (file) {
                results = results.concat(_walkRecursiveSync(path.join(filePath, file), filter, _depth + 1));
            });
        }
    }
    return results;
}

function returnFile(result) {
    return result.file;
}

/*******************************************************************************
 * Finder class
 *
 * @class
 *
 * Usage:
 *
 * <pre>
 *
 * //1. Async way
 *
 * var finderInstance = new Finder();
 * finderInstance
 *     .type(Finder.FILE)
 *     .names('*.js', '*.coffee')
 *     .fetch(function (error, files) {
 *         files.forEach(function (file) {
 *             //...some code here
 *         });
 *     });
 *
 * //2. Sync way
 *
 * var dirs = finderInstance.type(Finder.DIR).notNames('.svn').fetchSync();//-> [dir1, dir2,...]
 *
 * </pre>
 ******************************************************************************/
var Finder = core.class('Finder', {
    include: [core.ConstantScope],
    extend: {
        FILE: 'file',
        DIR: 'dir',
        ANY: 'any'
    },

    /**
     * Finder constructor
     *
     * @constructor
     */
    initialize: function () {
        this.reset();
    },
    /**
     * Reset all parameters
     *
     * @return this
     */
    reset: function () {
        this._type = Finder.ANY;
        this._names = [];
        this._namesNot = [];

        this._filters = [];

        this._includes = [];
        this._excludes = [];

        this._depthMin = null;
        this._depthMax = null;
        return this;
    },

    /**
     * Filter by type
     *
     * @param {int} type Finder.DIR|Finder.FILE|Finder.ANY
     * @return this
     */
    type: function (type) {
        if (type !== Finder.DIR && type !== Finder.FILE && type !== Finder.ANY) {
            throw new Error('type should be in [Finder.DIR, Finder.FILE, Finder.ANY]');
        }
        this._type = type;
        return this;
    },

    /**
     * Filter with depth between depthMin and depthMax
     *
     * @param {int} depthMin
     * @param {int} depthMax
     * @return this
     */
    depth: function (depthMin, depthMax) {
        if (depthMin !== undefined && (typeof(depthMin) !== 'number' || depthMin < 0)) {
            throw new Error('depthMin should be a positive number');
        }
        if (depthMax !== undefined && (typeof(depthMax) !== 'number' || depthMax < 0)) {
            throw new Error('depthMax should be a positive number');
        }

        this._depthMin = depthMin;
        this._depthMax = depthMax;
        return this;
    },

    /**
     * Include by name
     *
     * @param {string|RegExp, ...}
     * @return this
     */
    names: function () {
        this._names = args(arguments).map(function (pattern) {
            return _toRegExp(pattern);
        }, this);

        return this;
    },

    /**
     * Exclude by name
     *
     * @param {string|RegExp, ...}
     * @return this
     */
    notNames: function () {
        this._namesNot = args(arguments).map(function (pattern) {
            return _toRegExp(pattern);
        }, this);

        return this;
    },

    /**
     * Add a custom filter
     *
     * @param {Function} filter
     * @return this
     */
    filter: function (filter) {
        if (!(filter instanceof Function)) {
            throw new Error('filter should be Function');
        }
        this._filters.push(filter);
        return this;
    },

    /**
     * Exclude directories from the
     *
     * @param {string|RegExp, ...}
     * @return this
     */
    exclude: function () {
        this._excludes = args(arguments).map(function (pattern) {
            return _toRegExp(pattern);
        });
        return this;
    },

    /**
     * Fetch results asynchronously
     *
     * @param {Array|string} directories
     * @param {Function=} callback (optional)
     * @return {Promise}
     */
    fetch: function (directories, callback) {
        var results = [],
            onWalkCount,
            onWalk,
            deferred = defer(),
            preFilter = this._preFilter.bind(this),
            postFilter = this._postFilter.bind(this),
            directory,
            i;

        if (callback) {
            deferred.then(
                function (result) {
                    callback(promise.NO_ERROR, result);
                },
                function (error) {
                    callback(error, promise.NO_RESULT);
                }
            );
        }

        if (!isArray(directories)) {
            directories = [directories];
        }

        if (directories.length === 0) {
            deferred.emitSuccess([]);
            return deferred.promise;
        }

        onWalkCount = directories.length;
        onWalk = function (error, files) {
            onWalkCount -= 1;
            results = results.concat(files);
            if (onWalkCount <= 0 && callback) {
                results = results.filter(postFilter).map(returnFile);
                results.sort();
                deferred.emitSuccess(results);
            }
        };

        i = directories.length - 1;
        while (i >= 0) {
            directory = directories[i];
            _walkRecursiveAsync(
                directory,
                preFilter,
                onWalk,
                0, {
                    result: [],
                    leafs: 0
                }
            );
            i -= 1;
        }
        return deferred.promise;
    },

    /**
     * Fetch results synchronously
     *
     * @param {Array|string} directories
     * @return
     */
    fetchSync: function (directories) {
        if (!isArray(directories)) {
            directories = [directories];
        }

        if (directories.length === 0) {
            return [];
        }

        var results = [],
            directoryResult = [],
            directoryResultSub,
            preFilter = this._preFilter.bind(this),
            postFilter = this._postFilter.bind(this),
            length = directories.length - 1,
            directory;

        while (length >= 0) {
            directory = directories[length];
            directoryResultSub = _walkRecursiveSync(
                    directory,
                    preFilter,
                    0
                );

            if (directoryResultSub.length > 0) {
                directoryResultSub = directoryResultSub
                    .filter(postFilter)
                    .map(returnFile);
                results = results.concat(directoryResultSub);
            }
            length -= 1;
        }
        results.sort();

        return results;
    },

    _postFilter: function (file) {
        var type = this._type,
            filters = this._filters,
            depthMin = this._depthMin,
            filePath, filePathBase, stat, depth, i;

        //filter type
        stat = file.stat;
        if (type !== Finder.ANY) {
            if ((type === Finder.FILE) && !stat.isFile()) {
                return false;
            }
            if ((type === Finder.DIR) && !stat.isDirectory()) {
                return false;
            }
        }

        //Filter depth
        depth = file.depth;
        if (depthMin !== null && depth < depthMin) {
            return false;
        }

        //Name filters
        filePath = file.file;
        filePathBase = path.basename(filePath);

        if (!_matchAllPatterns(filePathBase, this._names)) {
            return false;
        }

        if (!_matchNoPatterns(filePathBase, this._namesNot)) {
            return false;
        }

        //Custom filters
        i = filters.length - 1;
        while (i >= 0) {
            if (!filters[i](file)) {
                return false;
            }
            i -= 1;
        }
        return true;
    },

    _preFilter: function (file) {
        if (!_matchNoPatterns(path.basename(file.file), this._excludes)) {
            return false;
        }

        var depthMax = this._depthMax;

        //Filter depth
        if (depthMax !== null && file.depth > depthMax) {
            return false;
        }

        return true;
    }

});

/**
 * Exports
 */
Finder.export(module);