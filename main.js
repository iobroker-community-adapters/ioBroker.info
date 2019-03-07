/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const axios = require('axios');

let systemLang = "en";
let newsLang = "en";

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
let adapter;
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'info',
        unload: function (callback) {
            try {
                adapter.log.info('cleaned everything up...');
                callback();
            } catch (e) {
                callback();
            }
        },
        objectChange: function (id, obj) {
            // Warning, obj can be null if it was deleted
            adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
        },
        stateChange: function (id, state) {
            // Warning, state can be null if it was deleted
            adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

            // you can use the ack flag to detect if it is status (true) or command (false)
            if (state && !state.ack) {
                adapter.log.info('ack is not set!');
            }
        },
        message: function (obj) {
            if (typeof obj == 'object' && obj.message) {
                if (obj.command == 'send') {
                    // e.g. send email or pushover or whatever
                    console.log('send command');

                    // Send response in callback if required
                    if (obj.callback)
                        adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
                }
            }
        },
        ready: function () {
            adapter.getForeignObject('system.config', (err, data) => {
                if (data && data.common) {
                    systemLang = data.common.language;
                }
                newsLang = systemLang;
                if (newsLang !== "de" && newsLang !== "ru") {
                    newsLang = "en";
                }
                main();
            });
        }
    });

    adapter = new utils.Adapter(options);

    return adapter;
}

const checkNews = function () {

    const newsLink = 'https://api.feednami.com/api/v1.1/feeds/load?url=http%3A%2F%2Fwww.iobroker.net%2Fdocu%2F%3Ffeed%3Drss2%26lang%3D' + newsLang;

    axios(newsLink).then(function (feed) {
        adapter.log.info("News feed readed...");
        adapter.log.debug(feed);
        adapter.setState('newsfeed', {val: JSON.stringify(feed), ack: true});
        adapter.getState('lastPopupWarningDate', function (err, state) {
            adapter.log.debug("lastPopupWarningDate " + state);
            const lastInfo = new Date(state ? state : 0);
            const infos = [];
            feed.entries.forEach(function (entry) {
                let pubDate = new Date(entry.pubDate);
                if (entry.title.indexOf('*') === 0 && pubDate > lastInfo) {
                    const info = {};
                    info.title = entry.title;
                    info.pubDate = entry.pubDate;
                    info.description = entry.description;
                    infos.push(info);
                }
            });
            if (infos.length > 0) {
                adapter.setState('popupReaded', {val: false, ack: true});
                adapter.setState('lastPopupWarning', {val: JSON.stringify(infos), ack: true});
                adapter.setState('lastPopupWarningDate', {val: new Date(), ack: true});
            }
        });
    }).catch(function (error) {
        adapter.log.error(error);
    });
};

function main() {
    //checkNews();
    //setInterval(checkNews, 30 * 60 * 1000);
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
