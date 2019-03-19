/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const axios = require('axios');
const sistm = require('systeminformation');

const cpuUsed = [];
const memUsed = [];
const fsUsed = {};

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

const setState = function (channel, name, key, type, value) {
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

    adapter.setState('sysinfo.' + channel + '.' + name + '_' + key, {val: value, ack: true});
};

const updateSysinfo = function () {

    //SYSTEM
    sistm.system()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if (data[key].length > 1) {
                        setState('system', 'system', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.bios()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if (data[key].length) {
                        setState('system', 'bios', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.baseboard()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if (data[key].length) {
                        setState('system', 'baseboard', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.chassis()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if (data[key].length) {
                        setState('system', 'chassis', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    //CPU
    sistm.cpu()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] === 'number') {
                        setState('cpu', 'cpu', key, typeof data[key], data[key]);
                    } else {
                        Object.keys(data[key]).forEach(function (key2) {
                            setState('cpu', 'cpu', key + "-" + key2, 'number', data[key][key2]);
                        });
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.currentLoad()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if (typeof data[key] === "number") {
                        setState('cpu', 'currentLoad', key, typeof data[key], data[key]);
                    }
                });
                setInterval(updateCurrentCPUInfos, 2000);
            })
            .catch(error => adapter.log.error(error));

    //MEMORY
    sistm.mem()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    setState('memory', 'mem', key, typeof data[key], data[key]);
                });
                setInterval(updateCurrentMemoryInfos, 2000);
            })
            .catch(error => adapter.log.error(error));

    //OS
    sistm.osInfo()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if (data[key].length) {
                        setState('os', 'info', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.versions()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if (data[key].length) {
                        setState('os', 'versions', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    //DISKS
    sistm.blockDevices()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if (data.length > 0) {
                        Object.keys(data[key]).forEach(function (key2) {
                            if ((typeof data[key][key2] === 'string' && data[key][key2].length) || typeof data[key][key2] !== 'string') {
                                setState('disks', 'blockDevices', "dev_" + key + "_" + key2, typeof data[key][key2], data[key][key2]);
                            }
                        });
                    }
                });
            })
            .catch(error => console.error(error));

    sistm.diskLayout()
            .then(data => {
                if (data.length > 0) {
                    Object.keys(data).forEach(function (key) {
                        Object.keys(data[key]).forEach(function (key2) {
                            if ((typeof data[key][key2] === 'string' && data[key][key2].length) || typeof data[key][key2] !== 'string') {
                                setState('disks', 'diskLayout', "dev_" + key + "_" + key2, typeof data[key][key2], data[key][key2]);
                            }
                        });
                    });
                }
            })
            .catch(error => console.error(error));

    sistm.fsSize()
            .then(data => {
                if (data.length > 0) {
                    Object.keys(data).forEach(function (key) {
                        fsUsed[key] = [];
                        Object.keys(data[key]).forEach(function (key2) {
                            if ((typeof data[key][key2] === 'string' && data[key][key2].length) || typeof data[key][key2] !== 'string') {
                                setState('disks', 'fsSize', "fs_" + key + "_" + key2, typeof data[key][key2], data[key][key2]);
                            }
                            if (key2 === "used") {
                                setState('disks', 'fsSize', "fs_" + key + "_used_hist", "array", "[]");
                            }
                        });
                    });
                    setInterval(updateCurrentFilesystemInfos, 5000);
                }
            })
            .catch(error => console.error(error));


};

const updateCurrentCPUInfos = function () {

    sistm.mem()
            .then(data => {
                adapter.setState('sysinfo.cpu.currentLoad_avgload', {val: data['avgload'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_currentload', {val: data['currentload'], ack: true});
                cpuUsed.push(data['currentload']);
                if (cpuUsed.length > 30) {
                    cpuUsed.shift();
                }
                adapter.setState('sysinfo.cpu.currentLoad_currentload_hist', {val: cpuUsed.toString(), ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_currentload_user', {val: data['currentload_user'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_currentload_system', {val: data['currentload_system'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_currentload_nice', {val: data['currentload_nice'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_currentload_idle', {val: data['currentload_idle'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_currentload_irq', {val: data['currentload_irq'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_raw_currentload', {val: data['raw_currentload'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_raw_currentload_user', {val: data['raw_currentload_user'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_raw_currentload_system', {val: data['raw_currentload_system'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_raw_currentload_nice', {val: data['raw_currentload_nice'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_raw_currentload_idle', {val: data['raw_currentload_idle'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad_currentload_irq', {val: data['currentload_irq'], ack: true});
            })
            .catch(error => adapter.log.error(error));

};

const updateCurrentMemoryInfos = function () {

    sistm.mem()
            .then(data => {
                adapter.setState('sysinfo.memory.mem_free', {val: data['free'], ack: true});
                adapter.setState('sysinfo.memory.mem_used', {val: data['used'], ack: true});
                memUsed.push(data['used']);
                if (memUsed.length > 30) {
                    memUsed.shift();
                }
                adapter.setState('sysinfo.memory.mem_used_hist', {val: memUsed.toString(), ack: true});
                adapter.setState('sysinfo.memory.mem_active', {val: data['active'], ack: true});
                adapter.setState('sysinfo.memory.mem_available', {val: data['available'], ack: true});
                adapter.setState('sysinfo.memory.mem_buffcache', {val: data['buffcache'], ack: true});
                adapter.setState('sysinfo.memory.mem_swapused', {val: data['swapused'], ack: true});
                adapter.setState('sysinfo.memory.mem_swapfree', {val: data['swapfree'], ack: true});
            })
            .catch(error => adapter.log.error(error));

};

const updateCurrentFilesystemInfos = function () {

    sistm.fsSize()
            .then(data => {
                if (data.length > 0) {
                    Object.keys(data).forEach(function (key) {
                        adapter.setState('sysinfo.disks.fsSize_fs_' + key + '_used', {val: data[key]['used'], ack: true});
                        fsUsed[key].push(data[key]['used']);
                        if (fsUsed[key].length > 12) {
                            fsUsed[key].shift();
                        }
                        adapter.setState('sysinfo.disks.fsSize_fs_' + key + '_used_hist', {val: fsUsed[key].toString(), ack: true});
                        adapter.setState('sysinfo.disks.fsSize_fs_' + key + '_use', {val: data[key]['use'], ack: true});
                    });
                }
            })
            .catch(error => console.error(error));

};

function main() {
    checkNews();
    setInterval(checkNews, 30 * 60 * 1000);
    updateSysinfo();
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
