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

    function classNameString(obj) {
        if (_.isArray(obj.className)) {
            return obj.className.join(' ');
        } else {
            return obj.className;
        }
    }

    function classNames(key) {
        if (fields[key]) {
            return classNameString(fields[key]);
        }
    }

    return function (req, res, next) {

        var translate = options.translate || req.translate || _.identity;

        var t = function (key) {
            return translate(sharedTranslationsKey + key);
        };

        var conditionaltranslate = function (key) {
            key = sharedTranslationsKey + key;
            var translated = translate(key);
            return translated !== key ? translated : null;
        };

        function inputText(key, extension) {
            extension = extension || {};
            var hint = conditionaltranslate('fields.' + key + '.hint');
            var fieldLabel = fields && fields[key] ? fields[key].label : false;
            return _.extend(extension, {
                id: key,
                className: extension.className || classNames(key),
                type: extension.type || type(key),
                value: this.values && this.values[key],
                label: t(fieldLabel || 'fields.' + key + '.label'),
                hint: hint,
                hintId: extension.hintId || (hint ? key + '-hint' : null),
                error: this.errors && this.errors[key],
                maxlength: maxlength(key) || extension.maxlength,
                required: extension.required !== undefined ? extension.required : true,
                pattern: extension.pattern
            });
        }

        function optionGroup(key) {
            var legendClassName = fields[key] && fields[key].legend;
            if (legendClassName) { legendClassName = classNameString(legendClassName); }
            return {
                'key': key,
                'error': this.errors && this.errors[key],
                'legend': fields[key] && fields[key].legend && fields[key].legend.value,
                'legendClassName': legendClassName,
                'options': _.map(fields[key] && fields[key].options, function (obj) {
                    var selected = false, label, value, toggle;

                    if (typeof obj === 'string') {
                        value = obj;
                        label = obj;
                    } else {
                        value = obj.value;
                        label = obj.label;
                        toggle = obj.toggle;
                    }

                    if (this.values && this.values[key] !== undefined) {
                        selected = this.values[key] === value;
                    }

                    return {
                        label: t(label),
                        value: value,
                        selected: selected,
                        toggle: toggle
                    };
                }, this),
                className: classNames(key)
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
                selected: selected
            });
        }

        res.locals['input-text'] = function () {
            return function (key) {
                return compiled['partials/forms/input-text-group'].render(inputText.call(this, key));
            };
        };

        res.locals['input-date'] = function () {
            return function (key) {
                // Exact unless there is a inexact property against the fields key.
                var isExact = fields[key] ? fields[key].inexact !== true : true;

                var parts = [],
                    dayPart, monthPart, yearPart;

                if (isExact) {
                    dayPart = compiled['partials/forms/input-text-group'].render(inputText.call(this, key + '-day', { pattern: '[0-9]*', min: 1, max: 31, maxlength: 2, hintId: key + '-hint' }));
                    parts.push(dayPart);
                }

                monthPart = compiled['partials/forms/input-text-group'].render(inputText.call(this, key + '-month', { pattern: '[0-9]*', min: 1, max: 12, maxlength: 2, hintId: key + '-hint' }));
                yearPart = compiled['partials/forms/input-text-group'].render(inputText.call(this, key + '-year', { pattern: '[0-9]*', maxlength: 4, hintId: key + '-hint' }));
                parts = parts.concat(monthPart, yearPart);

                return parts.join('\n');
            };
        };

        res.locals['input-text-compound'] = function () {
            return function (key) {
                var obj = { compound: true };
                return compiled['partials/forms/input-text-group'].render(inputText.call(this, key, obj));
            };
        };

        res.locals['input-text-hidden-label'] = function () {
            return function (key) {
                var obj = {
                    hiddenLabel: true,
                    required: false
                };
                return compiled['partials/forms/input-text-group'].render(inputText.call(this, key, obj));
            };
        };

        res.locals['input-text-code'] = function () {
            return function (key) {
                return compiled['partials/forms/input-text-group'].render(inputText.call(this, key, { className: 'input-code' }));
            };
        };

        res.locals['input-phone'] = function () {
            return function (key) {
                return compiled['partials/forms/input-text-group'].render(inputText.call(this, key, { maxlength: 18 }));
            };
        };

        res.locals.textarea = function () {
            return function (key) {
                return compiled['partials/forms/textarea-group'].render(inputText.call(this, key));
            };
        };

        res.locals['radio-group'] = function () {
            return function (key) {
                return compiled['partials/forms/radio-group'].render(optionGroup.call(this, key));
            };
        };

        res.locals.select = function () {
            return function (key) {
                return compiled['partials/forms/select'].render(inputText.call(this, key, optionGroup.call(this, key)));
            };
        };

        res.locals.checkbox = function () {
            return function (key) {
                return compiled['partials/forms/checkbox'].render(checkbox.call(this, key));
            };
        };

        res.locals['checkbox-compound'] = function () {
            var opts = { compound: true };
            return function (key) {
                return compiled['partials/forms/checkbox'].render(checkbox.call(this, key, opts));
            };
        };

        res.locals['checkbox-required'] = function () {
            var opts = { required: true };
            return function (key) {
                return compiled['partials/forms/checkbox'].render(checkbox.call(this, key, opts));
            };
        };

        /**
        * props: '[value] [id]'
        */
        res.locals['input-submit'] = function () {
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
        };

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
                return path.resolve(req.baseUrl, url);
            };
        };

        next();
    };

};
