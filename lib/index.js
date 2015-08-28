var Nodemailer = require('nodemailer');
var Templating = require('email-templates');
var HtmlToText = require('nodemailer-html-to-text').htmlToText();
var Hoek = require('hoek');
var Path = require('path');

var internals = {
    defaults: {
        emailDefaults: {}
    }
};

exports = module.exports = function(config) {

    this.config = Hoek.applyToDefaults(internals.defaults, config);

    // This will be the template renderer after init
    this.templater = null;

    // Maybe someday use nodemailer-smtp-pool/queueing for large amounts of email
    // Create SMTP transport for non-dev, or use direct transport for dev
    this.transport = Nodemailer.createTransport(this.config.nodemailer);
    this.transport.use('compile', HtmlToText);
};

exports.prototype.send = function(name, emailAddr, locals, cb) {

    var self = this;

    Hoek.assert(this.templater, 'Email template files are not ready in time to send.');

    this.templater(name, locals, function(err, html, text) {

        // Get defaults for this type of email
        var defaults;

        try {
            emailDefaults = require(Path.join(self.config.directory, '/' + name + '/defaults'));
        } catch (e) {
            emailDefaults = {};
        }

        var sendSettings = {};
        Hoek.merge(sendSettings, self.config.emailDefaults);
        Hoek.merge(sendSettings, emailDefaults);
        Hoek.merge(sendSettings, {
            to:  emailAddr,
            html: html,
            text: text
        });

        self.transport.sendMail(sendSettings, function(err, responseStatus) {

            cb(err, responseStatus);
        });

    });
};

exports.prototype.init = function(cb) {

    var self = this;

    Templating(this.config.directory, function(err, templater) {

        if (err) return cb(err);

        // Now we're all ready
        self.templater = templater;

        cb();
    });
};