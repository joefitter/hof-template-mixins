'use strict';

var lookup = require('i18n-lookup'),
    Hogan = require('hogan.js');

// It should be given:
// - t: a function that will translate a key into the correct language depending
//      on the locale selected.
module.exports = function (t) {
    return lookup(t, function (template, context) {
        return Hogan.compile(template).render(context);
    });
};
