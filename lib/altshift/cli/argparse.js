/*jslint nodejs:true, indent:4, onevar:false */
/**
 * Object for parsing command line strings into Javascript objects.
 *
 * Keyword Arguments:
 * <ul>
 * <li>program -- The name of the program (default:process.argv[0])</li>
 * <li>usage -- A usage message (default: auto-generated from arguments)</li>
 * <li>description -- A description of what the program does</li>
 * <li>epilog -- Text following the argument descriptions</li>
 * <li>parents -- Parsers whose arguments should be copied into this one</li>
 * <li>formatterClass -- HelpFormatter class for printing help messages</li>
 * <li>prefixChars -- Characters that prefix optional arguments</li>
 * <li>prefixCharsFile -- Characters that prefix files containing additional arguments</li>
 * <li>argumentDefault -- The default value for all arguments</li>
 * <li>conflictHandler -- String indicating how to handle conflicts</li>
 * <li>addHelp -- Add a -h/-help option</li>
 * </ul>
 */

/**
 * Imports
 */
var core = require('../core'),
    mixin = core.mixin,
    forEach = core.forEach,
    isFunction  = core.isFunction,
    SystemExit = core.SystemExit,
    FUNCTION_IDENTITY = core.FUNCTION_IDENTITY;
var fs = require('fs');

/**
 * Utils methods
 */
function contains(array, el) {
    return array.indexOf(el) >= 0;
}

var $stringRepeat = function (string, count) {
    return count < 1 ? '': new Array(count + 1).join(string);
};

var $stringLStrip = function (string, chars) {
    chars = chars || "\\s";
    return string.replace(new RegExp("^[" + chars + "]+", "g"), "");
};

var $stringRStrip = function (string, chars) {
    chars = chars || "\\s";
    return string.replace(new RegExp("[" + chars + "]+$", "g"), "");
};

var $stringStrip = function (string, chars) {
    return $stringLStrip($stringRStrip(string, chars), chars);
};

var $stringPrint = function (string, obj) {
    var tag = '%',
        result = string.substring(),
        property;
    obj = obj || {};
    for (property in obj) {
        if (obj.hasOwnProperty(property)) {
            result = result.replace(tag + property + tag, '' + obj[property]);
        }
    }
    return result;
};

var _ = function (string) {
    return string;
};

/**
 * Constants
 */
/** @const */
var EOL = '\n';
/** @const */
var SUPPRESS = '==SUPPRESS==';
/** @const */
var OPTIONAL = '?';
/** @const */
var ZERO_OR_MORE = '*';
/** @const */
var ONE_OR_MORE = '+';
/** @const */
var PARSER = 'A...';
/** @const */
var REMAINDER = '...';

var ArgumentParser, ArgumentGroup, ArgumentGroupMutex;

/**
 * An error from creating or using an argument (optional or positional). The
 * string value of this exception is the message, augmented with information
 * about the argument that caused it.
 *
 * @class
 * @extends core.Error
 */
var ArgumentError = core.class('ArgumentError', core.Error, {
    code: 'argument-error',
    message: '%(message)',

    /**
     * @constructor
     * @param {Object} options
     */
    initialize: function (options) {
        this.callSuper(options);

        if (this.argument.getName) {
            this.argumentName = this.argument.getName();
        } else {
            this.argumentName = '' + this.argument;
        }
    },

    /**
     * @return {String}
     */
    getMessage: function () {
        this.__message__ = this.argumentName === undefined ? '%(message)': 'argument "%(argumentName)": %(message)';

        return this.callSuper();
    }
});

/**
 * Formatting Help
 */

/**
 * Internal Section class
 *
 * @class
 */
var HelpSection = core.class('HelpSection', {
    /**
     * HelpSection constructor
     *
     * @constructor
     */
    initialize: function (formatter, parent, heading) {
        this.formatter = formatter;
        this.parent = parent;
        this.heading = heading;
        this.items = [];
    },

    addItem: function (callback) {
        this.items.push(callback);
        return this;
    },

    formatHelp: function () {
        var itemHelp, heading;

        // format the indented section
        if (this.parent) {
            this.formatter._indent();
        }

        itemHelp = this.items.map(function (item) {
            return item();
        });
        itemHelp = this.formatter._joinParts(itemHelp);

        if (this.parent) {
            this.formatter._dedent();
        }

        // return nothing if the section was empty
        if (!itemHelp) {
            return '';
        }

        // add the heading if the section was non-empty
        heading = (this.heading && this.heading !== SUPPRESS) ?
            $stringRepeat(' ', this.formatter.indentationCurrent) + this.heading + ':' + EOL :
            '';

        // join the section-initialize newline, the heading and the help
        return this.formatter._joinParts([EOL, heading, itemHelp, EOL]);
    }
});

/**
 * Formatter for generating usage messages and argument help strings. Only the
 * name of this class is considered a public API. All the methods provided by
 * the class are considered an implementation detail.
 *
 * @class
 */
var HelpFormatter = core.class('HelpFormatter', {
    /*include: [core.ConstantScope],
    extend: {

    },*/

    /**
     * @constructor
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }

        this.program = options.program;

        this.indentation = options.indentation || 2;
        this.indentationCurrent = 0;
        this.indentationLevel = 0;

        this.helpPositionMax = options.helpPositionMax || 24;
        this.width = (options.width || ((process.env.COLUMNS || 80) - 2));

        this.actionLengthMax = 0;

        this.sectionRoot = new HelpSection(this);
        this.sectionCurrent = this.sectionRoot;

        this._regexpWhitespace = new RegExp('\\s+');
        this._regexpLongBreak = new RegExp(EOL + EOL + EOL + '+');
    },


    /**
     * Message building methods
     */
    startSection: function (/* string */ heading) {
        var self = this;
        this._indent();
        this.sectionCurrent = new HelpSection(this, this.sectionCurrent, heading);
        this._addItem(function () {
            return self._sectionCurrent.formatHelp();
        });
        return this;
    },

    endSection: function () {
        this.sectionCurrent = this.sectionCurrent.parent;
        this._dedent();
        return this;
    },

    addText: function (/* string */ text) {
        var self = this;
        if (text && text !== SUPPRESS) {
            this._addItem(function () {
                return self._formatText(text);
            });
        }
        return this;
    },

    addUsage: function (/* string */ usage, actions, groups, /* string */ prefix) {
        if (usage !== SUPPRESS) {
            var self = this;
            this._addItem(function () {
                return self._formatUsage(usage, actions, groups, prefix);
            });
        }
        return this;
    },

    addArgument: function (action) {
        if (action.help !== SUPPRESS) {

            // find all invocations
            var self = this,
                invocations = [this._formatActionInvocation(action)],
                invocationLength = invocations[0].length,
                actionLength;

            if (action._getSubactions !== undefined) {
                this._indent();
                forEach(action._getSubactions(), function (subaction) {

                    var invocationNew = this._formatActionInvocation(subaction);
                    invocations.push(invocationNew);
                    invocationLength = Math.max(invocationLength, invocationNew.length);

                }, this);
                this._dedent();
            }

            // update the maximum item length
            actionLength = invocationLength + this.indentationCurrent;
            this.actionLengthMax = Math.max(this.actionLengthMax, actionLength);

            // add the item to the list
            this._addItem(function () {
                return self._formatAction(action);
            });
        }
        return this;
    },

    /**
     *
     * @param {Array} actions
     * @return this
     */
    addArguments: function (actions) {
        forEach(actions, function (action) {
            this.addArgument(action);
        }, this);
        return this;
    },

    /**
     * Help-formatting methods
     */
    formatHelp: function () {
        var help = this.sectionRoot.formatHelp();
        if (help) {
            help = help.replace(this._regexpLongBreak, EOL + EOL);
            help = $stringStrip(help, EOL) + EOL;
        }
        return help;
    },



    _indent: function () {
        this.indentationCurrent += this.indentation;
        this.indentationLevel += 1;
        return this;
    },

    _dedent: function () {
        this.indentationCurrent -= this.indentation;
        this.indentationLevel -= 1;
        if (this.indentationCurrent < 0) {
            throw new Error('Indent decreased below 0.');
        }
        return this;
    },

    _addItem: function (callback) {
        this.sectionCurrent.addItem(callback);
        return this;
    },

    _joinParts: function (partStrings) {
        return partStrings.filter(function (part) {
            return (part && part !== SUPPRESS);
        }).join('');
    },

    _formatUsage: function (/* string */ usage, actions, groups, /* string */ prefix) {
        prefix = prefix || _('usage: ');
        actions = actions || [];
        groups = groups || [];


        // if usage is specified, use that
        if (usage) {
            usage = $stringPrint(usage, {program: this.program});

            // if no optionals or positionals are available, usage is just prog
        } else if (!usage && actions.length === 0) {
            usage = '' + (this.program || '');

            // if optionals and positionals are available, calculate usage
        } else if (!usage) {
            var program = '' + (this.program || ''),
                optionals = [],
                positionals = [],
                actionUsage,
                usageString = '',
                textWidth;

            // split optionals from positionals
            forEach(actions, function (action) {
                if (action.isOptional()) {
                    optionals.push(action);
                } else {
                    positionals.push(action);
                }
            });

            // build full usage string
            actionUsage = this._formatActionsUsage([].concat(optionals, positionals), groups);
            usageString = '';
            if (program) {
                usageString += program + ' ';
            }
            if (actionUsage) {
                usageString += actionUsage;
            }
            usage = usageString;

            // wrap the usage parts if it's too long
            textWidth = this.width - this.indentationCurrent;
            if ((prefix.length + usage.length) > textWidth) {

                // break usage into wrappable parts
                var regexpPart = new RegExp('\\(.*?\\)+|\\[.*?\\]+|\\S+'),
                    optionalUsage = this._formatActionsUsage(optionals, groups),
                    positionalUsage = this._formatActionsUsage(positionals, groups),
                    optionalParts = optionalUsage.match(regexpPart),
                    positionalParts = positionalUsage.match(regexpPart),
                // assert.equal(optionalParts.join(' '), optionalUsage);
                // assert.equal(positionalParts.join(' '), positionalUsage);

                    // helper for wrapping lines
                    __getLines = function (parts, indent, prefix) {
                        var lines = [],
                            line = [],
                            lineLength = prefix ? prefix.length - 1: indent.length - 1;

                        forEach(parts, function (part) {
                            if (lineLength + 1 + part.length > textWidth) {
                                lines.push(indent + line.join(' '));
                                line = [];
                                lineLength = indent.length - 1;
                            }
                            line.push(part);
                            lineLength += part.length + 1;
                        });

                        if (line) {
                            lines.push(indent + line.join(' '));
                        }
                        if (prefix) {
                            lines[0] = lines[0].substr(indent.length);
                        }
                        return lines;
                    };

                var lines, indent, parts;
                // if prog is short, follow it with optionals or positionals
                if (prefix.length + program.length <= 0.75 * textWidth) {
                    indent = $stringRepeat(' ', (prefix.length + program.length + 1));
                    if (optionalParts) {
                        lines = [].concat(
                           __getLines([program].concat(optionalParts), indent, prefix),
                           __getLines(positionalParts, indent)
                        );
                    } else if (positionalParts) {
                        lines = __getLines([program].concat(positionalParts), indent, prefix);
                    } else {
                        lines = [program];
                    }

                // if prog is long, put it on its own line
                } else {
                    indent = $stringRepeat(' ', prefix.length);
                    parts = optionalParts + positionalParts;
                    lines = __getLines(parts, indent);
                    if (lines.length > 1) {
                        lines = [].concat(
                            __getLines(optionalParts, indent),
                            __getLines(positionalParts, indent)
                        );
                    }
                    lines = [program] + lines;
                }
                // join lines into usage
                usage = lines.join(EOL);
            }
        }

        // prefix with 'usage:'
        return prefix + usage + EOL + EOL;
    },

    _formatActionsUsage: function (actions, groups) {
        // find group indices and identify actions in groups
        var groupActions = [],
            inserts = [],
            parts = [];

        forEach(groups, function (group) {
            var start = actions.indexOf(group._groupActions[0]),
                end, i;
            if (start >= 0) {
                end = start + group._groupActions.length;

                if (actions.slice(start, end) === group._groupActions) {
                    group._groupActions.forEach(function (action) {
                        groupActions.add(action);
                    });

                    if (!group.required) {
                        inserts[start] = '[';
                        inserts[end] = ']';
                    } else {
                        inserts[start] = '(';
                        inserts[end] = ')';
                    }
                    for (i = start + 1; i < end; i += 1) {
                        inserts[i] = '|';
                    }
                }
            }
        }, this);

        // collect all actions format strings
        forEach(actions, function (action, actionIndex) {
            var part,
                optionString,
                argsDefault,
                argsString;

            // suppressed arguments are marked with None
            // remove | separators for suppressed arguments
            if (action.help === SUPPRESS) {
                parts.push(null);
                if (inserts[actionIndex] === '|') {
                    inserts.splice(actionIndex);
                } else if (inserts[actionIndex + 1] === '|') {
                    inserts.splice(actionIndex + 1);
                }

            // produce all arg strings
            } else if (action.isPositional()) {
                part = this._formatArgs(action, action.destination);

                // if it's in a group, strip the outer []
                if (contains(groupActions, action)) {
                    if (part[0] === '[' && part[part.length - 1] === ']') {
                        part = part.slice(1, -1);
                    }
                }
                // add the action string to the list
                parts.push(part);

            // produce the first way to invoke the option in brackets
            } else {
                optionString = action.optionStrings[0];

                // if the Optional doesn't take a value, format is: -s or --long
                if (action.nargs === 0) {
                    part = '' + optionString;

                // if the Optional takes a value, format is: -s ARGS or --long ARGS
                } else {
                    argsDefault = action.destination.toUpperCase();
                    argsString = this._formatArgs(action, argsDefault);
                    part = optionString + ' ' + argsString;
                }
                // make it look optional if it's not required or in a group
                if (!action.required && !contains(groupActions, action)) {
                    part = '[' + part + ']';
                }
                // add the action string to the list
                parts.push(part);
            }
        }, this);

        // insert things at the necessary indices
        forEach(inserts.reverse(), function (insert, insertIndex) {
            parts = parts.slice(0, insertIndex).concat([insert], parts.slice(insertIndex + 1, parts.length - 1));
        });

        // join all the action items with spaces
        var text = parts.filter(
            function (part) {
                return !! part;
            }
        ).join(' ');

        // clean up separators for mutually exclusive groups
        var regexpOpen = '[\\[(]',
            regexpClose = '[\\])]';
        text = text.replace('(' + regexpOpen + ') ', '\\1');
        text = text.replace(' (' + regexpClose + ')', '\\1');
        text = text.replace(regexpOpen + ' *' + regexpClose, '');
        text = text.replace('\\(([^|]*)\\)', '\\1');
        text = $stringStrip(text);

        // return the text
        return text;
    },

    _formatText: function (/* string */ text) {
        text = $stringPrint(text, {program:  this.program});
        var textWidth = this.width - this.indentationCurrent,
            indentation = $stringRepeat(' ', this.indentationCurrent);
        return this._fillText(text, textWidth, indentation) + EOL + EOL;
    },

    _formatAction: function (action) {
        // determine the required width and the entry label
        var helpPosition = Math.min(this.actionLengthMax + 2, this.helpPositionMax),
            helpWidth = this.width - helpPosition,
            helpText,
            helpLines,
            actionWidth = helpPosition - this.indentationCurrent - 2,
            actionHeader = this._formatActionInvocation(action),
            parts,
            indentFirst;

        // no help; start on same line and add a final newline
        if (!action.help) {
            actionHeader = $stringRepeat(' ', this.indentationCurrent) + actionHeader + EOL;

        // short action name; start on the same line and pad two spaces
        } else if (actionHeader.length <= actionWidth) {
            actionHeader = $stringRepeat(' ', this.indentationCurrent) + '-' + actionHeader + '  ';
            indentFirst = 0;

        // long action name; start on the next line
        } else {
            actionHeader = $stringRepeat(' ', this.indentationCurrent) + actionHeader + EOL;
            indentFirst = helpPosition;
        }
        // collect the pieces of the action help
        parts = [actionHeader];

        // if there was help for the action, add lines of help text
        if (action.help) {
            helpText = this._expandHelp(action);
            helpLines = this._splitLines(helpText, helpWidth);
            parts.push($stringRepeat(' ', indentFirst) + helpLines[0] + EOL);
            forEach(helpLines.slice(1), function (line) {
                parts.push($stringRepeat(' ', helpPosition) + line + EOL);
            });

            // or add a newline if the description doesn't end with one
        } else {
            var diff = actionHeader.length - EOL.length;
            if (!(diff >= 0 && actionHeader.indexOf(EOL, diff) === diff)) {
                parts.push(EOL);
            }
        }
        // if there are any sub-actions, add their help as well
        if (action._getSubactions !== undefined) {
            this._indent();
            forEach(action._getSubactions(), function (subaction) {
                parts.push(this._formatAction(subaction));
            }, this);
            this._dedent();
        }

        // return a single string
        return this._joinParts(parts);
    },

    _formatActionInvocation: function (action) {
        if (action.isPositional()) {
            return this._metavarFormatter(action, action.destination)(1);
        } else {
            var parts = [],
                argsDefault,
                argsString;

            // if the Optional doesn't take a value, format is: -s, --long
            if (action.nargs === 0) {
                parts = parts.concat(action.optionStrings);

                // if the Optional takes a value, format is: -s ARGS, --long ARGS
            } else {
                argsDefault = action.destination.toUpperCase();
                argsString = this._formatArgs(action, argsDefault);
                forEach(action.optionStrings, function (optionString) {
                    parts.push(optionString + ' ' + argsString);
                });
            }
            return parts.join(', ');
        }
    },

    _metavarFormatter: function (action, /* string */ metavarDefault) {
        var result,
            format;

        if (action.metavar) {
            result = action.metavar;
        } else if (action.choices) {
            result = '{' + action.choices.join(',') + '}';
        } else {
            result = metavarDefault;
        }
        return function (size) {
            if (Array.isArray(result)) {
                return result;
            } else {
                var metavars = [];
                for (var i = 0; i < size; i += 1) {
                    metavars.push(result);
                }
                return metavars;
            }
        };
    },

    _formatArgs: function (action, /* string */ metavarDefault) {
        var buildMetavar = this._metavarFormatter(action, metavarDefault),
            result,
            metavars;

        if (!action.nargs) {
            metavars = buildMetavar(1);
            result = '' + metavars[0];
        } else if (action.nargs === OPTIONAL) {
            metavars = buildMetavar(1);
            result = '[' + metavars[0] + ']';
        } else if (action.nargs === ZERO_OR_MORE) {
            metavars = buildMetavar(2);
            result = '[' + metavars[0] + '[' + metavars[1] + ' ...]]';
        } else if (action.nargs === ONE_OR_MORE) {
            metavars = buildMetavar(2);
            result = '' + metavars[0] + '[' + metavars[1] + ' ...]';
        } else if (action.nargs === REMAINDER) {
            result = '...';
        } else if (action.nargs === PARSER) {
            metavars = buildMetavar(1);
            result = metavars[0] + ' ...';
        } else {
            metavars = buildMetavar(action.nargs);
            result = metavars.join(' ');
        }
        return result;
    },

    _expandHelp: function (action) {
        var params = {},
            actionProperty,
            actionValue;
        params.program = this.program;

        for (actionProperty in action) {
            if (action.hasOwnProperty(actionProperty)) {
                actionValue = params[actionProperty];

                if (actionValue !== SUPPRESS) {
                    params[actionProperty] = actionValue;
                }
            }
        }

        if (params.choices) {
            params.choices = params.choices.join(', ');
        }

        /*
         * for name in list(params): if hasattr(params[name], '__name__'):
         * params[name] = params[name].__name__
         */

        return $stringPrint(this._getHelpString(action), params);
    },

    _splitLines: function (/* string */ text, /* int */ width) {
        var lines = [],
            wrapped;

        text = text.replace(this._regexpWhitespace, ' ');
        text = $stringStrip(text).split(EOL);
        forEach(text, function (line) {
            var wrapStart = 0,
                wrapEnd = width;
            while (wrapStart < line.length) {
                wrapped = line.split(wrapStart, wrapEnd);
                lines.push(wrapped);
                wrapStart += width;
                wrapEnd += width;
            }
        });

        return lines;
    },

    _fillText: function (/* string */ text, /* int */ width, /* string */ indent) {
        return this._splitLines(text, width).map(function (line) {
            return indent + line;
        }).join(EOL);
    },

    _getHelpString: function (action) {
        return action.help;
    }
});

/**
 * Help message formatter which retains any formatting in descriptions. Only the
 * name of this class is considered a public API. All the methods provided by
 * the class are considered an implementation detail.
 *
 * @class
 * @extends HelpFormatter
 */
var HelpFormatterRawDescription = core.class('HelpFormatterRawDescription', HelpFormatter, {
    _fillText: function (text, width, indent) {
        return text.split(EOL).map(function (line) {
            return indent + line;
        }).join(EOL);
    }
});

/**
 * Help message formatter which retains formatting of all help text. Only the
 * name of this class is considered a public API. All the methods provided by
 * the class are considered an implementation detail.
 *
 * @class
 * @extends HelpFormatterRawDescription
 */
var HelpFormatterRawText = core.class('HelpFormatterRawText', HelpFormatterRawDescription, {
    _splitLines: function (text, width) {
        return text.split(EOL);
    }
});

/**
 * Help message formatter which adds default values to argument help. Only the
 * name of this class is considered a public API. All the methods provided by
 * the class are considered an implementation detail.
 *
 * @class
 * @extends HelpFormatter
 */
var HelpFormatterArgumentDefaults = core.class('HelpFormatterArgumentDefaults', HelpFormatter, {
    _getHelpString: function (action) {
        var help = action.help;
        if (contains(action.help, '%(default)') &&
            action.defaultValue !== SUPPRESS &&
            (action.isOptional() || !contains([OPTIONAL, ZERO_OR_MORE], action.nargs))
        ) {
            help += ' (default: %(default)s)';
        }
        return help;
    }
});


/*******************************************************************************
 * Actions classes
 ******************************************************************************/
/**
 * Information about how to convert command line strings to Javascript objects.
 * Action objects are used by an ArgumentParser to represent the information
 * needed to parse a single argument from one or more strings from the command
 * line. The keyword arguments to the Action constructor are also all attributes
 * of Action instances.
 *
 * @class
 */
var Action = core.class('Action', {
    /**
     *
     * Keyword Arguments:
     *
     *  - optionStrings -- A list of command-line option strings for the action.
     *  - destination -- Attribute to hold the created object(s)
     *  - nargs -- The number of command-line arguments that should be consumed.
     * By default, one argument will be consumed and a single value will be
     * produced. Other values include:
     * <ul>
     * - N (an integer) consumes N arguments (and produces a list)
     * - '?' consumes zero or one arguments
     * - '*' consumes zero or more arguments (and produces a list)
     * - '+' consumes one or more arguments (and produces a list)
     * Note that the difference between the default and nargs=1 is that with the
     * default, a single value will be produced, while with nargs=1, a list
     * containing a single value will be produced.
     * </ul>
     *  - constant -- Default value for an action with no value.
     *  - defaultValue -- The value to be produced if the option is not specified.
     *  - type -- Cast to 'string'|'int'|'float'|'complex'|function (string). If not set, 'string'.
     *  - choices -- The choices available.
     *  - required -- True if the action must always be specified at the command line.
     *  - help -- The help describing the argument.
     *  - metavar -- The name to be used for the option's argument with the help
     * string. If not set, the 'destination' value will be used as the name.
     * </ul>
     *
     * @constructor
     * @param {Object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        this.optionStrings = [];
        this.destination = options.destination;
        this.nargs = undefined;
        this.constant = options.constant;
        this.defaultValue = options.defaultValue;
        this.type = null;
        this.choices = options.choices;
        this.required = false;
        this.help = '';
        this.metavar = options.metavar;

        this.configure(options);
    },

    configure: function (options) {
        mixin(this, options || {});

        if (!(this.optionStrings instanceof Array)) {
            throw new Error('optionStrings should be an array');
        }
        if (this.required !== undefined && typeof(this.required) !== 'boolean') {
            throw new Error('required should be a boolean');
        }
        /*
         * TODO: check nargs value
         * if (this.nargs !== undefined && typeof(this.nargs) !== 'number') {
            throw new Error('nargs should be a number');
        }*/
    },

    /**
     * Return the name
     *
     * @return {string}
     */
    getName: function () {
        if (this.optionStrings.length > 0) {
            return this.optionStrings.join('/');
        } else if (this.metavar !== undefined && this.metavar !== SUPPRESS) {
            return this.metavar;
        } else if (this.destination !== undefined && this.destination !== SUPPRESS) {
            return this.destination;
        }
        return null;
    },

    /**
     * Return true if optional
     *
     * @return {boolean}
     */
    isOptional: function () {
        return !this.isPositional();
    },

    /**
     * Return true if positional
     *
     * @return {boolean}
     */
    isPositional: function () {
        return (this.optionStrings.length === 0);
    },

    /**
     * Call the action
     *
     * @param {ArgumentParser} parser
     * @param {Namespace} namespace
     * @param {Array} values
     * @param {Array} optionString
     * @return
     */
    call: function (parser, namespace, values, optionString) {
        throw new Error(_('.call() not defined'));// Not Implemented error
    }
});

/**
 * ActionStore
 *
 * @class
 * @extends Action
 */
var ActionStore = core.class('ActionStore', Action, {
    /**
     * ActionStore constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        this.callSuper(options);
        if (this.nargs <= 0) {
            throw new Error('nargs for store actions must be > 0; if you ' +
                    'have nothing to store, actions such as store ' +
                    'true or store const may be more appropriate');// ValueError

        }
        if (this.constant !== undefined && this.nargs !== OPTIONAL) {
            throw new Error('nargs must be OPTIONAL to supply const');// ValueError
        }
    },
    call: function (parser, namespace, values, optionString) {
        namespace.set(this.destination, values);
    }
});

/**
 * ActionStoreConstant
 *
 * @class
 * @extends Action
 */
var ActionStoreConstant = core.class('ActionStoreConstant', Action, {
    /**
     * ActionStoreConstant constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        options.nargs = 0;
        this.callSuper(options);
    },
    call: function (parser, namespace, values, optionString) {
        namespace.set(this.destination, this.constant);
    }
});

/**
 * ActionStoreTrue
 *
 * @class
 * @extends ActionStoreConstant
 */
var ActionStoreTrue = core.class('ActionStoreTrue', ActionStoreConstant, {
    /**
     * ActionStoreTrue constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        options.constant = true;
        options.defaultValue = options.defaultValue !== undefined ?  options.defaultValue: false;
        this.callSuper(options);
    }
});

/**
 * ActionStoreFalse
 *
 * @class
 * @extends ActionStoreConstant
 */
var ActionStoreFalse = core.class('ActionStoreFalse', ActionStoreConstant, {
    /**
     * ActionStoreFalse constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        options.constant = false;
        options.defaultValue = options.defaultValue !== undefined ?  options.defaultValue: true;
        this.callSuper(options);
    }
});

/**
 * ActionAppend
 *
 * @class
 * @extends Action
 */
var ActionAppend = core.class('ActionAppend', Action, {
    /**
     * ActionAppend constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        this.callSuper(options);
        if (this.nargs <= 0) {
            throw new Error('nargs for append actions must be > 0; if arg ' +
                    'strings are not supplying the value to append, ' +
                    'the append const action may be more appropriate');// ValueError
        }
        if (this.constant !== undefined && this.nargs !== OPTIONAL) {
            throw new Error('nargs must be OPTIONAL to supply const');// ValueError
        }
    },
    call: function (parser, namespace, values, optionString) {
        var items = [].concat(namespace.get(this.destination) || [], values);
        namespace.set(this.destination, items);
    }
});

/**
 * ActionAppendConstant
 *
 * @class
 * @extends Action
 */
var ActionAppendConstant = core.class('ActionAppendConstant', Action, {
    /**
     * ActionAppendConstant constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        options.nargs = 0;
        this.callSuper(options);
    },
    call: function (parser, namespace, values, optionString) {
        var items = namespace.get(this.destination) || [];
        items.push(this.constant);
        namespace.set(this.destination, items);
    }
});

/**
 * ActionCount
 *
 * @class
 * @extends Action
 */
var ActionCount = core.class('ActionCount', Action, {
    /**
     * ActionCount constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        options.nargs = 0;
        this.callSuper(options);
    },
    call: function (parser, namespace, values, optionString) {
        namespace.set(this.destination, (namespace.get(this.destination) || 0) + 1);
    }
});

/**
 * ActionHelp
 *
 * @class
 * @extends Action
 */
var ActionHelp = core.class('ActionHelp', Action, {
    /**
     * ActionHelp constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        options.defaulValue = (options.defaultValue !== undefined ? options.defaultValue: SUPPRESS);
        options.destination = (options.destination !== undefined ? options.destination: SUPPRESS);
        options.nargs = 0;
        this.callSuper(options);
    },
    call: function (parser, namespace, values, optionString) {
        parser.printHelp();
        parser.exit();
    }
});

/**
 * ActionVersion
 *
 * @class
 * @extends Action
 */
var ActionVersion = core.class('ActionVersion', Action, {
    /**
     * ActionVersion constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        options.defaultValue = (options.defaultValue !== undefined ? options.defaultValue: SUPPRESS);
        options.destination = (options.destination || SUPPRESS);
        options.nargs = 0;
        this.callSuper(options);
        this.version = options.version;
    },
    call: function (parser, namespace, values, optionString) {
        var version = this.version || parser.version,
            formatter = parser._getFormatter();
        formatter.addText(version);
        parser.exit(0, formatter.formatHelp());
    }
});

/**
 * ActionSubparser
 *
 * @class
 * @extends Action
 */
var ActionSubparser = core.class('ActionSubparser', Action, {
    /**
     * ActionVersion constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        options.destination = options.destination || SUPPRESS;
        options.nargs = PARSER;

        this._programPrefix = options.program;
        this._parserClass = options.parserClass || ArgumentParser;
        this._nameParserMap = {};
        this._choicesActions = [];

        options.choices = this._nameParserMap;
        this.callSuper(options);
    },

    addParser: function (name, options) {
        var parser, help, choiceAction;

        // set program from the existing prefix
        if (options.program === undefined) {
            options.program = this._programPrefix + ' ' + name;
        }

        // create a pseudo-action to hold the choice help
        if (options.help !== undefined) {
            help = options.help;
            delete options.help;

            choiceAction = this._ChoicesPseudoAction(name, help);
            this._choicesActions.push(choiceAction);
        }

        // create the parser and add it to the map
        parser = new this._parserClass(options);
        this._nameParserMap[name] = parser;
        return parser;
    },

    _getSubactions: function () {
        return this._choicesActions;
    },

    call: function (parser, namespace, values, optionString) {
        var parserName = values[0],
            argStrings = values.slice(1);

        // set the parser name if requested
        if (this.destination !== SUPPRESS) {
            namespace.set(this.destination, parserName);
        }

        // select the parser
        if (this._nameParserMap[parserName] !== undefined) {
            parser = this._nameParserMap[parserName];
        } else {
            throw new ArgumentError({
                argument: this,
                message: $stringPrint(_('Unknown parser "%name%" (choices: [%choices%]).', {
                    name: parserName,
                    choices: this._nameParserMap.join(', ')
                }))
            });
        }

        // parse all the remaining options into the namespace
        parser.parseArgs(argStrings, namespace);
    }
});

/*
 * class _ChoicesPseudoAction(Action):
 *
 * def __init__(this, name, help): sup =
 * super(ActionSubparser._ChoicesPseudoAction, this)
 * sup.__init__(optionStrings=[], dest=name, help=help)
 */

/**
 * Simple object for storing attributes. Implements equality by attribute names
 * and values, and provides a simple string representation.
 *
 * @class
 * @extends Dictionary
 */
var Namespace = core.class('Namespace', core.Dictionary);

/**
 * ActionContainer class
 *
 * @class
 */
var ActionContainer = core.class('ActionContainer', {
    /**
     * ActionContainer constructor
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }

        this.description = options.description;
        this.argumentDefault = options.argumentDefault;
        this.prefixChars = options.prefixChars || '';
        this.conflictHandler = options.conflictHandler || 'error';

        // set up registries
        this._registries = {};

        // register actions
        this.register('action', null, ActionStore);
        this.register('action', 'store', ActionStore);
        this.register('action', 'storeConstant', ActionStoreConstant);
        this.register('action', 'storeTrue', ActionStoreTrue);
        this.register('action', 'storeFalse', ActionStoreFalse);
        this.register('action', 'append', ActionAppend);
        this.register('action', 'appendConstant', ActionAppendConstant);
        this.register('action', 'count', ActionCount);
        this.register('action', 'help', ActionHelp);
        this.register('action', 'version', ActionVersion);
        this.register('action', 'parsers', ActionSubparser);

        // throw an exception if the conflict handler is invalid
        this._getHandler();

        // action storage
        this._actions = [];
        this._optionStringActions = {};

        // groups
        this._actionGroups = [];
        this._actionGroupsMutex = [];

        // defaults storage
        this._defaults = {};

        // determines whether an "option" looks like a negative number
        this._regexpNegativeNumber = new RegExp('^-\\d+$|^-\\d*\\.\\d+$');

        // whether or not there are any optionals that look like negative
        // numbers -- uses a list so it can be shared and edited
        this._hasNegativeNumberOptionals = [];
    },

    /**
     * Registration methods
     *
     * @param {String} registryName
     * @return this
     */
    register: function (registryName, value, object) {
        this._registries[registryName] = this._registries[registryName] || {};
        this._registries[registryName][value] = object;
        return this;
    },
    _registryGet: function (registryName, value, defaultValue) {
        return this._registries[registryName][value] || defaultValue;
    },

    /**
     * Namespace default accessor methods
     *
     * @param {Object} options
     * @return this
     */
    setDefaults: function (options) {
        mixin(this._defaults, options || {});

        // if these defaults match any existing arguments, replace the previous
        // default on the object with the new one
        forEach(this._actions, function (action) {
            if (contains(options, action.destination)) {
                action.defaultValue = options[action.destination];
            }
        });
        return this;
    },

    getDefault: function (destination) {
        var actions = this._actions,
            actionLength = actions.length,
            action,
            actionIndex;

        for (actionIndex = 0 ; actionIndex < actionLength; actionIndex += 1) {
            action = actions[actionIndex];
            if (action.destination === destination && action.defaultValue !== undefined) {
                return action.defaultValue;
            }
        }
        return this._defaults[destination];
    },

    /**
     * Adding argument actions
     */
    /**
     * addArgument([dest, ...], {name:value, ...}) addArgument(optionString,
     * optionString, ..., name=value, ...)
     */
    addArgument: function (args, kwargs) {
        args = args || [];
        kwargs = kwargs || {};

        // if no positional args are supplied or only one is supplied and
        // it doesn't look like an option string, parse a positional argument
        if (!args || args.length === 1 && !contains(this.prefixChars, args[0][0])) {
            if (args && kwargs.destination !== undefined) {
                throw new Error('destination supplied twice for positional argument');// ValueError
            }
            kwargs = this._getPositionalKwargs(args, kwargs);

            // otherwise, we're adding an optional argument
        } else {
            kwargs = this._getOptionalKwargs(args, kwargs);
        }

        // if no default was supplied, use the parser-level default
        if (kwargs.defaultValue === undefined) {
            var destination = kwargs.destination;
            if (this._defaults[destination] !== undefined) {
                kwargs.defaultValue = this._defaults[destination];
            } else if (this.argumentDefault !== undefined) {
                kwargs.defaultValue = this.argumentDefault;
            }
        }

        // create the action object, and add it to the parser
        var actionClass = this._popActionClass(kwargs);
        if (!isFunction(actionClass)) {
            throw new Error($stringPrint('Unknown action "%action%".', {action: actionClass}));// ValueError
        }
        var action = new actionClass(kwargs);


        // throw an error if the action type is not callable
        var typeFunction = this._registryGet('type', action.type, action.type);
        if (!isFunction(typeFunction)) {
            throw new Error($stringPrint('"%function%" is not callable', {'function': typeFunction}));
        }

        return this._addAction(action);
    },

    /**
     * Add a new argument group
     *
     * @param {Object} options
     * @param {boolean} mutuallyExclusive
     * @return {ArgumentGroup}
     */
    addArgumentGroup: function (options, mutuallyExclusive) {
        var group;
        mutuallyExclusive = (mutuallyExclusive || false);
        if (mutuallyExclusive) {
            group = new ArgumentGroupMutex(this, options);
            this._actionGroupsMutex.push(group);
        } else {
            group = new ArgumentGroup(this, options);
            this._actionGroups.push(group);
        }
        return group;
    },

    _addAction: function (action) {

        // resolve any conflicts
        this._checkConflict(action);

        // add to actions list
        this._actions.push(action);
        action.container = this;

        // index the action by any option strings it has
        action.optionStrings.forEach(function (optionString) {
            this._optionStringActions[optionString] = action;
        }, this);

        // set the flag if any option strings look like negative numbers
        action.optionStrings.forEach(function (optionString) {
            if (optionString.match(this._regexpNegativeNumber)) {
                if (!this._hasNegativeNumberOptionals) {
                    this._hasNegativeNumberOptionals.push(true);
                }
            }
        }, this);

        // return the created action
        return action;
    },

    _removeAction: function (action) {
        this._actions.splice(this._actions.indexOf(action));
    },

    _addContainerActions: function (container) {

        // collect groups by titles
        var titleGroupMap = {};
        forEach(this._actionGroups, function (group) {
            if (contains(titleGroupMap, group.title)) {
                throw new Error($stringPrint(_('Cannot merge actions - two groups are named "%title%".'), group));// ValueError
            }
            titleGroupMap[group.title] = group;
        });

        // map each action to its group
        var groupMap = {};
        forEach(container._actionGroups, function (group) {
            // if a group with the title exists, use that, otherwise
            // create a new group matching the container's group
            if (!contains(titleGroupMap, group.title)) {
                titleGroupMap[group.title] = this.addArgumentGroup([], {
                    title: group.title,
                    description: group.description,
                    conflictHandler: group.conflictHandler
                });
            }

            // map the actions to their new group
            forEach(group._groupActions, function (action) {
                groupMap[action] = titleGroupMap[group.title];
            });
        }, this);

        // add container's mutually exclusive groups
        // NOTE: if add_mutually_exclusive_group ever gains title= and
        // description= then this code will need to be expanded as above
        forEach(container._actionGroupsMutex, function (group) {
            var mutexGroup = this.addArgumentGroup({
                required: group.required
            }, true);

            // map the actions to their new mutex group
            group._groupActions.forEach(function (action) {
                groupMap[action] = mutexGroup;
            });
        }, this);

        // add all actions to this container or their group
        forEach(container._actions, function (action) {
            groupMap.get(action, this)._addAction(action);
        }, this);
    },

    _getPositionalKwargs: function (destination, kwargs) {
        // make sure required is not specified
        if (kwargs.required) {
            throw new Error(_('"required" is an invalid argument for positionals.'));// TypeError
        }

        // mark positional arguments as required if at least one is
        // always required
        if (kwargs.nargs !== OPTIONAL && kwargs.nargs !== ZERO_OR_MORE) {
            kwargs.required = true;
        }
        if (kwargs.nargs === ZERO_OR_MORE && kwargs.defaultValue === undefined) {
            kwargs.required = true;
        }

        // return the keyword arguments with no option strings
        kwargs.destination = destination;
        kwargs.optionStrings = [];
        return kwargs;
    },

    _getOptionalKwargs: function (args, kwargs) {
        var prefixChars = this.prefixChars,
            optionStrings = [],
            optionStringsLong = [];

        // determine short and long option strings
        args.forEach(function (optionString) {
            // error on strings that don't start with an appropriate prefix
            if (!contains(prefixChars, optionString[0])) {
                throw Error($stringPrint(_('Invalid option string "%option%": must start with a "%prefix%".'), {
                    option: optionString,
                    prefix: prefixChars
                }));// ValueError
            }

            // strings starting with two prefix characters are long options
            optionStrings.push(optionString);
            if (contains(prefixChars, optionString[0])) {
                if (optionString.length > 1 && contains(prefixChars, optionString[1])) {
                    optionStringsLong.push(optionString);
                }
            }
        });


        // infer destination, '--foo-bar' -> 'foo_bar' and '-x' -> 'x'
        var destination = kwargs.destination;
        delete kwargs.destination;

        if (destination === undefined) {
            var optionStringDestination = optionStringsLong[0] || optionStrings[0];

            // destination = optionStringDestination.lstrip(this.prefixChars);
            destination = $stringLStrip(optionStringDestination, this.prefixChars);

            if (destination.length === 0) {
                throw Error($stringPrint(_('destination= is required for options like "%option%"'), {
                    option: optionStrings.join(', ')
                }));
            }
            destination = destination.replace('-', '_');
        }

        // return the updated keyword arguments
        kwargs.destination = destination;
        kwargs.optionStrings = optionStrings;

        return kwargs;
    },

    _popActionClass: function (kwargs, defaultValue) {
        var action = (kwargs.action || defaultValue);
        delete kwargs.action;

        return this._registryGet('action', action, action);
    },

    _getHandler: function () {
        // determine function from conflict handler string
        var handlerFuncName = '';
        handlerFuncName += '_handleConflict';
        handlerFuncName += this.conflictHandler.charAt(0).toUpperCase() + this.conflictHandler.substr(1);

        if (this[handlerFuncName] === undefined) {
            throw new Error($stringPrint(_('Invalid conflictResolution value: %value%'), {
                value: (this.conflictHandler || 'undefined')
            }));// ValueError
        }
        return this[handlerFuncName];
    },

    _checkConflict: function (action) {
        var optionStringActions = this._optionStringActions,
            conflictOptionals = [];

        // find all options that conflict with this option
        action.optionStrings.forEach(function (optionString) {
            if (optionStringActions[optionString] !== undefined) {
                conflictOptionals.push([
                    optionString, // #1,
                    optionStringActions[optionString]// #2
                ]);
            }
        });

        // resolve any conflicts
        if (conflictOptionals.length > 0) {
            this._getHandler()(action, conflictOptionals);
        }
    },

    _handleConflictError: function (action, conflictingActions) {
        throw new ArgumentError({
            argument: action,
            message: $stringPrint(_('Conflicting option string(s): %conflict%'), {
                conflict: conflictingActions.map(function (tuple) {
                    return tuple[0];
                }).join(', ')
            })
        });
    },

    _handleConflictResolve: function (action, conflictingActions) {

        // remove all conflicting options
        conflictingActions.forEach(function (tuple) {
            var optionString = tuple[0],
                action = tuple[1];

            // remove the conflicting option
            action.optionStrings.splice(action.optionStrings.indexOf(optionString));
            delete this._optionStringActions[optionString];

            // if the option now has no option string, remove it from the
            // container holding it
            if (action.isOptional()) {
                action.container._removeAction(action);
            }
        });
    }
});

/**
 * ArgumentGroup class
 *
 * @class
 * @extends ActionContainer
 */
var ArgumentGroup = core.class('ArgumentGroup', ActionContainer, {
    /**
     * ArgumentGroup constructor
     *
     * @constructor
     * @param {ActionContainer} container
     * @param {object} options
     */
    initialize: function (container, options) {

        if (!options) {
            options = {};
        }

        // add any missing keyword arguments by checking the container
        options.conflictHandler = (options.conflictHandler || container.conflictHandler);
        options.prefixChars = (options.prefixChars || container.prefixChars);
        options.argumentDefault = (options.argumentDefault || container.argumentDefault);

        this.callSuper(options);

        // group attributes
        this.title = options.title;
        this._groupActions = [];

        // share most attributes with the container
        this._container = container;
        this._registries = container._registries;
        this._actions = container._actions;
        this._optionStringActions = container._optionStringActions;
        this._defaults = container._defaults;
        this._hasNegativeNumberOptionals = container._hasNegativeNumberOptionals;
    },

    _addAction: function (action) {
        // Parent add action
        action = this.callSuper(action);
        this._groupActions.push(action);
        return action;
    },

    _removeAction: function (action) {
        // Parent remove action
        action = this.callSuper(action);
        this._groupActions.splice(this._groupActions.indexOf(action));
    }
});

/**
 * ArgumentGroupMutex class
 *
 * @class
 * @extends ArgumentGroup
 */
var ArgumentGroupMutex = core.class('ArgumentGroupMutex', ArgumentGroup, {
    /**
     * ArgumentGroupMutex constructor
     *
     * @constructor
     * @param {ActionContainer} container
     * @param {object} options
     * @return
     */
    initialize: function (container, options) {
        this.callSuper(container, options);
        this.required = (options.required || false);
    },

    _addAction: function (action) {
        if (action.required) {
            throw new Error(_('Mutually exclusive arguments must be optional.'));// ValueError
        }
        action = this._container._addAction(action);
        this._groupActions.push(action);
        return action;
    },

    _removeAction: function (action) {
        this._container._removeAction(action);
        this._groupActions.splice(this._groupActions.indexOf(action));
    }
});


/**
 * ArgumentParser class
 *
 * @class
 * @extends ActionContainer
 */
var ArgumentParser = core.class('ArgumentParser', ActionContainer, {
    /**
     * ArgumentParser declaration
     *
     * @constructor
     * @param {object} options
     */
    initialize: function (options) {
        if (!options) {
            options = {};
        }
        options.prefixChars = (options.prefixChars || '-');
        options.help = (options.help || false);
        options.parents = (options.parents || []);

        // environment
        options.debug = (options.debug || false);
        options.stdout = (options.stdout || process.stdout);
        options.stderr = (options.stderr || process.stderr);

        // default program name
        options.program = (options.program || require('path').basename(process.execPath));

        this.callSuper(options);

        this.debug = true;
        this.stdout = options.stdout;
        this.stderr = options.stderr;

        this.program = options.program;
        this.usage = options.usage;
        this.epilog = options.epilog;
        this.version = options.version;

        this.formatterClass = (options.formatterClass || HelpFormatter);
        this.prefixCharsFile = options.prefixCharsFile;

        this._positionals = this.addArgumentGroup({title: _('Positional arguments')});
        this._optionals = this.addArgumentGroup({title: _('Optional arguments')});
        this._subparsers = [];

        // register types
        this.register('type', 'auto', FUNCTION_IDENTITY);
        this.register('type', null, FUNCTION_IDENTITY);
        this.register('type', 'int', function (x) {
            var result = parseInt(x, 10);
            if (isNaN(result)) {
                throw new Error(x + ' is not a valid integer.');
            }
            return result;
        });
        this.register('type', 'float', function (x) {
            var result = parseFloat(x);
            if (isNaN(result)) {
                throw new Error(x + ' is not a valid float.');
            }
            return result;
        });
        this.register('type', 'string', function (x) {
            return '' + x;
        });

        // add help and version arguments if necessary
        // (using explicit default to override global argument_default)
        if (options.help) {
            this.addArgument(
                ['-h', '--help'],
                {
                    action: 'help',
                    help: _('Show this help message and exit.')
                }
            );
        }
        if (this.version !== undefined) {
            this.addArgument(
                ['-v', '--version'],
                {
                    action: 'version',
                    version: this.version,
                    help: _("Show program's version number and exit.")
                }
            );
        }

        // add parent arguments and defaults
        options.parents.forEach(function (parent) {
            this._addContainerActions(parent);
            if (parent._defaults !== undefined) {
                for (var defaultKey in parent._defaults) {
                    if (parent._defaults.hasOwnProperty(defaultKey)) {
                        this._defaults[defaultKey] = parent._defaults[defaultKey];
                    }
                }
            }
        });

    },

    /**
     * Optional/Positional adding methods
     */
    addSubparsers:  function (options) {
        if (this._subparsers !== undefined) {
            this.error(1, _('Cannot have multiple subparser arguments.'));
        }

        if (!options) {
            options = {};
        }
        options.optionStrings = [];
        options.parserClass =  (options.parserClass || 'ArgumentParser');


        if (options.title !== undefined || options.description !== undefined) {

            this._subparsers = this.addArgumentGroup({
                title: _((options.title || 'subcommands')),
                description: _(options.description)
            });
            delete options.title;
            delete options.description;

        } else {
            this._subparsers = this._positionals;
        }

        // prog defaults to the usage message of this parser, skipping
        // optional arguments and with no "usage:" prefix
        if (options.program !== undefined) {
            var formatter = this._getFormatter();
            var positionals = this._getActionsPositional();
            var groups = this._actionGroupsMutex;
            formatter.addUsage(this.usage, positionals, groups, '');
            options.program = $stringStrip(formatter.formatHelp());
        }
        // create the parsers action and add it to the positionals list
        var parsersClass = this._popActionClass(options, 'parsers');
        var action = new parsersClass(options);
        this._subparsers._addAction(action);

        // return the created parsers action
        return action;
    },

    /**
     * Return the parsed args and throws error if some arguments are not recognized
     *
     * @param {Array} args
     * @param {Namespace} namespace
     * @return args
     */
    parseArgs: function (/* array */ args, /* object */ namespace) {
        var result = this.parseArgsKnown(args, namespace), argv;
        args = result[0];
        argv = result[1];

        if (argv && argv.length > 0) {
            this.error(1,
                $stringPrint(_('Unrecognized arguments: %arguments%.'), {
                    arguments: argv.join(' ')
                })
            );
        }
        return args;
    },

    /**
     * Return the parsed args (only known)
     *
     * @param {Array} args
     * @param {Namespace} namespace (optional)
     * @return [args, argv]
     */
    parseArgsKnown: function (/* array */ args, /* object */ namespace) {
        // args default to the system args
        args = args || process.argv.slice(1);

        // default Namespace built from parser defaults
        namespace = namespace || new Namespace();


        // add any action defaults that aren't present
        forEach(this._actions, function (action) {
            if (action.destination !== SUPPRESS &&
                namespace[action.destination] === undefined &&
                action.defaultValue !== SUPPRESS
            ) {
                var defaultValue = action.defaultValue;
                if (typeof(action.defaultValue) === 'string') {
                    defaultValue = this._getValue(action, defaultValue);
                }
                namespace.set(action.destination, defaultValue);
            }
        }, this);

        // add any parser defaults that aren't present
        for (var destination in this._defaults) {
            if (namespace.get(destination) === undefined) {
                namespace.set(destination, this._defaults[destination]);
            }
        }

        // parse the arguments and exit if there are any errors
        try {
            return this._parseArgsKnown(args, namespace);
        } catch (e) {
            if (this.debug) {
                throw e;
            } else {
                this.error(1, e.message);// _sys.exc_info()[1];
            }
        }
    },

    _addAction: function (action) {
        (action.isOptional() ? this._optionals : this._positionals)._addAction(action);
        return action;
    },

    _getActionsOptional: function () {
        return this._actions.filter(function (action, actionIndex) {
            return action.isOptional();
        });
    },

    _getActionsPositional: function () {
        return this._actions.filter(function (action, actionIndex) {
            return action.isPositional();
        });
    },

    _parseArgsKnown: function (argStrings, namespace) {
        argStrings = this._readArgs(argStrings);

        // map all mutually exclusive arguments to the other arguments they can't
        // occur with
        var actionConflicts = {};
        forEach(this._actionGroupsMutex, function (mutexGroup) {
            forEach(mutexGroup._groupActions, function (mutexAction, mutexIndex) {
                actionConflicts[mutexAction] = (actionConflicts[mutexAction] || []).concat(
                    mutexGroup._groupActions.slice(0, mutexIndex),
                    mutexGroup._groupActions.slice(mutexIndex + 1)
                );
            });
        });


        // find all option indices, and determine the argStringPattern
        // which has an 'O' if there is an option at an index,
        // an 'A' if there is an argument, or a '-' if there is a '--'
        var optionStringIndices = [],
            argStringPatternParts = [],
            found = false;// -- if is found

        forEach(argStrings, function (argString, argStringIndex) {
            if (found) {
                argStringPatternParts.push('A');
            } else {
                // all args after -- are non-options
                if (argString === '--') {
                    argStringPatternParts.push('-');
                    found = true;

                // otherwise, add the arg to the arg strings
                // and note the index if it was an option
                } else {
                    var optionTuple = this._parseOptional(argString);
                    if (!!optionTuple) {
                        optionStringIndices[argStringIndex] = optionTuple;
                        argStringPatternParts.push('O');
                    } else {
                        argStringPatternParts.push('A');
                    }

                }
            }
        }, this);

        // join the pieces together to form the pattern
        var argStringsPattern = argStringPatternParts.join('');

        // converts arg strings to the appropriate and then takes the action
        var actionsSeen = [],
            actionsSeenNonDefault = [],
            extras = [],
            startIndex = 0,
            stopIndex = 0;

        function takeAction(action, argumentStrings, optionString) {
            actionsSeen.push(action);
            var argValues = this._getValues(action, argumentStrings);

            // error if this argument is not allowed with other previously
            // seen arguments, assuming that actions that use the default
            // value don't really count as "present"
            if (argValues !== action.defaultValue) {
                actionsSeenNonDefault.push(action);
                if (actionConflicts[action]) {
                    forEach(actionConflicts[action], function (actionConflict) {
                        if (contains(actionsSeenNonDefault, actionConflict)) {
                            throw new ArgumentError({
                                argument: action,
                                message: $stringPrint(_('Not allowed with argument "%argument%".'), {argument: actionConflict.getName()})
                            });
                        }
                    });
                }
            }
            // take the action if we didn't receive a SUPPRESS value (e.g. from a
            // default)
            if (argValues !== SUPPRESS) {
                action.call(this, namespace, argValues, optionString);
            }
        }

        // function to convert argStrings into an optional action
        function consumeOptional(startIndex) {

            // get the optional identified at this index
            var self = this,
                optionTuple = optionStringIndices[startIndex],
                action = optionTuple[0],
                optionString = optionTuple[1],
                argExplicit = optionTuple[2],
                argCount,

                // identify additional optionals in the same arg string
                // (e.g. -xyz is the same as -x -y -z if no args are required)
                actionTuples = [],
                stop;

            while (true) {

                // if we found no optional action, skip it
                if (!action) {
                    extras.push(argStrings[startIndex]);
                    return startIndex + 1;
                }

                // if there is an explicit argument, try to match the
                // optional's string arguments to only this
                if (!!argExplicit) {


                    argCount = this._matchArgument(action, 'A');

                    // if the action is a single-dash option and takes no
                    // arguments, try to parse more single-dash options out
                    // of the tail of the option string
                    if (argCount === 0 && contains(this.prefixChars, optionString[1])) {

                        actionTuples.push([action, [], optionString]);
                        var breaked = false, prefixChar, i;

                        for (i = 0 ; i < this.prefixChars.length; i += 1) {
                            prefixChar = this.prefixChars[i];
                            optionString = prefixChar + argExplicit.substr(0, 1);
                            argExplicit = argExplicit.substr(1);
                            if (self._optionStringActions[optionString] !== undefined) {
                                action = self._optionStringActions[optionString];
                                breaked = true;
                                break;
                            }
                        }
                        if (breaked) {
                            throw new ArgumentError({
                                argument: action,
                                message: $stringPrint(_('Ignored explicit argument "%argument%".'), {argument: argExplicit})
                            });
                        }

                    // if the action expect exactly one argument, we've
                    // successfully matched the option; exit the loop
                    } else if (argCount === 1) {
                        stop = startIndex + 1;
                        actionTuples.push([action, [argExplicit], optionString]);
                        break;

                    // error if a double-dash option did not use the explicit argument
                    } else {
                        throw new ArgumentError({
                            argument: action,
                            message: $stringPrint(_('Ignored explicit argument "%argument%".'), {argument: argExplicit})
                        });
                    }

                // if there is no explicit argument, try to match the
                // optional's string arguments with the following strings
                // if successful, exit the loop
                } else {
                    var start = startIndex + 1,
                        argStringsPatternSelected = argStringsPattern.substr(start);
                    argCount = this._matchArgument(action, argStringsPatternSelected);

                    stop = start + argCount;
                    actionTuples.push([action, argStrings.slice(start, stop), optionString]);
                    break;
                }
            }

            // add the Optional to the list and return the index at which
            // the Optional's string args stopped
            if (actionTuples.length <= 0) {
                throw new Error('length should be > 0');
            }
            actionTuples.forEach(function (actionTuple) {
                takeAction.apply(this, actionTuple);
            }, this);
            return stop;
        }

        // the list of Positionals left to be parsed; this is modified by
        // consumePositionals()
        var positionals = this._getActionsPositional();

        // function to convert argStrings into positional actions
        function consumePositionals(startIndex) {
            // match as many Positionals as possible
            var argStringsPatternSelected = argStringsPattern.substr(startIndex),
                argCounts = this._matchArgumentsPartial(positionals, argStringsPatternSelected),
                index;

            // slice off the appropriate arg strings for each Positional
            // and add the Positional and its args to the list
            for (index = 0; index < positionals.length; index += 1) {
                var action = positionals[index],
                    argCount = (argCounts[index] || 0),
                    args = argStrings.slice(startIndex, startIndex + argCount);

                startIndex += argCount;
                takeAction.call(this, action, args);
            }

            // slice off the Positionals that we just parsed and return the index at
            // which the Positionals' string args stopped
            positionals = positionals.slice(argCounts.length);
            return startIndex;
        }

        // consume Positionals and Optionals alternately, until we have passed the
        // last option string
        var optionStringIndexMax = optionStringIndices ?  optionStringIndices.length - 1: -1;

        while (startIndex <= optionStringIndexMax) {
            // consume any Positionals preceding the next option
            var optionStringIndexNext, positionalsEndIndex;
            for (var i = startIndex; i < optionStringIndices.length; i += 1) {
                if (optionStringIndices[i] !== undefined) {
                    optionStringIndexNext = i;
                    break;
                }
            }

            if (startIndex !== optionStringIndexNext) {
                positionalsEndIndex = consumePositionals.call(this, startIndex);

                // only try to parse the next optional if we didn't consume the
                // option string during the positionals parsing
                if (positionalsEndIndex > startIndex) {
                    startIndex = positionalsEndIndex;
                    continue;
                } else {
                    startIndex = positionalsEndIndex;
                }
            }

            // if we consumed all the positionals we could and we're not at the
            // index of an option string, there were extra arguments
            if (optionStringIndices[startIndex] === undefined) {
                var strings = argStrings.slice(startIndex, optionStringIndexNext);
                extras = extras.concat(strings);
                startIndex = optionStringIndexNext;
            }
            // consume the next optional and any arguments for it
            startIndex = consumeOptional.call(this, startIndex);
        }

        // consume any positionals following the last Optional
        stopIndex = consumePositionals.call(this, startIndex);

        // if we didn't consume all the argument strings, there were extras
        extras = extras.concat(argStrings.slice(stopIndex));

        // if we didn't use all the Positional objects, there were too few arg
        // strings supplied.
        if (positionals.length > 0) {
            this.error(1, _('Too few arguments'));
        }

        // make sure all required actions were present
        forEach(this._actions, function (action) {
            if (action.required && !contains(actionsSeen, action)) {
                this.error(1, $stringPrint(_('Argument "%argument%" is required'), {argument: action.getName()}));
            }
        }, this);

        // make sure all required groups had one option present
        forEach(this._actionGroupsMutex, function (group) {
            if (group.required) {
                var found = false,
                    actionIndex,
                    action,
                    names = [];
                for (actionIndex in group._groupActions) {
                    if (group._groupActions.hasOwnProperty(actionIndex)) {
                        action = group._groupActions[actionIndex];
                        if (contains(actionsSeenNonDefault, action)) {
                            found = true;
                            break;
                        }
                    }
                }
                // if no actions were used, report the error
                if (found) {
                    forEach(group._groupActions, function (action) {
                        if (action.help !== SUPPRESS) {
                            names.push(action.getName());
                        }
                    });
                    this.error(1, $stringPrint(_('One of the arguments %arguments% is required.'), {
                        arguments: names.join(', ')
                    }));
                }
            }
        }, this);


        // return the updated namespace and the extra arguments
        return [namespace, extras];
    },

    _readArgs: function (argStrings) {
        var result = argStrings.slice();
        // replace arg strings that are file references
        if (this.prefixCharsFile !== undefined) {
            result = this._readArgsFromFiles(result);
        }
        return result;
    },

    _readArgsFromFiles: function (argStrings) {
        // expand arguments referencing files
        var argStringsNew = [];
        forEach(argStrings, function (argString) {

            // for regular arguments, just add them back into the list
            if (!contains(this.prefixCharsFile, argString[0])) {
                argStringsNew.push(argString);

                // replace arguments referencing files with the file content
            } else {
                try {
                    // TODO: optimize IO reading?
                    var argsFileContent = fs.readFileSync(argString.substr(1), 'r'),
                        argLines = argsFileContent.split(EOL),
                        argStrings = [];
                    argLines.forEach(function (argLine) {
                        argLine = [argLine];// convert arg line to args
                        argLine.forEach(function (arg) {
                            argStrings.push(arg);
                        });
                    });
                    argStrings = this._readArgsFromFiles(argStrings);
                    argStringsNew = argStringsNew.concat(argStrings);

                } catch (e) {// IOError
                    this.error(1, e.getMessage());
                }
            }
        }, this);
        // return the modified argument list
        return argStringsNew;
    },

    _matchArgument: function (action, regexpArgStrings) {
        // match the pattern for this action to the arg strings
        var regexpNargs = this._getRegexpNargs(action),
            matches = regexpArgStrings.match(regexpNargs),
            message;

        // throw an exception if we weren't able to find a match
        if (!matches) {
            if (action.nargs === undefined) {
                message = _('Expected one argument.');
            } else if (action.nargs === OPTIONAL) {
                message = _('Expected at most one argument.');
            } else if (action.nargs === ONE_OR_MORE) {
                message = _('Expected at least one argument.');
            } else {
                message = _('Expected %count% argument(s)');
            }
            throw new ArgumentError({
                argument: action,
                message: $stringPrint(message, {count: action.nargs})
            });
        }
        // return the number of arguments matched
        return matches[1].length;
    },

    _matchArgumentsPartial:  function (actions, regexpArgStrings) {
        // progressively shorten the actions list by slicing off the
        // final actions until we find a match
        var self = this,
            result = [],
            actionSlice,
            pattern,
            matches,
            i,
            getLength = function (string) {
                return string.length;
            };
        for (i = actions.length; i > 0; i -= 1) {
            actionSlice = actions.slice(0, i);
            pattern = actionSlice.map(this.getRegexpNargs, this).join('');

            matches = regexpArgStrings.match(pattern);
            if (matches && matches.length > 0) {
                result = result.concat(matches.map(getLength));
                break;
            }
        }

        // return the list of arg string counts
        return result;
    },

    _parseOptional: function (argString) {
        var optionStringActions = this._optionStringActions,
            action,
            optionString, argExplicit, optionTuples;

        // if it's an empty string, it was meant to be a positional
        if (!argString) {
            return null;
        }

        // if it doesn't start with a prefix, it was meant to be positional
        if (!contains(this.prefixChars, argString[0])) {
            return null;
        }

        // if the option string is present in the parser, return the action
        if (optionStringActions[argString] !== undefined) {
            return [optionStringActions[argString], argString, null];
        }

        // if it's just a single character, it was meant to be positional
        if (argString.length === 1) {
            return null;
        }

        // if the option string before the "=" is present, return the action
        if (argString.indexOf('=') >= 0) {
            var argStringSplit = argString.split('=', 2);
            optionString =  argStringSplit[0];
            argExplicit = argStringSplit[1] || null;
            if (optionStringActions[optionString] !== undefined) {
                return [optionStringActions[optionString], optionString, argExplicit];
            }
        }

        // search through all possible prefixes of the option string
        // and all actions in the parser for possible interpretations
        optionTuples = this._getOptionTuples(argString);

        // if multiple actions match, the option string was ambiguous
        if (optionTuples.length > 1) {

            var optionStrings = optionTuples.map(function (optionTuple) {
                return optionTuple[1];// optionTuple(action, optionString, argExplicit)
            });
            this.error(1, $stringPrint(_('Ambiguous option: "%argument%" could match %values%.'), {argument: argString, values: optionStrings.join(', ')}));
        // if exactly one action matched, this segmentation is good,
        // so return the parsed action
        } else if (optionTuples.length === 1) {
            return optionTuples[0];
        }

        // if it was not found as an option, but it looks like a negative
        // number, it was meant to be positional
        // unless there are negative-number-like options
        if (argString.match(this._regexpNegativeNumber) && !this._hasNegativeNumberOptionals) {
            return null;
        }
        // if it contains a space, it was meant to be a positional
        if (argString.indexOf(' ') >= 0) {
            return null;
        }

        // it was meant to be an optional but there is no such option
        // in this parser (though it might be a valid option in a subparser)
        return [null, argString, null];
    },

    _getOptionTuples: function (optionString) {
        var result = [],
            prefixChars = this.prefixChars,
            optionPrefix = optionString,
            optionPrefixShort = optionString.substr(0, 2),
            argExplicitShort = optionString.substr(2),
            argExplicit = null,
            action;

        // option strings starting with two prefix characters are only split at the '='
        if (contains(prefixChars, optionString[0]) && contains(prefixChars, optionString[1])) {
            if (contains(optionString, '=')) {
                var optionStringSplit = optionString.split('=', 1);
                optionPrefix = optionStringSplit[0];
                argExplicit = optionStringSplit[1] || null;
            }

            forEach(this._optionStringActions, function (optionStringAction, optionStringName) {
                if (optionStringName.substr(0, optionPrefix.length) === optionPrefix) {
                    result.push([optionStringAction, optionStringName, argExplicit]);
                }
            });

        // single character options can be concatenated with their arguments but
        //multiple character options always have to have their argument separate
        } else if (contains(prefixChars, optionString[0]) && !contains(prefixChars, optionString[1])) {

            forEach(this._optionStringActions, function (optionStringAction, optionStringName) {
                if (optionStringName === optionPrefixShort) {
                    result.push([optionStringAction, optionStringName, argExplicitShort]);
                } else if (optionString.substr(0, optionPrefix.length) === optionPrefix) {
                    result.push([optionStringAction, optionStringName, argExplicit]);
                }
            });
        // shouldn't ever get here
        } else {
            throw new Error($stringPrint(_('Unexpected option string: %argument%.'), {argument: optionString}));
        }

        // return the collected option tuples
        return result;
    },

    _getRegexpNargs: function (action) {
        // in all examples below, we have to allow for '--' args
        // which are represented as '-' in the pattern
        var regexpNargs;

        switch (action.nargs) {
        // the default (None) is assumed to be a single argument
        case undefined:
            regexpNargs = '(-*A-*)';
            break;
            // allow zero or more arguments
        case OPTIONAL:
            regexpNargs = '(-*A?-*)';
            break;
            // allow zero or more arguments
        case ZERO_OR_MORE:
            regexpNargs = '(-*[A-]*)';
            break;
            // allow one or more arguments
        case ONE_OR_MORE:
            regexpNargs = '(-*A[A-]*)';
            break;
            // allow any number of options or arguments
        case REMAINDER:
            regexpNargs = '([-AO]*)';
            break;
            // allow one argument followed by any number of options or arguments
        case PARSER:
            regexpNargs = '(-*A[-AO]*)';
            break;
        default:
            regexpNargs = '(-*' + 'A' + $stringRepeat('-*A', action.nargs - 1) + '-*)';
        }

        // if this is an optional action, -- is not allowed
        if (action.isOptional()) {
            regexpNargs = regexpNargs.replace('-*', '');
            regexpNargs = regexpNargs.replace('-', '');
        }

        // return the pattern
        return new RegExp(regexpNargs);
    },

    /**
     * Value conversion methods
     */
    _getValues: function (action, argStrings) {
        // for everything but PARSER args, strip out '--'
        if (action.nargs !== PARSER && action.nargs !== REMAINDER) {
            argStrings = argStrings.filter(function (arrayElement) {
                return arrayElement !== '--';
            });
        }

        var value, argString;
        // optional argument produces a default when not present
        if (argStrings.length === 0 && action.nargs === OPTIONAL) {
            value = (action.isOptional()) ? action.constant: action.defaultValue;

            if (typeof(value) === 'string') {
                value = this._getValue(action, value);
                this._checkValue(action, value);
            }

        // when nargs='*' on a positional, if there were no command-line
        // args, use the default if it is anything other than None
        } else if (argStrings.length === 0 && action.nargs === ZERO_OR_MORE && action.isPositional()) {
            value = (action.defaultValue || argStrings);
            this._checkValue(action, value);

        // single argument or optional argument produces a single value
        } else if (argStrings.length <= 1 && (action.nargs === undefined || action.nargs === OPTIONAL)) {//TODO check is argStrings.length === 1?
            argString = argStrings[0] || action.defaultValue;
            value = this._getValue(action, argString);
            this._checkValue(action, value);

        // REMAINDER arguments convert all values, checking none
        } else if (action.nargs === REMAINDER) {
            value = argStrings.map(function (v) {
                return this._getValue(action, v);
            }, this);
        // PARSER arguments convert all values, but check only the first
        } else if (action.nargs === PARSER) {
            value = argStrings.map(function (v) {
                return this._getValue(action, v);
            }, this);
            this._checkValue(action, value[0]);

        // all other types of nargs produce a list
        } else {
            value = argStrings.map(function (v) {
                return this._getValue(action, v);
            }, this);
            value.forEach(function (v) {
                this._checkValue(action, v);
            }, this);
        }

        // return the converted value
        return value;
    },

    _getValue: function (action, argString) {
        var typeFunction = this._registryGet('type', action.type, action.type),
            result;
        if (!isFunction(typeFunction)) {
            throw new ArgumentError({
                argument: action,
                message: $stringPrint(_('%callback% is not callable'), {callback: typeFunction})
            });
        }

        // convert the value to the appropriate type
        try {
            result = typeFunction(argString);

            // ArgumentTypeErrors indicate errors
        } catch (e) {

            // catch ArgumentTypeError:
            /*
             * name = action.type; message = e.message;//TODO change this throw
             * new ArgumentError(action, message);
             */

            // TypeErrors or ValueErrors also indicate errors
            // catch (TypeError, ValueError):
            throw new ArgumentError({
                argument: action,
                message: $stringPrint(_('Invalid %type% value: %value%'), {
                    type: action.type,
                    value: argString
                })
            });
        }
        // return the converted value
        return result;
    },

    _checkValue: function (action, value) {
        // converted value must be one of the choices (if specified)
        if (action.choices !== undefined && !contains(action.choices, value)) {
            throw new ArgumentError({
                argument: action,
                message: $stringPrint(_('Invalid choice: %value% (choose from [%choices%])', {
                    value: value,
                    choices: action.choices.join(', ')
                }))
            });
        }
    },

    /*******************************************************************************
     * Help formatting methods
     ******************************************************************************/
    /**
     * Format Usage
     *
     * @return {string}
     */
    formatUsage: function () {
        var formatter = this._getFormatter();
        formatter.addUsage(this.usage, this._actions, this._actionGroupsMutex);
        return formatter.formatHelp();
    },

    /**
     * Format Help
     *
     * @return string
     */
    formatHelp: function () {
        var formatter = this._getFormatter();

        // usage
        formatter.addUsage(this.usage, this._actions, this._actionGroupsMutex);

        // description
        formatter.addText(this.description);

        // positionals, optionals and user-defined groups
        this._actionGroups.forEach(function (actionGroup, actionIndex) {
            formatter.startSection(actionGroup.title);
            formatter.addText(actionGroup.description);
            formatter.addArguments(actionGroup._groupActions);
            formatter.endSection();
        });

        // epilog
        formatter.addText(this.epilog);

        // determine help from format above
        return formatter.formatHelp();
    },

    _getFormatter: function () {
        var formatterClass = this.formatterClass,
            formatter =  new formatterClass({
                program: this.program
            });
        return formatter;
    },

    /*******************************************************************************
     * Print functions
     ******************************************************************************/
    /**
     * Print usage
     *
     * @param {file} file
     * @return this
     */
    printUsage: function (/* file */ file) {
        this._printMessage(this.formatUsage(), file || this.stdout);
        return this;
    },

    /**
     * Print help
     *
     * @param {file} file
     * @return this
     */
    printHelp: function (/* file */ file) {
        this._printMessage(this.formatHelp(), file || this.stdout);
        return this;
    },

    _printMessage: function (/* string */ message, /* file */ file) {
        if (message && file) {
            // file = file || this.stdout;
            file.write('' + message);
        }
    },

    /*******************************************************************************
     * Exit functions
     ******************************************************************************/
    /**
     * Exit method
     *
     * @param {int} status
     * @param {string} message
     * @return {int}
     */
    exit: function (/* int */ status, /* string */ message) {
        if (message !== undefined) {
            this._printMessage(message, this.stderr);
        }
        status = status || 0;
        if (!this.debug) {
            process.exit(status);
        } else {
            throw new SystemExit(status, message);
        }
        return status;
    },

    /**
     * Error method Prints a usage message incorporating the message to stderr and
     * exits. If you override this in a subclass, it should not return -- it should
     * either exit or throw an exception.
     *
     * @param message
     * @return undefined
     */
    error: function (/* int */ status, /* string */ message) {
        status = status || 1;
        this.printUsage(this.stderr);
        return this.exit(status, $stringPrint(_('%program%: error: %message%'), {program: this.program, message: message}) + EOL);
    }
});

/**
 * Exports
 */
//misc.
exports.Namespace = Namespace;
exports.ArgumentParser = ArgumentParser;

//Exceptions & Errors
exports.ArgumentError = ArgumentError;

//Actions
exports.Action = Action;
exports.ActionAppend = ActionAppend;
exports.ActionAppendConstant = ActionAppendConstant;
exports.ActionCount = ActionCount;
exports.ActionStore = ActionStore;
exports.ActionStoreConstant = ActionStoreConstant;
exports.ActionStoreTrue = ActionStoreTrue;
exports.ActionStoreFalse = ActionStoreFalse;

//Formatters
exports.HelpFormatter = HelpFormatter;
exports.HelpFormatterArgumentDefaults = HelpFormatterArgumentDefaults;
exports.HelpFormatterRawDescription = HelpFormatterRawDescription;
exports.HelpFormatterRawText = HelpFormatterRawText;

//Constants
exports.SUPPRESS = SUPPRESS;
exports.OPTIONAL = OPTIONAL;
exports.ZERO_OR_MORE = ZERO_OR_MORE;
exports.ONE_OR_MORE = ONE_OR_MORE;
exports.PARSER = PARSER;
exports.REMAINDER = REMAINDER;