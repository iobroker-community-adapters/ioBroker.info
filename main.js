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

    const newsLink = 'https://raw.githubusercontent.com/ioBroker/ioBroker.docs/master/info/news.json';

    axios(newsLink).then(function (resp) {
        adapter.log.info("Popup-News readed...");
        adapter.setState('newsfeed', {val: JSON.stringify(resp.data), ack: true});
        adapter.getForeignObject('system.config', (err, obj) => {
            if (!err && obj) {
                adapter.log.debug("Language: " + obj.common.language);
                procedeNewsfeed(resp.data, obj.common.language);
            }
        });
    }).catch(function (error) {
        adapter.log.error(error);
    });
};

function procedeNewsfeed(messages, systemLang) {
    adapter.log.debug("Messages: " + messages.length);
    if (messages.length > 0) {
        const filtered = [];
        const today = new Date().getTime();
        getInstances(instances => {
            adapter.log.debug("Found " + Object.keys(instances).length + " instances");
            if (Object.keys(instances).length > 0) {
                messages.forEach(message => {
                    adapter.log.debug("Checking: " + message.title[systemLang]);
                    let showIt = true;
                    if (showIt && message['date-start'] && new Date(message['date-start']).getTime() > today) {
                        adapter.log.debug("Date start ok");
                        showIt = false;
                    } else if (showIt && message['date-end'] && new Date(message['date-end']).getTime() < today) {
                        adapter.log.debug("Date end ok");
                        showIt = false;
                    } else if (showIt && message.conditions && Object.keys(message.conditions).length > 0) {
                        adapter.log.debug("Checking conditions...");
                        Object.keys(message.conditions).forEach(key => {
                            adapter.log.debug("Conditions for " + key + " adapter");
                            const adapt = instances[key];
                            const condition = message.conditions[key];
                            if (!adapt && condition !== "!installed") {
                                adapter.log.debug("Adapter shoud be installed");
                                showIt = false;
                            } else if (adapt && condition === "!installed") {
                                adapter.log.debug("Adapter shoud not be installed");
                                showIt = false;
                            } else if (adapt && condition.startsWith("equals")) {
                                const vers = condition.substring(7, condition.length - 1).trim();
                                adapter.log.debug("Adapter same version: " + adapt.version + " equals " + vers + " -> " + (adapt.version === vers));
                                showIt = (adapt.version === vers);
                            } else if (adapt && condition.startsWith("bigger")) {
                                const vers = condition.substring(7, condition.length - 1).trim();
                                const checked = checkVersion(vers, adapt.version);
                                adapter.log.debug("Adapter bigger version: " + adapt.version + " bigger " + vers + " -> " + checked);
                                showIt = checked;
                            } else if (adapt && condition.startsWith("smaller")) {
                                const vers = condition.substring(8, condition.length - 1).trim();
                                const checked = checkVersion(adapt.version, vers);
                                adapter.log.debug("Adapter smaller version: " + adapt.version + " smaller " + vers + " -> " + checked);
                                showIt = checked;
                            } else if (adapt && condition.startsWith("between")) {
                                const vers1 = condition.substring(8, condition.indexOf(',')).trim();
                                const vers2 = condition.substring(condition.indexOf(',') + 1, condition.length - 1).trim();
                                const checked = checkVersionBetween(adapt.version, vers1, vers2);
                                adapter.log.debug("Adapter between version: " + adapt.version + " between " + vers1 + " and " + vers2 + " -> " + checked);
                                showIt = checked;
                            }
                        });
                    }

                    if (showIt) {
                        adapter.log.debug("Message added: " + message.title[systemLang]);
                        filtered.push({"id": message.id, "title": message.title[systemLang], "content": message.content[systemLang], "class": message.class, "icon": message['fa-icon'], "created": message.created});
                    }

                });
                adapter.setState('newsfeed_filtered', {val: JSON.stringify(filtered), ack: true});
            }
        });
    }
}

const checkVersion = function (smaller, bigger) {
    smaller = smaller.split('.');
    bigger = bigger.split('.');
    smaller[0] = parseInt(smaller[0], 10);
    bigger[0] = parseInt(bigger[0], 10);

    if (smaller[0] > bigger[0]) {
        return false;
    } else if (smaller[0] === bigger[0]) {
        smaller[1] = parseInt(smaller[1], 10);
        bigger[1] = parseInt(bigger[1], 10);
        if (smaller[1] > bigger[1]) {
            return false;
        } else if (smaller[1] === bigger[1]) {
            smaller[2] = parseInt(smaller[2], 10);
            bigger[2] = parseInt(bigger[2], 10);
            return (smaller[2] < bigger[2]);
        } else {
            return true;
        }
    } else {
        return true;
    }
};

const checkVersionBetween = function (inst, vers1, vers2) {
    return inst === vers1 || inst === vers2 || (checkVersion(vers1, inst) && checkVersion(inst, vers2));
};

function getInstances(callback) {
    adapter.log.debug("Getting instances...");
    adapter.objects.getObjectView('system', 'instance', {startkey: 'system.adapter.', endkey: 'system.adapter.\u9999'}, (err, doc) => {
        if (err || !doc || !doc.rows || !doc.rows.length) {
            return callback && callback([]);
        }
        const res = [];
        doc.rows.forEach(row => res.push(row.value));
        const instances = {};
        res.forEach(instance => {
            instances[instance.common.name] = {};
            instances[instance.common.name].version = instance.common.installedVersion;
        });
        callback && callback(instances);
    });
}

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


const updateSysinfo = function () {

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
                if (adapter.config.noCurrentSysData != true && adapter.config.cpuSpeed != 0) {
                    let speed = adapter.config.cpuSpeed;
                    if (!speed) {
                        speed = 3;
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
                    if (adapter.config.noCurrentSysData != true && adapter.config.cpuSpeed != 0) {
                        let speed = adapter.config.cpuSpeed;
                        if (!speed) {
                            speed = 3;
                        }
                        adapter.log.info("Reading CPU temp data every " + speed + " seconds.");
                        setInterval(updateCurrentCPUTempInfos, speed * 1000);
                    }
                }
            })
            .catch(error => adapter.log.error(error));

    sistm.cpuCurrentspeed()
            .then(data => {
                if (data['avg']) {
                    Object.keys(data).forEach(function (key) {
                        if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] !== 'string') {
                            setState('cpu', 'currentspeed', key + "Speed", typeof data[key], data[key]);
                        }
                    });
                    if (adapter.config.noCurrentSysData != true && adapter.config.cpuSpeed != 0) {
                        let speed = adapter.config.cpuSpeed;
                        if (!speed) {
                            speed = 3;
                        }
                        adapter.log.info("Reading CPU current speed every " + speed + " seconds.");
                        setInterval(updateCurrentCPUSpeed, speed * 1000);
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
                if (adapter.config.noCurrentSysData != true && adapter.config.memSpeed != 0) {
                    let speed = adapter.config.memSpeed;
                    if (!speed) {
                        speed = 3;
                    }
                    adapter.log.info("Reading memory data every " + speed + " seconds.");
                    setInterval(updateCurrentMemoryInfos, speed * 1000);
                }
            })
            .catch(error => adapter.log.error(error));

    sistm.memLayout()
            .then(data => {
                if (data.length > 0) {
                    Object.keys(data).forEach(function (key) {
                        createChannel('memory', 'memLayout', 'ram' + key);
                        Object.keys(data[key]).forEach(function (key2) {
                            if ((typeof data[key][key2] === 'string' && data[key][key2].length) || typeof data[key][key2] !== 'string') {
                                setState('memory', 'memLayout.ram' + key, key2, typeof data[key][key2], data[key][key2]);
                            }
                        });
                    });
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

    sistm.users()
            .then(data => {
                setState('os', null, 'users', 'string', JSON.stringify(data));
                if (adapter.config.noCurrentSysData != true && adapter.config.allProcessesUsers != 0) {
                    let speed = adapter.config.allProcessesUsers;
                    if (!speed) {
                        speed = 8;
                    }
                    adapter.log.info("Reading user data every " + speed + " seconds.");
                    setInterval(updateCurrentUsersInfos, speed * 1000);
                }
            })
            .catch(error => adapter.log.error(error));

    sistm.processes()
            .then(data => {
                setState('os', 'processes', 'all', 'number', data.all);
                setState('os', 'processes', 'running', 'number', data.running);
                setState('os', 'processes', 'blocked', 'number', data.blocked);
                setState('os', 'processes', 'sleeping', 'number', data.sleeping);
                setState('os', 'processes', 'unknown', 'number', data.unknown);
                setState('os', 'processes', 'list', 'string', JSON.stringify(data['list']));
                if (adapter.config.noCurrentSysData != true && adapter.config.allProcessesUsers != 0) {
                    let speed = adapter.config.allProcessesUsers;
                    if (!speed) {
                        speed = 8;
                    }
                    adapter.log.info("Reading process data every " + speed + " seconds.");
                    setInterval(updateCurrentProcessInfos, speed * 1000);
                }
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
                    if (adapter.config.noCurrentSysData != true && adapter.config.diskSpeed != 0) {
                        let speed = adapter.config.diskSpeed;
                        if (!speed) {
                            speed = 8;
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
                Object.keys(data).forEach(function (key) {
                    if ((typeof data[key] === 'string' && data[key].length) || typeof data[key] !== 'string') {
                        setState('battery', null, key, typeof data[key], data[key]);
                    }
                });
                if (adapter.config.noCurrentSysData != true && adapter.config.batterySpeed != 0) {
                    let speed = adapter.config.batterySpeed;
                    if (!speed) {
                        speed = 8;
                    }
                    adapter.log.info("Reading battery data every " + speed + " seconds.");
                    setInterval(updateCurrentBatteryInfos, speed * 1000);
                }
            })
            .catch(error => adapter.log.error(error));

    //GRAPHICS
    sistm.graphics()
            .then(data => {
                if (data && Object.getOwnPropertyNames(data).length !== 0) {
                    if (data.controller && data.controller.length > 0) {
                        Object.keys(data.controller).forEach(function (key) {
                            createChannel('graphics', 'controllers', 'ctrl' + key);
                            Object.keys(data.controller[key]).forEach(function (key2) {
                                if ((typeof data.controller[key][key2] === 'string' && data.controller[key][key2].length) || typeof data.controller[key][key2] !== 'string') {
                                    setState('graphics', 'controllers.ctrl' + key, key2, typeof data.controller[key][key2], data.controller[key][key2]);
                                }
                            });
                        });
                    }
                    if (data.displays && data.displays.length > 0) {
                        Object.keys(data.displays).forEach(function (key) {
                            createChannel('graphics', 'displays', 'dspl' + key);
                            Object.keys(data.displays[key]).forEach(function (key2) {
                                if ((typeof data.displays[key][key2] === 'string' && data.displays[key][key2].length) || typeof data.displays[key][key2] !== 'string') {
                                    setState('graphics', 'displays.dspl' + key, key2, typeof data.displays[key][key2], data.displays[key][key2]);
                                }
                            });
                        });
                    }
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

const updateCurrentCPUSpeed = function () {

    sistm.cpuCurrentspeed()
            .then(data => {
                adapter.setState('sysinfo.cpu.currentspeed.avgSpeed', {val: data.avg, ack: true});
                adapter.setState('sysinfo.cpu.currentspeed.minSpeed', {val: data.min, ack: true});
                adapter.setState('sysinfo.cpu.currentspeed.maxSpeed', {val: data.max, ack: true});
                adapter.setState('sysinfo.cpu.currentspeed.coresSpeed', {val: data.cores, ack: true});
            })
            .catch(error => adapter.log.error(error));
};

const updateCurrentMemoryInfos = function () {

    sistm.mem()
            .then(data => {
                adapter.setState('sysinfo.memory.info.free', {val: data['free'], ack: true});
                adapter.setState('sysinfo.memory.info.used', {val: data['used'], ack: true});
                adapter.setState('sysinfo.memory.info.active', {val: data['active'], ack: true});
                memUsed.push(data['active'] / 1000000000);
                if (memUsed.length > 30) {
                    memUsed.shift();
                }
                adapter.setState('sysinfo.memory.info.used_hist', {val: memUsed.toString(), ack: true});
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

const updateCurrentProcessInfos = function () {

    sistm.processes()
            .then(data => {
                adapter.setState('sysinfo.os.processes.all', {val: data['all'], ack: true});
                adapter.setState('sysinfo.os.processes.running', {val: data['running'], ack: true});
                adapter.setState('sysinfo.os.processes.blocked', {val: data['blocked'], ack: true});
                adapter.setState('sysinfo.os.processes.sleeping', {val: data['sleeping'], ack: true});
                adapter.setState('sysinfo.os.processes.unknown', {val: data['unknown'], ack: true});
                adapter.setState('sysinfo.os.processes.list', {val: JSON.stringify(data['list']), ack: true});
            })
            .catch(error => adapter.log.error(error));

};

const updateCurrentUsersInfos = function () {

    sistm.users()
            .then(data => {
                adapter.setState('sysinfo.os.users', {val: JSON.stringify(data), ack: true});
            })
            .catch(error => adapter.log.error(error));

};

function main() {
    adapter.getState('last_popup', function(err, obj){
        if(!err && (!obj || !obj.val)){
            adapter.setState('last_popup', {val: '2019-01-01T00:00:00.000Z', ack: true});
        }
    });    
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
