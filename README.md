# passports-template-mixins
A middleware that exposes a series of Mustache mixins on `res.locals` to ease usage of forms, translations, and some other things.

It takes in two arguments, a `fields` object containing field configuration, and an [options object](#options).

## Installation

```javascript
npm install [--save] hmpo-template-mixins;
```

## Usage

```javascript
var express = require('express');

var i18n = require('i18n-future');

var fields = require('./routes/renew-your-passport/fields');

app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));

app.use(i18n.middleware());
app.use(require('hmpo-template-mixins')(fields, { sharedTranslationsKey: 'passport.renew' }));

app.use(function (req, res) {
    // NOTE: res.locals.partials has been set.

    res.render('example-template');
});
```

## Translation

By default any function set to `req.translate` will be used for translation if it exists. For example, that generate using [i18n-future](https://npmjs.com/package.i18n-future) middleware.

## Options

### viewsDirectory

Allows you override the directory that the module checks for partials in - Default: the root of this project

### viewEngine

Allows you to alter the file extension of the templates - Default: 'html'

### sharedTranslationsKey

Prefixes keys for translation - Default: ''

### translate

Defines a custom translation method - Default: `req.translate`

## Mustache mixins available

```
t
time
selected
lowercase
uppercase
hyphenate
date
currency
select
input-text
input-date
input-text-compound
input-text-hidden-label
input-text-code
input-phone
radio-group
checkbox
checkbox-compound
checkbox-required
input-submit
textarea
```
