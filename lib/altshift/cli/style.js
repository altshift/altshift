/*jslint nodejs: true, indent:4 */
/**
 * @link http://en.wikipedia.org/wiki/ANSI_escape_code
 */
var ESCAPE = String.fromCharCode(27);
var CONSOLE_STYLES = {
    'font': {
        'normal': null,
        'alternate-1': [11, 10],
        'alternate-2': [12, 10],
        'alternate-3': [13, 10],
        'alternate-4': [14, 10],
        'alternate-5': [15, 10],
        'alternate-6': [16, 10],
        'alternate-7': [17, 10],
        'alternate-8': [18, 10],
        'alternate-9': [19, 10]
    },
    'font-weight': {
        'normal' : null,
        'bold' : [1, 22]
    },
    'font-style': {
        'normal' : null,
        'italic' : [3, 23]
    },
    'text-decoration': {
        'underline' : [4, 24],
        'blink' : [5, 25],
        'reverse' : [7, 27],
        'invisible' : [8, 28]
    },
    'color': {
        'default' : null,
        'black' : [30, 39],
        'blue': [34, 39],
        'blue-hi': [94, 39],
        'cyan' : [36, 39],
        'green' : [32, 39],
        'green-hi' : [92, 39],
        'grey' : [90, 39],
        'magenta' : [35, 39],
        'red' : [31, 39],
        'red-hi' : [95, 39],
        'white' : [37, 39],
        'yellow' : [33, 39]
    },
    'background-color': {
        'transparent': null,
        'black': [40, 49],
        'red': [41, 49],
        'green': [42, 49],
        'yellow': [43, 49],
        'blue': [44, 49],
        'magenta': [45, 49],
        'cyan': [46, 49],
        'white': [47, 49]
    }
};

/**
 * Apply one single style on str
 *
 * @param {string} str
 * @param {string} property
 * @param {string} value
 * @return {string}
 */
function applyStyle(str, property, value) {
    var styleDefinition = CONSOLE_STYLES[property][value];

    //No style defined return non modified string
    if (styleDefinition === null) {
        return str;
    }

    return ESCAPE + '[' + styleDefinition[0] + 'm' + str + ESCAPE + '[' + styleDefinition[1] + 'm';
}

/**
 * Return a formatted str
 *
 * @param {string} str
 * @param {Object} style
 * - font-weight : normal|bold
 * - font-style : normal|italic
 * - background-color : transparent|black|red|green|yellow|blue|magenta|cyan|white
 * - color : default|black|red|green|yellow|blue|magenta|cyan|white
 * - text-decoration : [underline|blink|reverse|invisible, ...]
 *
 * @return {string}
 */
function applyStyles(str, style) {
    //Check if not style
    if (! style) {
        return str;
    }

    //Check shortcut if string is empty
    str = '' + str;
    if (str.length === 0) {
        return str;
    }

    var output;
    style = style || {};

    output = str;
    if (style['font-weight']) {
        output = applyStyle(output, 'font-weight', style['font-weight']);
    }
    if (style['font-style']) {
        output = applyStyle(output, 'font-style', style['font-style']);
    }
    if (style.color) {
        output = applyStyle(output, 'color', style.color);
    }
    if (style['background-color']) {
        output = applyStyle(output, 'background-color', style['background-color']);
    }

    //Normalize as array
    if (Array.isArray(style['text-decoration'])) {
        //do all decoration
        style['text-decoration'].forEach(function (textdecoration) {
            output = applyStyle(output, 'text-decoration', textdecoration);
        });
    } else {
        output = applyStyle(output, 'text-decoration', style['text-decoration']);
    }
}

/**
 * Exports
 */
exports.format = applyStyles;
