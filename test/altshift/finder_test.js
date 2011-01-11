/*jslint indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

var env = require('../_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.TEST, global.LIB),
    path.basename(__filename).replace('_test.js', '.js')
);

/**
 * Imports
 */
var finder = require(__filenameTested);
var promise = require(path.join(global.LIB, 'altshift', 'promise'));

var Finder = finder.Finder;

/**
 * Constants
 */
var RESOURCE_DIR = path.join(global.RESOURCE, 'test', 'finder_test');

function createFinder() {
    return (new Finder());
}

function assertEqualDirectories(result, expected, message) {

    var resultFiltered, expectedFiltered;

    resultFiltered = [];
    result.forEach(function (dir) {
        if (dir.indexOf('.svn') < 0 && dir.indexOf('.git') < 0) {
            resultFiltered.push(dir);
        }
    });

    expectedFiltered = [];
    expected.forEach(function (dir) {
        expectedFiltered.push(path.join(RESOURCE_DIR, dir));
    });

    assert.deepEqual(resultFiltered, expectedFiltered, message);
}



/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([ __filename, __filenameTested ]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}

/*******************************************************************************
 * Finder validation
 ******************************************************************************/
var FinderTest = vows.describe('Finder class').addBatch({
    "type()": {
        topic: function () {
            return createFinder();
        },
        'should return this' : function (topic) {
            assert.equal(topic.type('file'), topic);
        },
        'should throw error if parameter is wrong' : function (topic) {
            assert.throws(function () {
                topic.type('non_valid');
            });
        }
    },
    "names()": {
        topic: function () {
            return createFinder();
        },
        'should return this' : function (topic) {
            assert.doesNotThrow(function () {
                topic.names('namepattern');
            });
            assert.equal(topic.names('namepattern'), topic);
        },
        'should throw error if parameter is wrong' : function (topic) {
            assert.throws(function () {
                topic.names({});
            });
            assert.throws(function () {
                topic.names(1);
            });
            assert.throws(function () {
                topic.names(function () {});
            });
        }
    },
    "filter()": {
        topic: function () {
            return createFinder();
        },
        'should return this' : function (topic) {
            assert.doesNotThrow(function () {
                topic.filter(function () {});
            });
            assert.equal(topic.filter(function () {}), topic);
        },
        'should throw error if parameter is wrong' : function (topic) {
            var query = createFinder();
            assert.throws(function () {
                query.filter({});
            });
            assert.throws(function () {
                query.filter(1);
            });
            assert.throws(function () {
                query.filter('name');
            });
        }
    },
    "fetch() / with no filter" : {
        topic : function (item) {
            var query = createFinder(),
                self = this,
                report = {
                    called: 0,
                    result: null,
                    promise: null,
                    promiseResult: null
                };

            report.promise = query.fetch(RESOURCE_DIR, function (error, result) {
                report.result = result;
                report.called += 1;
            });

            report.promise.then(function (result) {
                report.promiseResult = result;
                self.callback(null, report);
            });
        },
        'should return a Promise' : function (topic) {
            assert.ok(promise.isPromise(topic.promise));
        },
        'should emit array of directories for promise': function (topic) {
            assertEqualDirectories(topic.promiseResult, [
                'dir1',
                'dir1/dir1',
                'dir1/dir1/file3.ext',
                'dir1/dir2',
                'dir1/dir2/file3.ext',
                'dir1/file1',
                'dir1/file2.ext',
                'file.ext',
                'file1'
            ]);
        },
        'should return an array of directories' : function (topic) {
            assert.equal(topic.called, 1);
            assert.equal(topic.error, null);
            assertEqualDirectories(topic.result, [
                'dir1',
                'dir1/dir1',
                'dir1/dir1/file3.ext',
                'dir1/dir2',
                'dir1/dir2/file3.ext',
                'dir1/file1',
                'dir1/file2.ext',
                'file.ext',
                'file1'
            ]);
        }
    },
    "fetch() / with type filter" : {
        topic : function (item) {
            var query = createFinder(),
                self = this,
                report = {
                    testFileCalled: 0,
                    testDirCalled: 0,
                    promise: null,
                    promiseResult: null
                };

            query.type(Finder.FILE).fetch(RESOURCE_DIR, function (error, result) {
                report.testFileCalled += 1;
                report.testFile = result;
                query.reset().type(Finder.DIR).fetch(RESOURCE_DIR, function (error, result) {
                    report.testDirCalled += 1;
                    report.testDir = result;
                    self.callback(null, report);
                });
            });
        },
        'should return a set of files if Finder.FILE' : function (topic) {
            assert.equal(topic.testFileCalled, 1);
            assertEqualDirectories(topic.testFile, [
                'dir1/dir1/file3.ext',
                'dir1/dir2/file3.ext',
                'dir1/file1',
                'dir1/file2.ext',
                'file.ext',
                'file1'
            ]);
        },
        'should return a set of directories if Finder.DIR' : function (topic) {
            assert.equal(topic.testDirCalled, 1);
            assertEqualDirectories(topic.testDir, [
                'dir1',
                'dir1/dir1',
                'dir1/dir2'
            ]);
        }
    },
    "fetch() / with name filter" : {
        topic : function (item) {
            var query = createFinder(),
                self = this,
                report = {};

            query.reset().names('*.ext').fetch(RESOURCE_DIR, function (error, result) {
                report.testName1 = result;
                query.reset().names('*1').fetch(RESOURCE_DIR, function (error, result) {
                    report.testName2 = result;
                    self.callback(null, report);
                });
            });
        },
        'should throw error if parameter is wrong' : function (topic) {
            var query = createFinder();
            assert.throws(function () {
                query.type('non_valid');
            });
        },
        'should return a set of files or directories satisfying pattern' : function (topic) {
            assertEqualDirectories(topic.testName1, [
                'dir1/dir1/file3.ext',
                'dir1/dir2/file3.ext',
                'dir1/file2.ext',
                'file.ext'
            ]);
            assertEqualDirectories(topic.testName2, [
                'dir1',
                'dir1/dir1',
                'dir1/file1',
                'file1'
            ]);
        }
    },
    "fetch() / with custom filter" : {
        topic : function (item) {
            var query = createFinder(),
                self = this,
                report = {};


            query.reset().filter(function (file) {
                return file.file.indexOf('file3') >= 0;
            }).fetch(RESOURCE_DIR, function (error, result) {
                report.testFilter1 = result;
                query.filter(function (file) {
                    return false;
                }).fetch(RESOURCE_DIR, function (error, result) {
                    report.testFilter2 = result;
                    self.callback(null, report);
                });
            });
        },
        'should return a set of files or directories satisfying pattern' : function (topic) {
            assertEqualDirectories(topic.testFilter1, [
                'dir1/dir1/file3.ext',
                'dir1/dir2/file3.ext'
            ]);
            assertEqualDirectories(topic.testFilter2, []);
        }
    },
    "fetch() / with exclude filter" : {
        topic : function (item) {
            var query = createFinder(),
                self = this,
                report = {};

            query.reset().exclude('dir*').fetch(RESOURCE_DIR, function (error, result) {
                report.testExclude1 = result;
                query.reset().exclude('*2').fetch(RESOURCE_DIR, function (error, result) {
                    report.testExclude2 = result;
                    self.callback(null, report);
                });
            });
        },
        'should return a set of files and dir without the excluded directories' : function (topic) {
            assertEqualDirectories(topic.testExclude1, [
                'file.ext',
                'file1'
            ]);
            assertEqualDirectories(topic.testExclude2, [
                'dir1',
                'dir1/dir1',
                'dir1/dir1/file3.ext',
                'dir1/file1',
                'dir1/file2.ext',
                'file.ext',
                'file1'
            ]);
        }
    }
}).addBatch({
    "fetchSync() / with no filter" : {
        topic : function (item) {
            var query = createFinder();

            return query.fetchSync(RESOURCE_DIR);
        },
        'should return an array of directories' : function (topic) {
            assertEqualDirectories(topic, [
                'dir1',
                'dir1/dir1',
                'dir1/dir1/file3.ext',
                'dir1/dir2',
                'dir1/dir2/file3.ext',
                'dir1/file1',
                'dir1/file2.ext',
                'file.ext',
                'file1'
            ]);
        }
    },
    "fetchSync() / with type filter" : {
        topic : function (item) {
            var query = createFinder(),
                self = this,
                report = {};

            report.testFile = query.reset().type(Finder.FILE).fetchSync(RESOURCE_DIR);
            report.testDir = query.reset().type(Finder.DIR).fetchSync(RESOURCE_DIR);
            return report;
        },
        'should return a set of files if Finder.FILE' : function (topic) {
            assertEqualDirectories(topic.testFile, [
                'dir1/dir1/file3.ext',
                'dir1/dir2/file3.ext',
                'dir1/file1',
                'dir1/file2.ext',
                'file.ext',
                'file1'
            ]);
        },
        'should return a set of directories if Finder.DIR' : function (topic) {
            assertEqualDirectories(topic.testDir, [
                'dir1',
                'dir1/dir1',
                'dir1/dir2'
            ]);
        }
    },
    "fetchSync() / with name filter" : {
        topic : function (item) {
            var query = createFinder(),
                self = this,
                report = {};

            report.testName1 = query.reset().names('*.ext').fetchSync(RESOURCE_DIR);
            report.testName2 = query.reset().names('*1').fetchSync(RESOURCE_DIR);

            return report;
        },
        'should return a set of files or directories satisfying pattern' : function (topic) {
            assertEqualDirectories(topic.testName1, [
                'dir1/dir1/file3.ext',
                'dir1/dir2/file3.ext',
                'dir1/file2.ext',
                'file.ext'
            ]);
            assertEqualDirectories(topic.testName2, [
                'dir1',
                'dir1/dir1',
                'dir1/file1',
                'file1'
            ]);
        }
    },
    "fetchSync() / with custom filter" : {
        topic : function (item) {
            var query = createFinder(),
                self = this,
                report = {};

            report.testFilter1 = query.reset().filter(function (file) {
                return file.file.indexOf('file3') >= 0;
            }).fetchSync(RESOURCE_DIR);

            report.testFilter2 = query.filter(function (file) {
                return false;
            }).fetchSync(RESOURCE_DIR);

            return report;
        },
        'should return a set of files or directories satisfying pattern' : function (topic) {
            assertEqualDirectories(topic.testFilter1, [
                'dir1/dir1/file3.ext',
                'dir1/dir2/file3.ext'
            ]);
            assertEqualDirectories(topic.testFilter2, []);
        }
    },
    "fetchSync() / with exclude filter" : {
        topic : function (item) {
            var query = createFinder(),
                self = this,
                report = {};

            report.testExclude1 = query.reset().exclude('dir*').fetchSync(RESOURCE_DIR);
            report.testExclude2 = query.reset().exclude('*2').fetchSync(RESOURCE_DIR);

            return report;
        },
        'should return a set of files and dir without the excluded directories' : function (topic) {
            assertEqualDirectories(topic.testExclude1, [
                'file.ext',
                'file1'
            ]);
            assertEqualDirectories(topic.testExclude2, [
                'dir1',
                'dir1/dir1',
                'dir1/dir1/file3.ext',
                'dir1/file1',
                'dir1/file2.ext',
                'file.ext',
                'file1'
            ]);
        }
    }
});

exports.FinderTest = FinderTest;