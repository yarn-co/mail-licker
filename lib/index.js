const Nodemailer = require('nodemailer');
const Templating = require('email-templates');
const HtmlToText = require('nodemailer-html-to-text').htmlToText();
const Hoek = require('hoek');
const Path = require('path');

const internals = {
    defaults: {
        emailDefaults: {}
    }
};

exports = module.exports = function (config) {

    this.config = Hoek.applyToDefaults(internals.defaults, config);


    // This will be the template renderer after init
    this.templater = null;

    // Maybe someday use nodemailer-smtp-pool/queueing for large amounts of email
    // Create SMTP transport for non-dev, or use direct transport for dev
    this.transport = Nodemailer.createTransport(this.config.nodemailer);
    this.transport.use('compile', HtmlToText);
};

exports.prototype.send = function (name, sendLocals, locals, cb) {

    const self = this;

    Hoek.assert(this.templater, 'Email template files are not ready in time to send.');

    this.templater(name, locals, (err, html, text) => {

        if (err) {
            return cb(err);
        }

        // Get defaults for this type of email
        let emailDefaults;

        try {
            emailDefaults = require(Path.join(self.config.directory, '/' + name + '/defaults'));
        } catch (e) {
            emailDefaults = {};
        }

        const sendSettings = {};
        Hoek.merge(sendSettings, self.config.emailDefaults);
        Hoek.merge(sendSettings, emailDefaults);

        const mainContent = {
            html: html,
            text: text
        }

        if (typeof sendLocals === 'object') {
            Hoek.merge(sendSettings, sendLocals);
        }
        else if (typeof sendLocals === 'string') {
            mainContent.to = sendLocals;
        }

        Hoek.merge(sendSettings, mainContent);

        self.transport.sendMail(sendSettings, (err, responseStatus) => {

            console.log('self.transport.sendMail', err, responseStatus);

            return cb(err, responseStatus);
        });
    });
};

exports.prototype.init = function (cb) {

    const self = this;

    Templating(this.config.directory, (err, templater) => {

        if (err) {
            return cb(err);
        }

        // Now we're all ready
        self.templater = templater;

        return cb();
    });
};
