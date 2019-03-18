/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const axios = require('axios');
const sistm = require('systeminformation');

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
            if (typeof obj === 'object' && obj.message) {
                if (obj.command === 'send') {
                    // e.g. send email or pushover or whatever
                    console.log('send command');

                    // Send response in callback if required
                    if (obj.callback)
                        adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
                }
            }
        },
        ready: function () {
            main();
        }
    });

    adapter = new utils.Adapter(options);

    return adapter;
}

const checkNews = function () {

    const newsLink = 'https://raw.githubusercontent.com/iobroker-community-adapters/ioBroker.info/master/data/news.json';

    axios(newsLink).then(function (resp) {
        adapter.log.info("Popup-News readed...");
        adapter.setState('newsfeed', {val: JSON.stringify(resp.data), ack: true});
    }).catch(function (error) {
        adapter.log.error(error);
    });
};

const setState = function (channel, name, key, type) {
    adapter.setObjectNotExists('sysinfo.' + channel + '.' + name + '_' + key, {
        type: "state",
        common: {
            name: name + " " + key,
            type: type,
            role: "value",
            read: true,
            write: false
        },
        native: {}
    });
};

const updateSysinfo = function () {

    //SYSTEM
    sistm.system()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    const val = data[key];
                    if (data[key].length > 1) {
                        setState('system', 'system', key, typeof data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.bios()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    const val = data[key];
                    if (data[key].length) {
                        setState('system', 'bios', key, typeof data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.baseboard()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    const val = data[key];
                    if (data[key].length) {
                        setState('system', 'baseboard', key, typeof data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.chassis()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    const val = data[key];
                    if (data[key].length) {
                        setState('system', 'chassis', key, typeof data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    //CPU
    sistm.cpu()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    const val = data[key];
                    if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] === 'number') {
                        setState('cpu', 'cpu', key, typeof data[key]);
                    } else {
                        Object.keys(data[key]).forEach(function (key2) {
                            setState('cpu', 'cpu', key + "-" + key2, 'number');
                        });
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    //OS
    sistm.osInfo()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    const val = data[key];
                    if (data[key].length) {
                        setState('os', 'info', key, typeof data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));
    
    sistm.versions()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    const val = data[key];
                    if (data[key].length) {
                        setState('os', 'versions', key, typeof data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));
};

const updateCurrentInfos = function () {

    //MEMORY
    sistm.mem()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    const val = data[key];
                    if (data[key].length) {
                        setState('memory', 'mem', key, typeof data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

};

function main() {
    checkNews();
    setInterval(checkNews, 30 * 60 * 1000);
    updateSysinfo();
    setInterval(updateCurrentInfos, 2000);
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
