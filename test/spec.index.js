var mixins = require('../lib/template-mixins');

var Hogan = require('hogan.js');

function translate(key) {
    return key;
}

describe('Template Mixins', function () {

    var req, res, next, render, middleware;

    beforeEach(function () {
        req = {};
        res = {
            locals: {}
        };
        next = sinon.stub();
    });

    it('returns a middleware', function () {
        mixins().should.be.a('function');
        mixins().length.should.equal(3);
    });

    it('calls next', function () {
        mixins()(req, res, next);
        next.should.have.been.calledOnce;
    });

    describe('with stubbed Hogan', function () {

        beforeEach(function () {
            render = sinon.stub();
            sinon.stub(Hogan, 'compile').returns({
                render: render
            });
        });

        afterEach(function () {
            Hogan.compile.restore();
        });

        describe('input-text', function () {

            beforeEach(function () {
                middleware = mixins({}, { translate: translate });
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-text'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-text']().should.be.a('function');
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('looks up default field label if nothing is set', function () {
                middleware = mixins({
                    'field-name': {
                    }
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('uses label when available for the field', function () {
                middleware = mixins({
                    'field-name': {
                        label: 'Label text'
                    }
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Label text'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({}, { translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('should have an autocomplete setting if specified', function () {
                middleware = mixins({
                    'field-name': {
                        'autocomplete': 'custom'
                    }
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    autocomplete: 'custom'
                }));
            });

            it('should default to no autocomplete attribute ', function () {
                middleware = mixins({
                    'field-name': {
                    }
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    autocomplete: sinon.match.undefined
                }));
            });

            it('should have classes if one or more were specified against the field', function () {
                middleware = mixins({
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('uses maxlength property set at a field level over default option', function () {
                middleware = mixins({
                    'field-name': {
                        'validate': [
                            { type: 'maxlength', arguments: 10 }
                        ]
                    }
                });
                middleware(req, res, next);
                res.locals['input-phone']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    maxlength: 10
                }));
            });

            it('uses locales translation property', function () {
                var translate = sinon.stub().withArgs('field-name.label').returns('Field name');
                middleware = mixins({
                    'field-name': {
                        'label': 'field-name.label'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-phone']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

            it('includes a hint if it is defined in the locales', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns('Field hint');
                middleware = mixins({
                    'field-name': {
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('includes a hint if it is defined in translation', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns('Field hint');
                middleware = mixins({
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('does not include a hint if it is not defined in translation', function () {
                middleware = mixins({
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: null
                }));
            });

            it('sets `labelClassName` to "form-label-bold" by default', function () {
                middleware = mixins({
                    'field-name': {}
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'form-label-bold'
                }));
            });

            it('overrides `labelClassName` when set in field options', function () {
                middleware = mixins({
                    'field-name': {
                        labelClassName: 'visuallyhidden'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'visuallyhidden'
                }));
            });

            it('sets all classes of `labelClassName` option', function () {
                middleware = mixins({
                    'field-name': {
                        labelClassName: ['abc', 'def']
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'abc def'
                }));
            });

            it('sets additional element attributes', function () {
                middleware = mixins({
                    'field-name': {
                        attributes: [
                            { attribute: 'autocomplete', value: 'true' }
                        ]
                    }
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    attributes: [
                        { attribute: 'autocomplete', value: 'true' }
                    ]
                }));
            });

            it('allows configuration of a non-required input with a visuallyhidden label', function () {
                middleware = mixins({
                    'field-name': {
                        required: false,
                        labelClassName: 'visuallyhidden'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: false,
                    labelClassName: 'visuallyhidden'
                }));
            });

            it('by default, assumes the field isn\'t required', function () {
                middleware = mixins({
                    'field-name': {}
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: false
                }));
            });

            it('allows configuration of required status with the required property', function () {
                middleware = mixins({
                    'field-name': {
                        required: true
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });

            it('allows configuration of required status with the required validator', function () {
                middleware = mixins({
                    'field-name': {
                        validate: ['required']
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: true
                }));
            });

            it('the required property takes precedence over the required validator', function () {
                middleware = mixins({
                    'field-name': {
                        required: false,
                        validate: ['required']
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    required: false
                }));
            });

        });

        describe('input-date', function () {

            beforeEach(function () {
                middleware = mixins(translate, {});
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-date'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-date']().should.be.a('function');
            });

            it('renders thrice if the field is not marked as inexact', function () {
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');
                render.should.have.been.calledThrice;
            });

            it('renders twice if the field is marked as inexact', function () {
                var middlewareWithFieldNameMarkedAsInexact = mixins({
                    'field-name': {
                        'inexact': true
                    }
                });
                middlewareWithFieldNameMarkedAsInexact(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');
                render.should.have.been.calledTwice;
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                var dayCall = render.getCall(0),
                    monthCall = render.getCall(1),
                    yearCall = render.getCall(2);

                dayCall.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name-day.label'
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name-month.label'
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name-year.label'
                }));
            });

            it('autocomplete should have a sufix of -day -month and -year', function () {
                var autocompletemiddleware = mixins({
                    'field-name': {
                        'autocomplete': 'bday'
                    }
                });
                autocompletemiddleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                var dayCall = render.getCall(0),
                    monthCall = render.getCall(1),
                    yearCall = render.getCall(2);

                dayCall.should.have.been.calledWith(sinon.match({
                    autocomplete: 'bday-day'
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                    autocomplete: 'bday-month'
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                    autocomplete: 'bday-year'
                }));
            });

            it('autocomplete should be set as exact values if an object is given', function () {
                var autocompletemiddleware = mixins({
                    'field-name': {
                        'autocomplete': {
                            day: 'day-type',
                            month: 'month-type',
                            year: 'year-type'
                        }
                    }
                });
                autocompletemiddleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                var dayCall = render.getCall(0),
                    monthCall = render.getCall(1),
                    yearCall = render.getCall(2);

                dayCall.should.have.been.calledWith(sinon.match({
                    autocomplete: 'day-type'
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                    autocomplete: 'month-type'
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                    autocomplete: 'year-type'
                }));
            });

            it('autocomplete should set autocomplete to off if off is specified', function () {
                var autocompletemiddleware = mixins({
                    'field-name': {
                        'autocomplete': 'off'
                    }
                });
                autocompletemiddleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                var dayCall = render.getCall(0),
                    monthCall = render.getCall(1),
                    yearCall = render.getCall(2);

                dayCall.should.have.been.calledWith(sinon.match({
                    autocomplete: 'off'
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                    autocomplete: 'off'
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                    autocomplete: 'off'
                }));
            });

            it('autocomplete should default to no attribute across all date fields', function () {
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                var dayCall = render.getCall(0),
                    monthCall = render.getCall(1),
                    yearCall = render.getCall(2);

                dayCall.should.have.been.calledWith(sinon.match({
                    autocomplete: undefined
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                    autocomplete: undefined
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                    autocomplete: undefined
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({}, { translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                var dayCall = render.getCall(0),
                    monthCall = render.getCall(1),
                    yearCall = render.getCall(2);

                dayCall.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name-day.label'
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name-month.label'
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name-year.label'
                }));
            });

            it('sets a date boolean to conditionally show input errors', function () {
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.getCall(0).should.have.been.calledWithExactly(sinon.match({
                    date: true
                }));
                render.getCall(1).should.have.been.calledWithExactly(sinon.match({
                    date: true
                }));
                render.getCall(2).should.have.been.calledWithExactly(sinon.match({
                    date: true
                }));
            });

        });

        describe('input-number', function () {

            beforeEach(function () {
                middleware = mixins({}, { translate: translate });
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-number'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-number']().should.be.a('function');
            });

            it('adds a pattern attribute to trigger the number keypad on mobile devices', function () {
                middleware(req, res, next);
                res.locals['input-number']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    pattern: '[0-9]*'
                }));
            });

        });

        describe('input-submit', function () {

            beforeEach(function () {
                middleware = mixins({}, { translate: translate });
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-submit'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-submit']().should.be.a('function');
            });

            it('looks up button value with default key of "next"', function () {
                middleware(req, res, next);
                res.locals['input-submit']().call(res.locals);
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.next'
                }));
            });

            it('looks up button value with key if provided', function () {
                middleware(req, res, next);
                res.locals['input-submit']().call(res.locals, 'button-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.button-id'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({}, { translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-submit']().call(res.locals, 'button-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'name.space.buttons.button-id'
                }));
            });

        });

        describe('textarea', function () {

            beforeEach(function () {
                middleware = mixins({}, { translate: translate });
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals.textarea.should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals.textarea().should.be.a('function');
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({}, { translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('should have classes if one or more were specified against the field', function () {
                middleware = mixins({
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                });
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('uses maxlength property set at a field level over default option', function () {
                middleware = mixins({
                    'field-name': {
                        'validate': [
                            { type: 'maxlength', arguments: 10 }
                        ]
                    }
                });
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    maxlength: 10
                }));
            });

            it('uses locales translation property', function () {
                var translate = sinon.stub().withArgs('field-name.label').returns('Field name');
                middleware = mixins({
                    'field-name': {
                        'label': 'field-name.label'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals.textarea().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

            it('sets `labelClassName` to "form-label-bold" by default', function () {
                middleware = mixins({
                    'field-name': {}
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'form-label-bold'
                }));
            });

            it('overrides `labelClassName` when set in field options', function () {
                middleware = mixins({
                    'field-name': {
                        'labelClassName': 'visuallyhidden'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'visuallyhidden'
                }));
            });

            it('sets all classes of `labelClassName` option', function () {
                middleware = mixins({
                    'field-name': {
                        labelClassName: ['abc', 'def']
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'abc def'
                }));
            });

            it('sets additional element attributes', function () {
                middleware = mixins({
                    'field-name': {
                        attributes: [
                            { attribute: 'spellcheck', value: 'true' },
                            { attribute: 'autocapitalize', value: 'sentences' }
                        ]
                    }
                });
                middleware(req, res, next);
                res.locals['textarea']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    attributes: [
                        { attribute: 'spellcheck', value: 'true' },
                        { attribute: 'autocapitalize', value: 'sentences' }
                    ]
                }));
            });

        });

        describe('checkbox', function () {

            beforeEach(function () {
                middleware = mixins({}, { translate: translate });
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['checkbox'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['checkbox']().should.be.a('function');
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins({}, { translate: translate, sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('uses locales translation property', function () {
                var translate = sinon.stub().withArgs('field-name.label').returns('Field name');
                middleware = mixins({
                    'field-name': {
                        'label': 'field-name.label'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

            it('should default className `block-label`', function () {
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'block-label'
                }));
            });

            it('should override default className if one was specified against the field', function () {
                middleware = mixins({
                    'field-name': {
                        'className': 'overwritten'
                    }
                });
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'overwritten'
                }));
            });

        });

        describe('radio-group', function () {

            beforeEach(function () {
                middleware = mixins({}, { translate: translate });
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['radio-group'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['radio-group']().should.be.a('function');
            });

            it('looks up field options', function () {
                middleware = mixins({
                    'field-name': {
                        options: [{
                            label: 'Foo',
                            value: 'foo'
                        }]
                    }
                });
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    options: [{
                        label: 'Foo',
                        value: 'foo',
                        selected: false,
                        toggle: undefined
                    }]
                }));
            });

            it('should have classes if one or more were specified against the field', function () {
                middleware = mixins({
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                });
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('adds `legendClassName` if it exists as a string or an array', function () {
                middleware = mixins({
                    'field-name-1': {
                        legend: {
                            className: 'abc def'
                        }
                    },
                    'field-name-2': {
                        legend: {
                            className: ['abc', 'def']
                        }
                    }
                });

                middleware(req, res, next);

                res.locals['radio-group']().call(res.locals, 'field-name-1');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));

                res.locals['radio-group']().call(res.locals, 'field-name-2');
                render.should.have.been.calledWith(sinon.match({
                    legendClassName: 'abc def'
                }));
            });

            it('uses locales translation for legend if a field value isn\'t provided', function () {
                translate = sinon.stub().withArgs('fields.field-name.legend').returns('Field legend');
                middleware = mixins({
                    'field-name': {}
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    legend: 'Field legend'
                }));
            });

            it('uses locales translation for hint if a field value isn\'t provided', function () {
                translate = sinon.stub().withArgs('fields.field-name.hint').returns('Field hint');
                middleware = mixins({
                    'field-name': {}
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('doesn\'t add a hint if the hint doesn\'t exist in locales', function () {
                middleware = mixins({
                    'field-name': {}
                });
                middleware(req, res, next);
                res.locals['radio-group']().call(res.locals, 'field-name');
                render.should.have.been.calledWithExactly(sinon.match({
                    hint: null
                }));
            });

        });

        describe('select', function () {

            beforeEach(function () {
                middleware = mixins({}, { translate: translate });
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['select'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['select']().should.be.a('function');
            });

            it('defaults `labelClassName` to "form-label-bold"', function () {
                middleware = mixins({
                    'field-name': {}
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'form-label-bold'
                }));
            });

            it('overrides `labelClassName` when set in field options', function () {
                middleware = mixins({
                    'field-name': {
                        labelClassName: 'visuallyhidden'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'visuallyhidden'
                }));
            });

            it('sets all classes of `labelClassName` option', function () {
                middleware = mixins({
                    'field-name': {
                        labelClassName: ['abc', 'def']
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    labelClassName: 'abc def'
                }));
            });

            it('includes a hint if it is defined in the locales', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns('Field hint');
                middleware = mixins({
                    'field-name': {
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('includes a hint if it is defined in translation', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns('Field hint');
                middleware = mixins({
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: 'Field hint'
                }));
            });

            it('does not include a hint if it is not defined in translation', function () {
                var translate = sinon.stub().withArgs('field-name.hint').returns(null);
                middleware = mixins({
                    'field-name': {
                        'hint': 'field-name.hint'
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    hint: null
                }));
            });

            it('sets labels to an empty string for translations that are returned as `undefined`', function () {
                var translate = sinon.stub().returns(undefined);
                middleware = mixins({
                    'field-name': {
                        options: [
                            ''
                        ]
                    }
                }, { translate: translate });
                middleware(req, res, next);
                res.locals['select']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    options: [
                        { label: '', selected: false, toggle: undefined, value: '' }
                    ]
                }));
            });
        });

    });

    describe('without stubbed Hogan', function () {

        describe('date', function () {

            beforeEach(function () {
                middleware = mixins();
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['date'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['date']().should.be.a('function');
            });

            it('formats a date', function () {
                middleware(req, res, next);
                res.locals['date']().call(res.locals, '2015-03-26').should.equal('26 March 2015');
            });

            it('applys a date format if specified', function () {
                middleware(req, res, next);
                res.locals['date']().call(res.locals, '2015-03|MMMM YYYY').should.equal('March 2015');
            });

        });

        describe('hyphenate', function () {

            beforeEach(function () {
                Hogan = require('hogan.js');
                middleware = mixins();
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['hyphenate'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['hyphenate']().should.be.a('function');
            });

            it('hyphenates a string with a single whitespace character', function () {
                middleware(req, res, next);
                res.locals['hyphenate']().call(res.locals, 'apple blackberry').should.equal('apple-blackberry');
            });

            it('hyphenates a string with multiple whitespace characters', function () {
                middleware(req, res, next);
                res.locals['hyphenate']().call(res.locals, 'apple  blackberry   cherry').should.equal('apple-blackberry-cherry');
            });

        });

        describe('url', function () {

            beforeEach(function () {
                middleware = mixins();
            });

            it('prepends the baseUrl to relative paths', function () {
                req.baseUrl = '/base';
                middleware(req, res, next);
                res.locals.url().call(res.locals, './path').should.equal('/base/path');
                res.locals.url().call(res.locals, 'path').should.equal('/base/path');
            });

            it('returns path if baseUrl is not set', function () {
                req.baseUrl = undefined;
                middleware(req, res, next);
                res.locals.url().call(res.locals, 'path').should.equal('path');
                res.locals.url().call(res.locals, './path').should.equal('./path');
            });

            it('does not prepend the baseUrl to absolute paths', function () {
                req.baseUrl = '/base';
                middleware(req, res, next);
                res.locals.url().call(res.locals, '/path').should.equal('/path');
            });

            it('supports urls defined in template placeholders', function () {
                req.baseUrl = '/base';
                res.locals.href = './link'
                middleware(req, res, next);
                res.locals.url().call(res.locals, '{{href}}').should.equal('/base/link');
            });

        });

    });

});
