/*jslint nodejs: true, indent:4 */
/**
 * IO module
 *
 * @module
 */
var core = require('./core');
var promise = require('./promise'),
    defer = promise.defer;

/*******************************************************************************
 * Reader class
 *
 * Usage:
 * <pre>
 * var reader = new Reader(myStream);
 *
 * reader.read().then(function (content) {
 *      //...some code here
 * });
 * </pre>
 *
 * @class
 ******************************************************************************/
var Reader = core.class('Reader', {
    /**
     * Reader constructor
     *
     * @constructor
     * @param {Stream} _stream
     */
    initialize: function (_stream, charset) {
        charset = charset || 'binary';

        var self = this,
            //started = defer(),
            finished = defer();

        if (_stream.setEncoding) {
            _stream.setEncoding(charset);
        }

        this._stream = _stream;
        //this.started = started;
        this._finished = finished;
        this._chunks = [];
        this._receiver = null;

        // prevent indefinite buffering; resume on demand
        //_stream.pause();

        _stream.on('error', function (reason) {
            finished.emitError(reason);
        });

        _stream.on('end', function () {
            //started.emitSuccess(self);
            finished.emitSuccess();
        });

        _stream.on('data', function (chunk) {
            //started.emitSuccess(self);
            finished.progress(chunk);
            if (self._receiver) {
                self._receiver(chunk);
            } else {
                self._chunks.push(chunk);
            }
        });
    },

    /**
     * Destructor
     */
    finalize: function () {
        try {
            this._finished.emitError();
        } catch (e) {
            //Do nothing
        }
    },

    /**
     * Return true if stream is readable
     *
     * @return {boolean}
     */
    isValid: function () {
        return this._stream.readable;
    },

    /**
     * Reads all of the remaining data from the stream.
     *
     * @returns {Promise} emit String containing the complete string content.
     */
    read: function () {
        //_stream.resume();
        /*var self = this,
            deferred = defer();
        self._receiver = null;
        this._finished.then(function () {
            deferred.resolve(self._consume());
        });
        return deferred.promise;*/
        var self = this;
        self._receiver = null;
        return this._finished.then(function () {
            return self._consume();
        });
    },

    /**
     * Reads and writes all of the remaining data from the
     * stream in chunks.
     *
     * @param {Function(Promise * String)} writeFunction called on each chunk of input from this stream.
     * @returns {Promise} emit chunk when input is read.
     */
    forEach: function (writeFunction) {
        var self = this,
            chunks = this._chunks;

        //_stream.resume();
        if (chunks && chunks.length) {
            writeFunction(this._consume());
        }
        self._receiver = writeFunction;
        return this._finished.then(function () {
            self._receiver = null;
        });
    },

    _consume: function () {
        var result = this._chunks.join('');
        this._chunks = [];
        return result;
    }
});

/*******************************************************************************
 * Writer class
 *
 * Usage:
 * <pre>
 * var writer = new Writer(myStream);
 *
 * writer.write('start').then(function () {
 *      return writer.write('/line1\n');
 * }).then(function () {
 *      return writer.write('/line2\n');
 * }).then(function () {
 *      return writer.write('/the end!');
 * });
 * </pre>
 *
 * @class
 ******************************************************************************/
var Writer = core.class('Writer', {

    /**
     * Writer constructor
     *
     * @constructor
     * @param {Stream} _stream
     */
    initialize: function (_stream) {
        if (_stream.setEncoding) {
            _stream.setEncoding('binary');
        }

        var self = this,
            started = defer(),
            finished = defer();

        this._stream = _stream;
        this._finished = finished;
        this._drained = defer();

        _stream.on('error', function (reason) {
            finished.emitError(reason);
        });

        _stream.on('drain', function () {
            //started.emitSuccess(self);
            self._drained.emitSuccess();
            self._drained = defer();
        });

        _stream.on('end', function () {
            //started.resolve(self);
            finished.emitSuccess();
        });
    },

    /**
     * Destructor
     */
    finalize: function () {
        this.close();
        this.callSuper();
    },

    /**
     * Return true if stream is writable
     *
     * @return {boolean}
     */
    isValid: function () {
        return this._stream.writable;
    },

    /**
     * Writes content to the stream.
     * @param {String} content
     * @returns {Promise * Undefined} a promise that will
     * be resolved when the buffer is empty, meaning
     * that all of the content has been sent.
     */
    write: function (content) {
        var stream = this._stream,
            deferred;

        //If not writable return errored promise
        if (!stream.writable) {
            deferred = defer();
            deferred.emitError(new core.Error({
                code: 'stream-error',
                message: 'Stream is not writable'
            }));
            return deferred;
        }

        if (!stream.write(content)) {
            return this._drained;
        } else {
            deferred = defer();
            deferred.emitSuccess(true);
            return deferred;
        }
    },

    /**
     * Waits for all data to flush on the stream.
     *
     * @returns {Promise * Undefined} a promise that will be resolved when the buffer is empty
     */
    flush: function () {
        return this._drained;
    },

    /**
     * Closes the stream, waiting for the internal buffer
     * to flush.
     *
     * @returns {Promise * Undefined} a promise that will
     * be resolved when the stream has finished writing,
     * flushing, and closed.
     */
    close: function () {
        this._stream.end();
        return this._finished;
    }

});

/**
 * Exports
 */
exports.Reader = Reader;
exports.Writer = Writer;
exports.read = function (_stream) {
    return (new Reader(_stream));
};
exports.write = function (_stream) {
    return (new Writer(_stream));
};