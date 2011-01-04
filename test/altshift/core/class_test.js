/*jslint indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

require('../../_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.TEST, global.LIB),
    path.basename(__filename).replace('_test.js', '.js')
);

/**
 * Imports
 */
var core = require(__filenameTested);

var BaseClass = core.Class;
var ClassExceptionTest = new core.Class('ClassExceptionTest', core.BaseException);

function createClass(name, classParent, methods) {
    return new core.Class(name, classParent, methods);
}

function createInterface(name, methods) {
    return new core.Interface(name, methods);
}

function createException(options) {
    return (new ClassExceptionTest(options));
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
 * ClassTest class
 ******************************************************************************/
var ClassTest = vows.describe('Class class').addBatch({
    "Class()" : {
        topic : function (item) {
            return createClass('NewClass');
        },
        'should return new class' : function (topic) {
            assert.notEqual(topic, undefined);
            assert.ok(typeof (topic) === 'function');
        },
        'should have Class as parent' : function (topic) {
            assert.equal(topic.superclass, Object);
            assert.equal(topic.superclass.displayName, 'Object');
        },
        'should have a distinct name' : function (topic) {
            assert.equal(topic.displayName, 'NewClass');
        },
        'should return a new extendable class' : function (topic) {
            var classNew = createClass('NewClass2', topic);
            assert.notEqual(classNew, undefined);
            assert.ok(typeof (classNew) === 'function');

            assert.equal(classNew.superclass, topic);
            assert.equal(classNew.displayName, 'NewClass2');
        }
    },
    "Class.toString()" : {
        topic : function (item) {
            return createClass('NewClass');
        },
        'should return formatted string' : function (topic) {
            assert.equal(topic.toString(), '<class NewClass>');
            assert.equal('' + topic, '<class NewClass>');
        },
        'should return formatted string for child class' : function (topic) {
            var classChild = createClass('ClassChild', topic);
            assert.equal(classChild.toString(), '<class ClassChild>');
            assert.equal('' + classChild, '<class ClassChild>');
        }
    },
    "new (Class.extend())(...)" : {
        topic : function (item) {
            var classParent, classChild;
            classParent = createClass('ClassParent', {
                initialize : function (arg1, arg2) {
                    this._arg1 = arg1;
                    this._arg2 = arg2;
                },
                fooMethod : function (test1) {
                    return test1;
                }
            });

            classChild = createClass('ClassChild', classParent, {
                initialize : function (arg1, arg2, arg3) {
                    this.callSuper(arg1, arg2, arg3);
                    this._arg3 = arg3;
                },
                barMethod : function (test1) {
                    return test1;
                }
            });

            return classChild;
        },
        'should return new object' : function (ClassTopic) {
            assert.notEqual(new ClassTopic(), undefined);
        },
        'should use the `initialize` as constructor' : function (ClassTopic) {
            var obj = new ClassTopic(1, 2, 'foo');
            assert.equal(obj._arg1, 1);
            assert.equal(obj._arg2, 2);
            assert.equal(obj._arg3, 'foo');
        },
        'should have new methods' : function (ClassTopic) {
            var obj = new ClassTopic(1, 2);
            assert.notEqual(obj.fooMethod, undefined);
            assert.equal(obj.fooMethod('toto'), 'toto');
            assert.equal(obj.barMethod('tata'), 'tata');
        }
    },
    "object.finalize()" : {
        topic : function (item) {
            var ClassNew, obj;

            ClassNew = createClass('ClassNew', {
                fooMethod: function () {
                }
            });

            obj = new ClassNew();
            obj.arg = 'foo';
            obj.anonymous = {
                foo : 1
            };
            return obj;
        },
        'should destroy all properties' : function (topic) {
            assert.equal(topic.arg, 'foo');
            assert.equal(topic.anonymous.foo, 1);

            topic.finalize();

            assert.equal(topic.arg, undefined);
            assert.equal(topic.anonymous, undefined);
        }
    },
    "object.clone()" : {
        topic : function (item) {
            var ClassNew, obj;

            ClassNew = createClass('ClassNew', {
                fooMethod: function () {
                }
            });

            obj = new ClassNew();
            obj.arg = 'foo';
            obj.anonymous = {
                foo : 1
            };
            return obj;
        },
        'should return a copy of a new object' : function (topic) {
            var cloned = topic.clone();
            cloned.arg = 'bar';

            // Check clone
            assert.equal(topic.arg, 'foo');
            assert.equal(cloned.arg, 'bar');
            assert.equal(cloned.anonymous, topic.anonymous);
        },
        'should not clone object values if deep=false' : function (topic) {
            var cloned = topic.clone();
            assert.equal(cloned.anonymous, topic.anonymous);
        },
        'should clone object values if deep=false' : function (topic) {
            var cloned = topic.clone(true);
            assert.deepEqual(cloned.anonymous, topic.anonymous);
            assert.notEqual(cloned.anonymous, topic.anonymous);
        }
    },
    "object.toString()" : {
        topic : function (item) {
            var ClassNew, obj;
            ClassNew = createClass('ClassNew', {
                fooMethod: function () {
                }
            });

            obj = new ClassNew();
            obj.arg = 'foo';
            obj.anonymous = {
                foo : 1
            };
            return obj;
        },
        'should return formatted string representing object' : function (topic) {
            assert.equal(topic.toString(), '<object ClassNew>');
        }
    },
    "object(args)" : {
        topic : function (item) {
            var ClassNew, obj;

            ClassNew = createClass('ClassCallable', {
                initialize : function (classArg) {
                    this._classArg = classArg;

                    var self = this;
                    return function (arg1, arg2) {
                        this._arg1 = arg1;
                        this._arg2 = arg2;
                        return [ self._classArg, this._arg1, this._arg2 ];
                    };
                }
            });

            obj = new ClassNew('classParent');
            return obj;
        },
        'should be callable' : function (topic) {

            assert.deepEqual(topic('arg1', 'arg2'), [ 'classParent', 'arg1', 'arg2' ]);
        }
    }
});

/*******************************************************************************
 * ExceptionTest class
 ******************************************************************************/
var ExceptionTest = vows.describe('Exception class').addBatch({
    "constructor()" : {
        topic : function (item) {
            return createException({
                code : 'error-code',
                message : 'toto'
            });
        },
        'should return new error' : function (topic) {
            assert.equal(topic.klass.displayName, 'ClassExceptionTest');
            assert.equal(topic.code, 'error-code');
            assert.equal(topic.message, 'toto');
        },
        'should have .name equal to constructor name' : function (topic) {
            assert.equal(topic.klass.displayName, 'ClassExceptionTest');
        }
    },
    "toString()" : {
        topic : function (item) {
            return createException({
                code : 'error-code',
                message : 'foo %(bar) baz'
            });
        },
        'should return formatted exception' : function (topic) {
            assert.equal(topic.toString(), 'ClassExceptionTest[error-code]: foo %(bar) baz');
            assert.ok(topic.toString(true).length > 0);
        },
        'should format tags %(alias) in message' : function (topic) {
            var exception = createException({
                code : 'error-code',
                message : 'foo %(bar) baz',
                bar : 'heho',
                foo : 'ahah'
            });

            assert.equal(exception.toString(), 'ClassExceptionTest[error-code]: foo heho baz');
            assert.ok(exception.toString(true).length > 0);
        }
    }
});

/*******************************************************************************
 * InterfaceTest class
 ******************************************************************************/
var InterfaceTest = vows.describe('Interface class').addBatch({
    "constructor()" : {
        topic : function (item) {
            return createInterface('InterfaceNew', [ 'foo', 'bar' ]);
        },
        'should return new Interface' : function (topic) {
            assert.notEqual(topic, undefined);
            assert.ok(topic.methods.foo);
            assert.ok(topic.methods.bar);
            assert.isUndefined(topic.methods.nonexistent);
        },
        /*'should return extendable interface' : function (topic) {
            var interfaceChild = createInterface('InterfaceNewChild', ['foo', 'baz']);

            assert.notEqual(interfaceChild, undefined);
            assert.ok(typeof(interfaceChild) === 'function');
            assert.ok(interfaceChild.methods.foo !== undefined);
            assert.ok(interfaceChild.methods.bar !== undefined);
            assert.ok(interfaceChild.methods.baz !== undefined);
            assert.isUndefined(topic.methods.nonexistent);
        },*/
        'should have .name equal to constructor name' : function (topic) {
            assert.equal(topic.name, 'InterfaceNew');
        }
    },
    "test()" : {
        topic : function (item) {
            return createInterface('InterfaceNew', [ 'foo', 'bar' ]);
        },
        'should return true if object has methods' : function (topic) {
            assert.equal(topic.test({
                foo : function () {
                },
                bar : function () {
                },
                baz : function () {
                },
                toto : 1
            }), true);
        },
        'should return false if object has a missing method' : function (topic) {
            assert.equal(topic.test({
                foo : function () {
                },
                baz : function () {
                },
                toto : 1
            }), false);
            assert.equal(topic.test({
                foo : function () {
                },
                bar : 123,
                baz : function () {
                },
                toto : 1
            }), false);
        },
        'should return methodName if object has a missing method (returnName=true)' : function (topic) {
            assert.equal(topic.test({
                foo : function () {
                },
                baz : function () {
                },
                toto : 1
            }, true), 'bar');
        }
    },
    "assert()" : {
        topic : function (item) {
            return createInterface('InterfaceNew', [ 'foo', 'bar' ]);
        },
        'should not throw error if object has methods' : function (topic) {
            assert.doesNotThrow(function () {
                topic.assert({
                    foo : function () {
                    },
                    bar : function () {
                    },
                    baz : function () {
                    },
                    toto : 1
                });
            });
        },
        'should throw error if object has a missing method' : function (topic) {
            assert.throws(function () {
                topic.assert({
                    foo : function () {
                    },
                    baz : function () {
                    },
                    toto : 1
                });
            });
            assert.throws(function () {
                topic.assert({
                    foo : function () {
                    },
                    bar : 123,
                    baz : function () {
                    },
                    toto : 1
                });
            });
        }
    },
    "toString()" : {
        topic : function (item) {
            return createInterface('InterfaceNew');
        },
        'should return formatted string <object Interface>' : function (topic) {
            assert.equal(topic.toString(), '<object Interface>');
        }
    }
});

// exports.ModuleTest = ModuleTest;
exports.ClassTest = ClassTest;
exports.InterfaceTest = InterfaceTest;
exports.ExceptionTest = ExceptionTest;