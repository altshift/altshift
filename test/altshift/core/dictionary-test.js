/*jslint nodejs: true, indent:4 */
/**
 * Generic Imports
 */
var vows = require('vows');
var assert = require('assert');
var path = require('path');

require('../../_env');
var __filenameTested = path.join(
    path.dirname(__filename).replace(global.TEST, global.LIB),
    path.basename(__filename).replace('-test.js', '.js')
);

/**
 * Imports
 */
var dictionary = require(__filenameTested);

/*******************************************************************************
 * JSLint validation
 ******************************************************************************/
try {
    require('lint').vows.createTest([__filename, __filenameTested]).export(module);
} catch (e) {
    console.warn('Warning: JSLint not found try `npm install lint`');
}
/*******************************************************************************
 * Dictionary Test
 ******************************************************************************/
function createDictionary(data) {
    return (new dictionary.Dictionary(data));
}
var DictionaryTest = vows.describe('Dictionary class').addBatch({
    "new Dictionary(data)": {
        topic : function (item) {
            return createDictionary(createDictionary({foo: 'bar', baz: 1, bar: 'toto'}));
        },
        'should construct a copy if data is a Hash' : function (topic) {
            assert.deepEqual(topic, createDictionary({foo: 'bar', baz: 1, bar: 'toto'}));
        }
    },
    "equals()": {
        topic : function (item) {
            return createDictionary({foo: 'bar', baz: 1, bar: 'toto'});
        },
        'should return true if compared to itself' : function (topic) {
            assert.equal(topic.equals(topic), true);
        },
        'should return true if compared to a clone' : function (topic) {
            assert.equal(topic.equals(createDictionary({foo: 'bar', baz: 1, bar: 'toto'})), true);
        },
        'should return false if types are different' : function (topic) {
            assert.equal(topic.equals('fldjslfkjdlks'), false);
            assert.equal(topic.equals(1), false);
            assert.equal(topic.equals({foo: 'bar', baz: 1, bar: 'toto'}), false);
        },
        'should return false if hash are differents' : function (topic) {
            assert.equal(topic.equals(createDictionary({foo: 'bar', baz: 1, bar: 'tot'})), false);
            assert.equal(topic.equals(createDictionary({foo: 'bar', baz: 1})), false);
            assert.equal(topic.equals(createDictionary({foo: 'bar', baz: 1, bar: 'toto', babar: 'hello'})), false);
        }
    },
    "hash()": {
        topic : function (item) {
            return createDictionary({foo: 'bar', baz: 1, bar: 'toto'});
        },
        'should return empty string for empty hash' : function (topic) {
            assert.equal(createDictionary().hash(topic), '');
        },
        'should return sorted hash of (key, value) hashes' : function (topic) {
            assert.equal(topic.hash(topic), '1bazbarfoobartoto');
        }
    },
    "get()" : {
        topic : function (item) {
            return createDictionary();
        },
        'should return undefined if key does not exists' : function (topic) {
            assert.equal(topic.get('fldjslfkjdlks'), undefined);
        },
        'should return defaultValue if key does not exists' : function (topic) {
            assert.equal(topic.get('fldjslfkjdlks', 'defaultArg'), 'defaultArg');
        },
        'should return data if key exists' : function (topic) {
            topic.set('myId', 'helloworld');
            assert.equal(topic.get('myId'), 'helloworld');
        }
    },
    "set()" : {
        topic : function (item) {// Topic
            return createDictionary();
        },
        'should return this' : function (topic) {
            assert.equal(topic.set('fldjslfkjdlks', 'jkljlm'), topic);
        },
        'should return set data' : function (topic) {
            topic.set('myId', 'helloworld');
            assert.equal(topic.get('myId'), 'helloworld');
        },
        'should return set many value if called as set({key: value, ...})' : function (topic) {
            topic.set({
                myId : 'helloworld2',
                key2 : 'lol'
            });
            assert.equal(topic.get('myId'), 'helloworld2');
            assert.equal(topic.get('key2'), 'lol');
        }
    },
    "isset() " : {
        topic : function (item) {// Topic
            return createDictionary();
        },
        'should return false if key does not exists' : function (topic) {
            assert.equal(topic.isset('fsdqfjdlk'), false);
        },
        'should return true if key exists' : function (topic) {
            topic.set('myId', 'helloworld');
            assert.equal(topic.isset('myId'), true);
        }
    },
    "unset()" : {
        topic : function (item) {// Topic
            return createDictionary();
        },
        'should return default param if key does not exist' : function (topic) {
            assert.equal(topic.unset('jakhhk', 'defaultValue'), 'defaultValue');
        },
        'should delete element and return this element' : function (topic) {
            topic.set('myId', 'helloworld');
            assert.equal(topic.isset('myId'), true);
            var result = topic.unset('myId', 'defaultValue');
            assert.equal(topic.isset('myId'), false);
            assert.equal(result, 'helloworld');
        }
    },
    "key()" : {
        topic : function (item) {
            return createDictionary({foo: 'foofoo', bar: 1, baz: 'fjdsklfjsdkl'});
        },
        'should return undefined if value is not found' : function (topic) {
            assert.isUndefined(topic.key('nonexistent'));
            assert.isUndefined(topic.key('foo'));
        },
        'should return key if value is found' : function (topic) {
            assert.equal(topic.key('foofoo'), 'foo');
            assert.equal(topic.key(1), 'bar');
        }
    },
    "keys()" : {
        topic : function (item) {
            return createDictionary();
        },
        'should return array containing all data keys' : function (topic) {
            assert.deepEqual(topic.keys(), []);
            topic.set('foo', 1);
            assert.deepEqual(topic.keys(), [ 'foo' ]);
            topic.set('bar', 2);
            assert.deepEqual(topic.keys(), [ 'foo', 'bar' ]);
            topic.unset('foo');
            assert.deepEqual(topic.keys(), [ 'bar' ]);
        }
    },
    "values()" : {
        topic : function (item) {
            return createDictionary();
        },
        'should return array containing all data keys' : function (topic) {
            assert.deepEqual(topic.values(), []);
            topic.set('foo', 1);
            assert.deepEqual(topic.values(), [ 1 ]);
            topic.set('bar', 2);
            assert.deepEqual(topic.values(), [ 1, 2 ]);
            topic.unset('foo');
            assert.deepEqual(topic.values(), [ 2 ]);
        }
    },
    "count()" : {
        topic : function (item) {
            return createDictionary();
        },
        'should return the key count' : function (topic) {
            assert.deepEqual(topic.count(), 0);
            topic.set('foo', 1);
            assert.deepEqual(topic.count(), 1);
            topic.set('bar', 2);
            assert.deepEqual(topic.count(), 2);
            topic.unset('foo');
            assert.deepEqual(topic.count(), 1);
            topic.unset('foo');
            assert.deepEqual(topic.count(), 1);
        },
        'should return the key count with an iterator' : function (topic) {
            var iterator = function (el) {
                return (el === 1);
            };

            assert.deepEqual(topic.count(iterator), 0);
            topic.set('foo', 1);
            assert.deepEqual(topic.count(iterator), 1);
            topic.set('bar', 2);
            assert.deepEqual(topic.count(iterator), 1);
            topic.unset('foo');
            assert.deepEqual(topic.count(iterator), 0);
            topic.unset('foo');
            assert.deepEqual(topic.count(iterator), 0);
        }
    },
    "length" : {
        topic : function (item) {
            return createDictionary();
        },
        'should return the key count' : function (topic) {
            assert.deepEqual(topic.length, 0);
            topic.set('foo', 1);
            assert.deepEqual(topic.length, 1);
            topic.set('bar', 2);
            assert.deepEqual(topic.length, 2);
            topic.unset('foo');
            assert.deepEqual(topic.length, 1);
            topic.unset('foo');
            assert.deepEqual(topic.length, 1);
        }
    },
    "extend()" : {
        topic : function (item) {
            return createDictionary();
        },
        'should return extends with an object' : function (topic) {
            topic.set('foo', 1);

            topic.extend();
            assert.equal(topic.get('foo'), 1);

            topic.extend({
                bar : 2,
                baz : 3
            });
            assert.equal(topic.get('foo'), 1);
            assert.equal(topic.get('bar'), 2);
            assert.equal(topic.get('baz'), 3);

            topic.extend({
                bar : 0,
                baz : 0
            });
            assert.equal(topic.get('foo'), 1);
            assert.equal(topic.get('bar'), 0);
            assert.equal(topic.get('baz'), 0);
        },
        'should return extends with a Hash' : function (topic) {
            topic.set('foo', 1);

            topic.extend();
            assert.equal(topic.get('foo'), 1);

            topic.extend(createDictionary({
                bar : 2,
                baz : 3
            }));
            assert.equal(topic.get('foo'), 1);
            assert.equal(topic.get('bar'), 2);
            assert.equal(topic.get('baz'), 3);

            topic.extend(createDictionary({
                bar : 0,
                baz : 0
            }));
            assert.equal(topic.get('foo'), 1);
            assert.equal(topic.get('bar'), 0);
            assert.equal(topic.get('baz'), 0);
        }
    },
    "filter()" : {
        topic : function (item) {
            return createDictionary();
        },
        'should return new Hash statisfying iterator' : function (topic) {
            topic.extend({
                foo : 1,
                bar : 2,
                baz : 'toto'
            });

            assert.deepEqual(topic.filter(function () {
            }), createDictionary());
            assert.deepEqual(topic.filter(function (el) {
                return el === 'toto';
            }), createDictionary({
                baz : 'toto'
            }));

            topic.set('baz', 'tata');
            assert.deepEqual(topic.filter(function (el) {
                return el === 'toto';
            }), createDictionary());
        }
    },
    "clear()" : {
        topic : function (item) {
            return createDictionary({});
        },
        'should return this' : function (topic) {
            assert.equal(topic.clear(), topic);
        },
        'should empty an already empty dictionary without error' : function (topic) {
            topic.clear();
            assert.deepEqual(topic, createDictionary());
        },
        'should empty the content' : function (topic) {
            topic.extend({
                foo : 1,
                bar : 2,
                baz : 'toto'
            });

            assert.equal(topic.count(), 3);

            topic.clear();
            assert.equal(topic.count(), 0);
        }
    },
    "clone()" : {
        topic : function (item) {
            var hashObj = createDictionary({});
            hashObj.set('foo', 1);
            hashObj.set('bar', 2);
            hashObj.set('hashObject', createDictionary({
                ahah : 3
            }));
            hashObj.set('anonymous', {
                ohoh : 3
            });
            return hashObj;
        },
        'should return copy of this dictionary' : function (topic) {
            var clone = topic.clone();
            clone.set('foo', 3);

            assert.equal(topic.get('foo'), 1);
            assert.equal(clone.get('foo'), 3);
            assert.equal(clone.get('bar'), 2);
        },
        'should not clone hash values if deep=false' : function (topic) {
            var clone = topic.clone();
            clone.set('foo', 3);

            assert.equal(clone.get('baz'), topic.get('baz'));
        },
        'should clone hash values if deep=true' : function (topic) {
            var clone = topic.clone(true);

            assert.notEqual(clone.get('hashObject').count, undefined);
            assert.deepEqual(clone.get('hashObject'), topic.get('hashObject'));
            assert.notEqual(clone.get('hashObject'), topic.get('hashObject'));

            assert.deepEqual(clone.get('anonymous'), topic.get('anonymous'));
            assert.notEqual(clone.get('anonymous'), topic.get('anonymous'));
        }
    },
    "map()" : {
        topic : function (item) {
            var obj = createDictionary({
                foo: 1,
                bar: 2,
                hashObject: createDictionary({
                    ahah : 3
                }),
                anonymous: {
                    ohoh : 3
                }
            });
            return obj;
        },
        'should map an empty dictionary': function () {
            var result = createDictionary().map(function (value, key) {});

            assert.ok(result instanceof dictionary.Dictionary);
            assert.deepEqual(result, createDictionary());
        },
        'should return a mapped dictionary' : function (topic) {
            var result = topic.map(function (value, key) {
                if (key === 'foo') {
                    return ['baz', value];
                }
                if (value === 2) {
                    return ['newKey', 3];
                }
            });

            assert.ok(result instanceof dictionary.Dictionary);
            assert.deepEqual(result, createDictionary({
                baz: 1,
                newKey: 3
            }));
        }
    }
});

exports.DictionaryTest = DictionaryTest;