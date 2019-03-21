/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const axios = require('axios');
const sistm = require('systeminformation');

const cpuUsed = [];
const cpuTemp = [];
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

const setState = function (channel, channel2, key, type, value) {
    const link = 'sysinfo.' + channel + (channel2 ? '.' + channel2 : '');
    adapter.setObjectNotExists(link + '.' + key, {
        type: "state",
        common: {
            name: key,
            type: type,
            role: "value",
            read: true,
            write: false
        },
        native: {}
    });

    adapter.setState(link + '.' + key, {val: value, ack: true});
};

const createChannel = function (channel, channel2, channel3) {
    adapter.setObjectNotExists('sysinfo.' + channel + '.' + channel2 + '.' + channel3, {
        type: "channel",
        common: {
            name: channel3,
            role: "info"
        },
        native: {}
    });
};


const updateSysinfo = function (firstTime) {

    //SYSTEM
    sistm.system()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if ((typeof data[key] === 'string' && data[key].length > 1) || typeof data[key] !== 'string') {
                        setState('system', 'hardware', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.bios()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] !== 'string') {
                        setState('system', 'bios', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.baseboard()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] !== 'string') {
                        setState('system', 'baseboard', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.chassis()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] !== 'string') {
                        setState('system', 'chassis', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    //CPU
    sistm.cpu()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if ((typeof data[key] === 'string' && data[key].length) || (typeof data[key] !== 'object' && typeof data[key] !== 'string')) {
                        setState('cpu', 'info', key, typeof data[key], data[key]);
                    } else if (typeof data[key] === 'object') {
                        Object.keys(data[key]).forEach(function (key2) {
                            setState('cpu', 'info', key + "-" + key2, 'number', data[key][key2]);
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
                if (!adapter.config.noCurrentSysData && adapter.config.cpuSpeed !== 0 && firstTime) {
                    let speed = adapter.config.cpuSpeed;
                    if (!speed) {
                        speed = 2;
                    }
                    adapter.log.info("Reading CPU data every " + speed + " seconds.");
                    setInterval(updateCurrentCPUInfos, speed * 1000);
                }
            })
            .catch(error => adapter.log.error(error));

    sistm.cpuTemperature()
            .then(data => {
                if (data['main'] > -1) {
                    Object.keys(data).forEach(function (key) {
                        if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] !== 'string') {
                            setState('cpu', 'temperature', key, typeof data[key], data[key]);
                        }
                    });
                    if (!adapter.config.noCurrentSysData && adapter.config.cpuSpeed !== 0 && firstTime) {
                        let speed = adapter.config.cpuSpeed;
                        if (!speed) {
                            speed = 2;
                        }
                        adapter.log.info("Reading CPU temp data every " + speed + " seconds.");
                        setInterval(updateCurrentCPUTempInfos, speed * 1000);
                    }
                }
            })
            .catch(error => adapter.log.error(error));

    //MEMORY
    sistm.mem()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    setState('memory', 'info', key, typeof data[key], data[key]);
                });
                if (!adapter.config.noCurrentSysData && adapter.config.memSpeed !== 0 && firstTime) {
                    let speed = adapter.config.memSpeed;
                    if (!speed) {
                        speed = 2;
                    }
                    adapter.log.info("Reading memory data every " + speed + " seconds.");
                    setInterval(updateCurrentMemoryInfos, speed * 1000);
                }
            })
            .catch(error => adapter.log.error(error));

    //OS
    sistm.osInfo()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] !== 'string') {
                        setState('os', 'info', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    sistm.versions()
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] !== 'string') {
                        setState('os', 'versions', key, typeof data[key], data[key]);
                    }
                });
            })
            .catch(error => adapter.log.error(error));

    //DISKS
    sistm.blockDevices()
            .then(data => {
                if (data.length > 0) {
                    Object.keys(data).forEach(function (key) {
                        createChannel('disks', 'blockDevices', 'dev' + key);
                        Object.keys(data[key]).forEach(function (key2) {
                            if ((typeof data[key][key2] === 'string' && data[key][key2].length) || typeof data[key][key2] !== 'string') {
                                setState('disks', 'blockDevices.dev' + key, key2, typeof data[key][key2], data[key][key2]);
                            }
                        });
                    });
                }
            })
            .catch(error => adapter.log.error(error));

    sistm.diskLayout()
            .then(data => {
                if (data.length > 0) {
                    Object.keys(data).forEach(function (key) {
                        createChannel('disks', 'diskLayout', 'dev' + key);
                        Object.keys(data[key]).forEach(function (key2) {
                            if ((typeof data[key][key2] === 'string' && data[key][key2].length) || typeof data[key][key2] !== 'string') {
                                setState('disks', 'diskLayout.dev' + key, key2, typeof data[key][key2], data[key][key2]);
                            }
                        });
                    });
                }
            })
            .catch(error => adapter.log.error(error));

    sistm.fsSize()
            .then(data => {
                if (data.length > 0) {
                    Object.keys(data).forEach(function (key) {
                        fsUsed[key] = [];
                        createChannel('disks', 'fsSize', 'fs' + key);
                        Object.keys(data[key]).forEach(function (key2) {
                            if ((typeof data[key][key2] === 'string' && data[key][key2].length) || typeof data[key][key2] !== 'string') {
                                setState('disks', 'fsSize.fs' + key, key2, typeof data[key][key2], data[key][key2]);
                            }
                            if (key2 === "used") {
                                setState('disks', 'fsSize.fs' + key, "used_hist", "array", "[]");
                            }
                        });
                    });
                    if (!adapter.config.noCurrentSysData && adapter.config.diskSpeed !== 0 && firstTime) {
                        let speed = adapter.config.diskSpeed;
                        if (!speed) {
                            speed = 5;
                        }
                        adapter.log.info("Reading disk data every " + speed + " seconds.");
                        setInterval(updateCurrentFilesystemInfos, speed * 1000);
                    }
                }
            })
            .catch(error => adapter.log.error(error));

    //NETWORK
    sistm.networkInterfaces()
            .then(data => {
                if (data.length > 0) {
                    Object.keys(data).forEach(function (key) {
                        createChannel('network', 'interfaces', 'iface' + key);
                        Object.keys(data[key]).forEach(function (key2) {
                            if ((typeof data[key][key2] === 'string' && data[key][key2].length) || typeof data[key][key2] !== 'string') {
                                setState('network', 'interfaces.iface' + key, key2, typeof data[key][key2], data[key][key2]);
                            }
                        });
                    });
                }
            })
            .catch(error => adapter.log.error(error));

    //BATTERY
    sistm.system()
            .then(data => {
                if (data.hasbattery) {
                    Object.keys(data).forEach(function (key) {
                        if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] !== 'string') {
                            setState('battery', null, key, typeof data[key], data[key]);
                        }
                    });
                    if (!adapter.config.noCurrentSysData && adapter.config.batterySpeed !== 0 && firstTime) {
                        let speed = adapter.config.batterySpeed;
                        if (!speed) {
                            speed = 5;
                        }
                        adapter.log.info("Reading battery data every " + speed + " seconds.");
                        setInterval(updateCurrentBatteryInfos, speed * 1000);
                    }
                } else {
                    setState('battery', null, 'hasbattery', 'boolean', false);
                }
            })
            .catch(error => adapter.log.error(error));
};

const updateCurrentCPUInfos = function () {

    sistm.currentLoad()
            .then(data => {
                adapter.setState('sysinfo.cpu.currentLoad.avgload', {val: data['avgload'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.currentload', {val: data['currentload'], ack: true});
                cpuUsed.push(data['currentload']);
                if (cpuUsed.length > 30) {
                    cpuUsed.shift();
                }
                adapter.setState('sysinfo.cpu.currentLoad.currentload_hist', {val: cpuUsed.toString(), ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.currentload_user', {val: data['currentload_user'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.currentload_system', {val: data['currentload_system'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.currentload_nice', {val: data['currentload_nice'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.currentload_idle', {val: data['currentload_idle'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.currentload_irq', {val: data['currentload_irq'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.raw_currentload', {val: data['raw_currentload'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.raw_currentload_user', {val: data['raw_currentload_user'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.raw_currentload_system', {val: data['raw_currentload_system'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.raw_currentload_nice', {val: data['raw_currentload_nice'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.raw_currentload_idle', {val: data['raw_currentload_idle'], ack: true});
                adapter.setState('sysinfo.cpu.currentLoad.raw_currentload_irq', {val: data['raw_currentload_irq'], ack: true});
            })
            .catch(error => adapter.log.error(error));

};

const updateCurrentCPUTempInfos = function () {

    sistm.cpuTemperature()
            .then(data => {
                adapter.setState('sysinfo.cpu.temperature.main', {val: data.main, ack: true});
                cpuTemp.push(data.main);
                if (cpuTemp.length > 30) {
                    cpuTemp.shift();
                }
                adapter.setState('sysinfo.cpu.temperature.main_hist', {val: cpuTemp.toString(), ack: true});
                adapter.setState('sysinfo.cpu.temperature.cores', {val: data.cores, ack: true});
                adapter.setState('sysinfo.cpu.temperature.max', {val: data.max, ack: true});
            })
            .catch(error => adapter.log.error(error));

};

const updateCurrentMemoryInfos = function () {

    sistm.mem()
            .then(data => {
                adapter.setState('sysinfo.memory.info.free', {val: data['free'], ack: true});
                adapter.setState('sysinfo.memory.info.used', {val: data['used'], ack: true});
                memUsed.push(data['used'] / 1000000000);
                if (memUsed.length > 30) {
                    memUsed.shift();
                }
                adapter.setState('sysinfo.memory.info.used_hist', {val: memUsed.toString(), ack: true});
                adapter.setState('sysinfo.memory.info.active', {val: data['active'], ack: true});
                adapter.setState('sysinfo.memory.info.available', {val: data['available'], ack: true});
                adapter.setState('sysinfo.memory.info.buffcache', {val: data['buffcache'], ack: true});
                adapter.setState('sysinfo.memory.info.swapused', {val: data['swapused'], ack: true});
                adapter.setState('sysinfo.memory.info.swapfree', {val: data['swapfree'], ack: true});
            })
            .catch(error => adapter.log.error(error));

};

const updateCurrentFilesystemInfos = function () {

    sistm.fsSize()
            .then(data => {
                if (data.length > 0) {
                    Object.keys(data).forEach(function (key) {
                        adapter.setState('sysinfo.disks.fsSize.fs' + key + '.used', {val: data[key]['used'], ack: true});
                        fsUsed[key].push(data[key]['used']);
                        if (fsUsed[key].length > 30) {
                            fsUsed[key].shift();
                        }
                        adapter.setState('sysinfo.disks.fsSize.fs' + key + '.used_hist', {val: fsUsed[key].toString(), ack: true});
                        adapter.setState('sysinfo.disks.fsSize.fs' + key + '.use', {val: data[key]['use'], ack: true});
                    });
                }
            })
            .catch(error => adapter.log.error(error));

};

const updateCurrentBatteryInfos = function () {

    sistm.battery()
            .then(data => {
                adapter.setState('sysinfo.battery.hasbattery', {val: data['hasbattery'], ack: true});
                adapter.setState('sysinfo.battery.cyclecount', {val: data['cyclecount'], ack: true});
                adapter.setState('sysinfo.battery.ischarging', {val: data['ischarging'], ack: true});
                adapter.setState('sysinfo.battery.maxcapacity', {val: data['maxcapacity'], ack: true});
                adapter.setState('sysinfo.battery.currentcapacity', {val: data['currentcapacity'], ack: true});
                adapter.setState('sysinfo.battery.percent', {val: data['percent'], ack: true});
                adapter.setState('sysinfo.battery.timeremaining', {val: data['timeremaining'], ack: true});
                adapter.setState('sysinfo.battery.acconnected', {val: data['acconnected'], ack: true});
            })
            .catch(error => adapter.log.error(error));

};

function main() {
    checkNews();
    setTimeout(checkNews, 5000);
    setInterval(checkNews, 30 * 60 * 1000);
    updateSysinfo(true);
    setTimeout(function () {
        updateSysinfo(false);
    }, 5000);
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
