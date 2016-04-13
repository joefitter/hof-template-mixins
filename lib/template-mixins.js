'use strict';

var fs = require('fs'),
    path = require('path');

var Hogan = require('hogan.js'),
    _ = require('underscore'),
    moment = require('moment');

// This returns a middleware that places mixins against the `res.locals` object.
//
// It should be given:
// - fields: the data needed to generate mixins options, etc.
// - options:
//   - viewDirectory: the folder in which templates are found in.
//   - viewEngine: the type of view, defaults to 'html'.
//   - sharedTranslationsKey: used to find translations relatively within
//     the translations.json. Useful for field and button labels.
module.exports = function (fields, options) {

    fields = fields || {};
    options = options || {};

    var viewsDirectory = options.viewsDirectory || path.resolve(__dirname, '../');
    var viewEngine = options.viewEngine || 'html';
    var sharedTranslationsKey = options.sharedTranslationsKey || '';

    if (sharedTranslationsKey && !sharedTranslationsKey.match(/\.$/)) {
        sharedTranslationsKey += '.';
    }

    var PANELMIXIN = 'partials/mixins/panel';

    var PARTIALS = [
        'partials/forms/input-text-group',
        'partials/forms/input-submit',
        'partials/forms/radio-group',
        'partials/forms/select',
        'partials/forms/checkbox',
        'partials/forms/textarea-group'
    ];
    var compiled = _.chain(PARTIALS).map(function (relativeTemplatePath) {
        var viewExtension = '.' + viewEngine;
        var templatePath = path.join(viewsDirectory, relativeTemplatePath + viewExtension);
        var compiledTemplate = Hogan.compile(fs.readFileSync(templatePath).toString());

        return [relativeTemplatePath, compiledTemplate];
    }).object().value();

    function maxlength(key) {
        var validation = fields[key] && fields[key].validate || [];
        var ml = _.findWhere(validation, { type: 'maxlength' }) || _.findWhere(validation, { type: 'exactlength' });
        if (ml) {
            return _.isArray(ml.arguments) ? ml.arguments[0] : ml.arguments;
        } else {
            return null;
        }
    }

    function type(key) {
        return fields[key] && fields[key].type || 'text';
    }

    function classNameString(name) {
        if (_.isArray(name)) {
            return name.join(' ');
        } else {
            return name;
        }
    }

    function classNames(key, prop) {
        prop = prop || 'className';
        if (fields[key] && fields[key][prop]) {
            return classNameString(fields[key][prop]);
        } else {
            return '';
        }
    }

    return function (req, res, next) {

        var translate = options.translate || req.translate || _.identity;

        var t = function (key) {
            return translate(sharedTranslationsKey + key);
        };

        // Like t() but returns null on failed translations
        var conditionalTranslate = function (key) {
            key = sharedTranslationsKey + key;
            var translated = translate(key);
            return translated !== key ? translated : null;
        };

        var getTranslationKey = function (key, property) {
            return fields && fields[key] && fields[key][property] ? fields[key][property] : 'fields.' + key + '.' + property;
        };

        /*
        * Utility function to parse {{x}} args passed to
        * mustache lambda in a partial.
        * Only the literal unparsed string including braces
        * is available to lamba methods used in partials
        * in this scope by default
        */
        var extractKey = function extractKey(key) {
            // regex to extract x from {{x}}
            var re = /^\{\{([^\{\}]+)\}\}$/;
            var match = key.match(re);
            // extract value and check scope for
            // corresponding property
            if (match && match[1] && this[match[1]]) {
                key = this[match[1]];
            }
            return key;
        };

        /*
         * helper function which takes a child string which
         * can either be the name of a partial in the format
         * partial/{partial-name}, the name of a template mixin
         * or a raw template string to render
         */
        var getTemplate = function getTemplate(child) {
            var re = /^partials\/(.+)/i;
            var match = child.match(re);
            if (match) {
                return fs.readFileSync(res.locals.partials['partials-' + match[1]] + '.' + viewEngine).toString();
            } else if (res.locals[child]) {
                var panelPath = path.join(viewsDirectory, PANELMIXIN + '.' + viewEngine);
                return fs.readFileSync(panelPath).toString();
            } else {
                return child;
            }
        };

        function inputText(key, extension) {
            var hKey = getTranslationKey(key, 'hint');
            var lKey = getTranslationKey(key, 'label');
            var hint = conditionalTranslate(hKey);

            var required = function isRequired() {
                var r = false;

                if (fields[key]) {
                    if (fields[key].required !== undefined) {
                        return fields[key].required;
                    } else if (fields[key].validate) {
                        var hasRequiredValidator = _.indexOf(fields[key].validate, 'required') !== -1;

                        return hasRequiredValidator ? true : false;
                    }
                }

                return r;
            }();

            extension = extension || {};

            return _.extend(extension, {
                id: key,
                className: extension.className || classNames(key),
                type: extension.type || type(key),
                value: this.values && this.values[key],
                label: t(lKey),
                labelClassName: classNames(key, 'labelClassName') || 'form-label-bold',
                hint: hint,
                hintId: extension.hintId || (hint ? key + '-hint' : null),
                error: this.errors && this.errors[key],
                maxlength: maxlength(key) || extension.maxlength,
                required: required,
                pattern: extension.pattern,
                date: extension.date,
                attributes: fields[key] && fields[key].attributes
            });
        }

        function optionGroup(key) {
            var legend = fields[key] && fields[key].legend;
            var legendClassName;
            var legendValue = 'fields.' + key + '.legend';
            if (legend) {
                if (legend.className) {
                    legendClassName = classNameString(legend.className);
                }
                if (typeof legend.value !== 'undefined') {
                    legendValue = legend.value;
                }
            }
            return {
                'key': key,
                'error': this.errors && this.errors[key],
                'legend': t(legendValue),
                'legendClassName': legendClassName,
                hint: conditionalTranslate(getTranslationKey(key, 'hint')),
                'options': _.map(fields[key] && fields[key].options, function (obj) {
                    var selected = false, label, value, toggle, child;

                    if (typeof obj === 'string') {
                        value = obj;
                        label = obj;
                    } else {
                        value = obj.value;
                        label = obj.label;
                        toggle = obj.toggle;
                        child = obj.child;
                    }

                    if (this.values && this.values[key] !== undefined) {
                        selected = this.values[key] === value;
                    }

                    function getErrorClass() {
                        return function(k) {
                            k = extractKey.call(this, k);
                            if (this.errors && this.errors[k]) {
                                return 'validation-error';
                            }
                            return '';
                        };
                    }

                    return {
                        label: t(label) || '',
                        value: value,
                        selected: selected,
                        toggle: toggle,
                        child: child,
                        getErrorClass: getErrorClass
                    };
                }, this),
                className: classNames(key),
                renderChild: function () {
                    return function () {
                        if (this.child) {
                            var templateString = getTemplate(this.child, this.toggle);
                            var template = Hogan.compile(templateString);
                            return template.render(_.extend({
                                renderMixin: function() {
                                    return function () {
                                        if (this.child && this[this.child]) {
                                            return this[this.child]().call(this, this.toggle);
                                        }
                                    };
                                }
                            }, res.locals, this));
                        }
                    };
                }
            };
        }

        function checkbox(key, opts) {
            opts = opts || {};
            opts.required = opts.required || false;
            opts.toggle = fields[key] && fields[key].toggle;
            var selected = false;
            var fieldLabel = fields && fields[key] ? fields[key].label : false;
            if (this.values && this.values[key] !== undefined) {
                selected = this.values[key].toString() === 'true';
            }
            return _.extend(opts, {
                key: key,
                error: this.errors && this.errors[key],
                invalid: this.errors && this.errors[key] && opts.required,
                label: t(fieldLabel || 'fields.' + key + '.label'),
                selected: selected,
                className: classNames(key) || 'block-label'
            });
        }

        var mixins = {
            'input-text': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText
            },
            'input-text-compound': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText,
                options: {
                    compound: true
                }
            },
            'input-text-code': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText,
                options: {
                    className: 'input-code'
                }
            },
            'input-number': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText,
                options: {
                    pattern: '[0-9]*'
                }
            },
            'input-phone': {
                path: 'partials/forms/input-text-group',
                renderWith: inputText,
                options: {
                    maxlength: 18
                }
            },
            textarea: {
                path: 'partials/forms/textarea-group',
                renderWith: inputText
            },
            'radio-group': {
                path: 'partials/forms/radio-group',
                renderWith: optionGroup
            },
            select: {
                path: 'partials/forms/select',
                renderWith: inputText,
                options: optionGroup
            },
            checkbox: {
                path: 'partials/forms/checkbox',
                renderWith: checkbox
            },
            'checkbox-compound': {
                path: 'partials/forms/checkbox',
                renderWith: checkbox,
                options: {
                    compound: true
                }
            },
            'checkbox-required': {
                path: 'partials/forms/checkbox',
                renderWith: checkbox,
                options: {
                    required: true
                }
            },
            'input-submit': {
                handler: function() {
                    return function (props) {
                        props = (props || '').split(' ');
                        var def = 'next',
                        value = props[0] || def,
                        id = props[1];

                        var obj = {
                            value: t('buttons.' + value),
                            id: id
                        };
                        return compiled['partials/forms/input-submit'].render(obj);
                    };
                }
            },
            'input-date': {
                handler: function() {
                    /**
                    * props: '[value] [id]'
                    */
                    return function (key) {
                        key = extractKey(key);
                        // Exact unless there is a inexact property against the fields key.
                        var isExact = fields[key] ? fields[key].inexact !== true : true;

                        var parts = [],
                        dayPart, monthPart, yearPart;

                        if (isExact) {
                            dayPart = compiled['partials/forms/input-text-group'].render(inputText.call(this, key + '-day', { pattern: '[0-9]*', min: 1, max: 31, maxlength: 2, hintId: key + '-hint', date: true }));
                            parts.push(dayPart);
                        }

                        monthPart = compiled['partials/forms/input-text-group'].render(inputText.call(this, key + '-month', { pattern: '[0-9]*', min: 1, max: 12, maxlength: 2, hintId: key + '-hint', date: true }));
                        yearPart = compiled['partials/forms/input-text-group'].render(inputText.call(this, key + '-year', { pattern: '[0-9]*', maxlength: 4, hintId: key + '-hint', date: true }));
                        parts = parts.concat(monthPart, yearPart);

                        return parts.join('\n');
                    };
                }
            }
        };

        // loop through mixins object and attach their handler methods
        // to res.locals['mixin-name'].
        _.each(mixins, function (mixin, name) {
            var handler = _.isFunction(mixin.handler) ? mixin.handler : function () {
                return function (key) {
                    key = extractKey.call(this, key);
                    return compiled[mixin.path]
                        .render(mixin.renderWith.call(this, key, _.isFunction(mixin.options)
                            ? mixin.options.call(this, key)
                            : mixin.options
                        ));
                };
            };
            res.locals[name] = handler;
        });

        res.locals.currency = function () {
            return function (txt) {
                var value = parseFloat(Hogan.compile(txt).render(this));
                if (isNaN(value)) {
                    return txt;
                } else if (value % 1 === 0) {
                    value = value.toString();
                } else {
                    value = value.toFixed(2);
                }
                return '£' + value;
            };
        };

        res.locals.date = function () {
            return function (txt) {
                txt = (txt || '').split('|');
                var value = Hogan.compile(txt[0]).render(this);
                return moment(value).format(txt[1] || 'D MMMM YYYY');
            };
        };

        res.locals.hyphenate = function () {
            return function (txt) {
                txt = txt || '';
                var value = Hogan.compile(txt).render(this);
                return value.trim().toLowerCase().replace(/\s+/g, '-');
            };
        };

        res.locals.uppercase = function () {
            return function (txt) {
                txt = txt || '';
                return Hogan.compile(txt).render(this).toUpperCase();
            };
        };

        res.locals.lowercase = function () {
            return function (txt) {
                txt = txt || '';
                return Hogan.compile(txt).render(this).toLowerCase();
            };
        };

        res.locals.selected = function () {
            return function (txt) {
                var bits = txt.split('='),
                    val;
                if (this.values && this.values[bits[0]] !== undefined) {
                    val = this.values[bits[0]].toString();
                }
                return val === bits[1] ? ' checked="checked"' : '';
            };
        };

        /**
        * Use on whole sentences
        */
        res.locals.time = function () {
            return function (txt) {
                txt = txt || '';
                txt = Hogan.compile(txt).render(this);
                txt = txt.replace(/12:00am/i, 'midnight').replace(/^midnight/, 'Midnight');
                txt = txt.replace(/12:00pm/i, 'midday').replace(/^middday/, 'Midday');
                return txt;
            };
        };

        res.locals.t = function () {
            return function (txt) {
                txt = Hogan.compile(txt).render(this);
                return t.apply(req, [txt, this]);
            };
        };

        res.locals.url = function () {
            return function (url) {
                url = Hogan.compile(url).render(this);
                return req.baseUrl ? path.resolve(req.baseUrl, url) : url;
            };
        };

        next();
    };

};
