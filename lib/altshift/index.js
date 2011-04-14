var core = require('./core');

core.mixin(exports, core);

['application',
 'finder',
 'fs',
 'http',
 'io',
 'promise',
 'uri'
 ].forEach(function (_module) {
     exports[_module] = require('./' + _module);
 });