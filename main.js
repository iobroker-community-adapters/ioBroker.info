/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

/*
 * Created with @iobroker/create-adapter v1.32.0
 */

// you have to require the utils module and call adapter function
const utils = require("@iobroker/adapter-core"); // Get common adapter utils
const axios = require("axios");
const sistm = require("systeminformation");
const path = require("path");
const child_process = require("child_process");
const semver = require("semver");
const hash = require("jshashes");

const cpuUsed = [];
const cpuTemp = [];
const memUsed = [];
const fsUsed = {};

const adapterIntervals = {};

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
let adapter, activeRepo = "default", uuid = null, test = false, testLink;

const sha = new hash.SHA256;

function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: "info",
		unload: function (callback) {
			try {
				Object.keys(adapterIntervals).forEach(interval => clearInterval(adapterIntervals[interval]));

				adapter.log.info("cleaned everything up...");
				callback();
			} catch (e) {
				callback();
			}
		},
		ready: function () {
			main();
		}
	});

	adapter = new utils.Adapter(options);

	return adapter;
}

const versions = getSystemVersions();
function getSystemVersions() {
	// Run npm -v and extract the version string
	const ret = {
		npm: undefined,
		node: undefined
	};
	try {
		let npmVersion;
		ret.node = semver.valid(process.version);
		try {
			// remove local node_modules\.bin dir from path
			// or we potentially get a wrong npm version
			const newEnv = Object.assign({}, process.env);
			newEnv.PATH = (newEnv.PATH || newEnv.Path || newEnv.path)
				.split(path.delimiter)
				.filter(dir => {
					dir = dir.toLowerCase();
					return !(dir.indexOf("iobroker") > -1 && dir.indexOf(path.join("node_modules", ".bin")) > -1);
				})
				.join(path.delimiter);

			npmVersion = child_process.execSync("npm -v", {encoding: "utf8", env: newEnv});
			if (npmVersion) {
				npmVersion = semver.valid(npmVersion.trim());
			}
			ret.npm = npmVersion;
		} catch (e) {
			adapter.log.error("Error trying to check npm version: " + e);
		}
	} catch (e) {
		adapter.log.error("Could not check npm version: " + e);
		adapter.log.error("Assuming that correct version is installed.");
	}
	return ret;
}

const checkNews = function () {

	const newsLink = test ? testLink : "https://raw.githubusercontent.com/ioBroker/ioBroker.docs/master/info/news.json";

	axios(newsLink).then(function (resp) {
		adapter.log.debug("Popup news was read..." + (test ? " (DEBUG)" : ""));
		adapter.setState("newsfeed", {val: JSON.stringify(resp.data), ack: true});

		adapter.getForeignObject("system.meta.uuid", (err, obj) => {
			if (!err && obj) {
				const myUUID = obj && obj.native ? obj.native.uuid : null;
				if (myUUID) {
					uuid = sha.hex("iobroker-uuid" + myUUID);
					adapter.setState("uuid", {val: uuid, ack: true});
				}
			}
		});

		adapter.getForeignObject("system.config", (err, obj) => {
			if (!err && obj && obj.common) {
				adapter.log.debug("Repo: " + obj.common.activeRepo);
				activeRepo = obj.common.activeRepo;
				adapter.log.debug("Language: " + obj.common.language);
				procedeNewsfeed(resp.data, obj.common.language);
			}
			else {
				adapter.log.warn("Invalid system.config object");
			}
		});

	}).catch(function (error) {
		adapter.log.error(error);
	});
};

function checkActive(adapterName) {
	const instances = window.top.gMain.instances;
	if (!instances) {
		return false;
	}
	const instCreated = instances.filter(function (str) {
		return str.includes("." + adapterName + ".");
	});
	if (instCreated.length === 0) {
		return false;
	}
	let i;
	for (i = 0; i < instCreated.length; i++) {
		if (window.top.gMain.objects[instCreated[i]].common.enabled) {
			return true;
		}
	}
	return false;
}

function checkConditions(condition, installedVersion, objectName) {
	if (condition.startsWith("equals")) {
		const vers = condition.substring(7, condition.length - 1).trim();
		adapter.log.debug(objectName + " same version: " + installedVersion + " equals " + vers + " -> " + (installedVersion === vers));
		return (installedVersion === vers);
	} else if (condition.startsWith("bigger")) {
		const vers = condition.substring(7, condition.length - 1).trim();
		const checked = checkVersion(vers, installedVersion);
		adapter.log.debug(objectName + " bigger version: " + installedVersion + " bigger " + vers + " -> " + checked);
		return checked;
	} else if (condition.startsWith("smaller")) {
		const vers = condition.substring(8, condition.length - 1).trim();
		const checked = checkVersion(installedVersion, vers);
		adapter.log.debug(objectName + " smaller version: " + installedVersion + " smaller " + vers + " -> " + checked);
		return checked;
	} else if (condition.startsWith("between")) {
		const vers1 = condition.substring(8, condition.indexOf(",")).trim();
		const vers2 = condition.substring(condition.indexOf(",") + 1, condition.length - 1).trim();
		const checked = checkVersionBetween(installedVersion, vers1, vers2);
		adapter.log.debug(objectName + " between version: " + installedVersion + " between " + vers1 + " and " + vers2 + " -> " + checked);
		return checked;
	} else {
		return true;
	}
}

function procedeNewsfeed(messages, systemLang) {
	adapter.log.debug("Messages: " + messages.length);
	if (Array.isArray(messages) && messages.length > 0) {
		const filtered = [];
		const today = new Date().getTime();
		getInstances(instances => {
			adapter.log.debug("Found " + Object.keys(instances).length + " instances");
			if (Object.keys(instances).length > 0) {
				messages.forEach(message => {
					adapter.log.debug("Checking: " + message.title[systemLang]);
					let showIt = true;

					if (showIt && message["date-start"] && new Date(message["date-start"]).getTime() > today) {
						adapter.log.debug("Date start ok");
						showIt = false;
					} else if (showIt && message["date-end"] && new Date(message["date-end"]).getTime() < today) {
						adapter.log.debug("Date end ok");
						showIt = false;
					} else if (showIt && message.conditions && Object.keys(message.conditions).length > 0) {
						adapter.log.debug("Checking conditions...");
						Object.keys(message.conditions).forEach(key => {
							if (showIt) {
								adapter.log.debug("Conditions for " + key + " adapter");
								const adapt = instances[key];
								const condition = message.conditions[key];

								if (!adapt && condition !== "!installed") {
									adapter.log.debug("Adapter shoud be installed");
									showIt = false;
								} else if (adapt && condition === "!installed") {
									adapter.log.debug("Adapter shoud not be installed");
									showIt = false;
								} else if (adapt && condition === "active") {
									adapter.log.debug("At least one instance is active");
									showIt = checkActive(key);
								} else if (adapt && condition === "!active") {
									adapter.log.debug("No active instance of adapter");
									showIt = !checkActive(key);
								} else if (adapt) {
									showIt = checkConditions(condition, adapt.version, key);
								}
							}
						});
					}

					if (showIt && message["node-version"]) {
						const condition = message["node-version"];
						adapter.log.debug("Node check");
						showIt = checkConditions(condition, versions.node, "NodeJS");
					}
					if (showIt && message["npm-version"]) {
						const condition = message["npm-version"];
						adapter.log.debug("NPM check");
						showIt = versions.npm !== null && checkConditions(condition, versions.npm, "NPM");
					}
					if (showIt && message["os"]) {
						const condition = message["os"];
						adapter.log.debug("OS check");
						showIt = process.platform === condition;
					}
					if (showIt && message["repo"]) {
						const condition = message["repo"];
						adapter.log.debug("Repo check");
						showIt = activeRepo === condition;
					}
					if (showIt && message["uuid"]) {
						const condition = message["uuid"];
						adapter.log.debug("UUID check");
						if (Array.isArray(message["uuid"])) {
							adapter.log.debug("UUID List check");
							let oneMustBe = false;
							if (uuid) {
								condition.forEach(function (uuidCondition) {
									if (!oneMustBe) {
										oneMustBe = uuid === uuidCondition;
									}
								});
							}
							showIt = oneMustBe;
						} else {
							adapter.log.debug("UUID only one");
							showIt = uuid && uuid === condition;
						}
					}

					if (showIt) {
						adapter.log.debug("Message added: " + message.title[systemLang]);
						filtered.push({"id": message.id, "title": message.title[systemLang], "content": message.content[systemLang], "class": message.class, "icon": message["fa-icon"], "created": message.created});
					}

				});
				adapter.setState("newsfeed_filtered", {val: JSON.stringify(filtered), ack: true});
			}
		});
	}
}

const checkVersion = function (smaller, bigger) {
	if (smaller === undefined || bigger === undefined) {
		return false;
	}
	smaller = smaller.split(".");
	bigger = bigger.split(".");
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
	adapter.getObjectView("system", "instance", {startkey: "system.adapter.", endkey: "system.adapter.\u9999"}, (err, doc) => {
		if (err || !doc || !doc.rows || !doc.rows.length) {
			return callback && callback([]);
		}
		const res = [];
		doc.rows.forEach(row => res.push(row.value));
		const instances = {};
		res.forEach(instance => {
			if (instance && instance.common && instance.common.name) {
				instances[instance.common.name] = {};
				instances[instance.common.name].version = instance.common.installedVersion;
			}
		});
		callback && callback(instances);
	});
}

const setState = function (channel, channel2, key, type, value) {
	if(type === "undefined"){
		type = "string";
	}
	if (type === "object") {
		type = "object";
		value = JSON.stringify(value);
	}

	const link = "sysinfo." + channel + (channel2 ? "." + channel2 : "");
	adapter.setObjectNotExists(link + "." + key, {
		type: "state",
		common: {
			name: key,
			type: type,
			role: "value",
			read: true,
			write: false
		},
		native: {}
	}, err => !err && adapter.setState(link + "." + key, {val: value, ack: true}));
};

const createChannel = function (channel, channel2, channel3) {
	if(channel2 == null) {
		adapter.setObjectNotExists("sysinfo." + channel, {
			type: "channel",
			common: {
				name: channel,
				role: "info"
			},
			native: {}
		});
	} else if(channel3 == null) {
		adapter.setObjectNotExists("sysinfo." + channel + "." + channel2, {
			type: "channel",
			common: {
				name: channel2,
				role: "info"
			},
			native: {}
		});
	} else {
		adapter.setObjectNotExists("sysinfo." + channel + "." + channel2 + "." + channel3, {
			type: "channel",
			common: {
				name: channel3,
				role: "info"
			},
			native: {}
		});
	}
};

const setSystemStates = function (data, channel, channel2, nameChange) {
	adapter.log.debug(`Process ${channel} with ${channel2}: ${JSON.stringify(data)}`);
	if(typeof data !== "undefined" && data !== null) {
		Object.keys(data).forEach(function (key) {
			let data2 = data[key];
			if (typeof data2 === "object" && data2 !== null && typeof data2 !== "undefined") {
				Object.keys(data2).forEach(function (key2) {
					data2[key2] !== null && setState(channel, channel2, key + "-" + key2, typeof data2[key2], data2[key2]);
				});
			} else if ((typeof data2 === "string" && data2.length) || (typeof data2 !== "string")) {
				let name;
				if(nameChange && nameChange.hasOwnProperty(key)){
					name = nameChange[key];
				} else{
					name = key;
				}
				setState(channel, channel2, name, typeof data2, data2);
			}
		});
	}
}

const updateSysinfo = function (setIntervals) {

	adapter.log.info("Reading/updating systemdata.");

	//SYSTEM
	sistm.system()
		.then(data => {	setSystemStates(data, "system","hardware"); })
		.catch(error => adapter.log.error(error));

	sistm.uuid()
		.then(data => {	setSystemStates(data, "system","uuid"); })
		.catch(error => adapter.log.error(error));

	sistm.bios()
		.then(data => {	setSystemStates(data, "system","bios"); })
		.catch(error => adapter.log.error(error));

	sistm.baseboard()
		.then(data => {	setSystemStates(data, "system","baseboard"); })
		.catch(error => adapter.log.error(error));

	sistm.chassis()
		.then(data => {	setSystemStates(data, "system","chassis"); })
		.catch(error => adapter.log.error(error));

	//CPU
	sistm.cpu()
		.then(data => {	setSystemStates(data, "cpu","info"); })
		.catch(error => adapter.log.error(error));

	sistm.currentLoad()
		.then(data => {
			setSystemStates(data, "cpu","currentLoad");
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.cpuSpeed !== 0) {
				let speed = adapter.config.cpuSpeed;
				if (!speed) {
					speed = 60;
				}
				adapter.log.info("Reading CPU data every " + speed + " seconds.");
				adapterIntervals.updateCurrentCPUInfos = setInterval(updateCurrentCPUInfos, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.cpuTemperature()
		.then(data => {
			setSystemStates(data, "cpu","temperature");
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.cpuSpeed !== 0) {
				let speed = adapter.config.cpuSpeed;
				if (!speed) {
					speed = 60;
				}
				adapter.log.info("Reading CPU temp data every " + speed + " seconds.");
				adapterIntervals.updateCurrentCPUTempInfos = setInterval(updateCurrentCPUTempInfos, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.cpuCurrentSpeed()
		.then(data => {
			setSystemStates(data, "cpu","currentSpeed", {"min":"minSpeed", "max": "maxSpeed", "avg": "avgSpeed"});
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.cpuSpeed !== 0) {
				let speed = adapter.config.cpuSpeed;
				if (!speed) {
					speed = 60;
				}
				adapter.log.info("Reading CPU current speed every " + speed + " seconds.");
				adapterIntervals.updateCurrentCPUSpeed = setInterval(updateCurrentCPUSpeed, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	//MEMORY
	sistm.mem()
		.then(data => {
			setSystemStates(data, "memory","info");
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.memSpeed !== 0) {
				let speed = adapter.config.memSpeed;
				if (!speed) {
					speed = 60;
				}
				adapter.log.info("Reading memory data every " + speed + " seconds.");
				adapterIntervals.updateCurrentMemoryInfos = setInterval(updateCurrentMemoryInfos, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.memLayout()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("memory", "memLayout", "ram" + key);
					setSystemStates(data[key], "memory","memLayout.ram" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	//BATTERY
	sistm.system()
		.then(data => {
			setSystemStates(data, "battery",null);
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.batterySpeed !== 0) {
				let speed = adapter.config.batterySpeed;
				if (!speed) {
					speed = 120;
				}
				adapter.log.info("Reading battery data every " + speed + " seconds.");
				adapterIntervals.updateCurrentBatteryInfos = setInterval(updateCurrentBatteryInfos, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	//GRAPHICS
	sistm.graphics()
		.then(data => {
			if (data !== null && typeof data !== "undefined") {
				if (data.controllers && data.controllers.length > 0) {
					Object.keys(data.controllers).forEach(function (key) {
						createChannel("graphics", "controllers", "ctrl" + key);
						setSystemStates(data[key], "graphics","controllers.ctrl" + key);
					});
				}
				if (data.displays && data.displays.length > 0) {
					Object.keys(data.displays).forEach(function (key) {
						createChannel("graphics", "displays", "dspl" + key);
						setSystemStates(data[key], "graphics","displays.dspl" + key);
					});
				}
			}
		})
		.catch(error => adapter.log.error(error));

	//OS
	sistm.osInfo()
		.then(data => {	setSystemStates(data, "os","info"); })
		.catch(error => adapter.log.error(error));

	sistm.versions()
		.then(data => {	setSystemStates(data, "os","versions");	})
		.catch(error => adapter.log.error(error));

	sistm.users()
		.then(data => {
			setState("os", null, "users", "string", JSON.stringify(data));
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.allProcessesUsers !== 0) {
				let speed = adapter.config.allProcessesUsers;
				if (!speed) {
					speed = 120;
				}
				adapter.log.info("Reading user data every " + speed + " seconds.");
				adapterIntervals.updateCurrentUsersInfos = setInterval(updateCurrentUsersInfos, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.processes()
		.then(data => {
			setState("os", "processes", "all", "number", data.all);
			setState("os", "processes", "running", "number", data.running);
			setState("os", "processes", "blocked", "number", data.blocked);
			setState("os", "processes", "sleeping", "number", data.sleeping);
			setState("os", "processes", "unknown", "number", data.unknown);
			setState("os", "processes", "list", "string", JSON.stringify(data.list));
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.allProcessesUsers !== 0) {
				let speed = adapter.config.allProcessesUsers;
				if (!speed) {
					speed = 120;
				}
				adapter.log.info("Reading process data every " + speed + " seconds.");
				adapterIntervals.updateCurrentProcessInfos = setInterval(updateCurrentProcessInfos, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	//DISKS
	sistm.blockDevices()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("disks", "blockDevices", "dev" + key);
					setSystemStates(data[key], "disks","blockDevices.dev" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.diskLayout()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("disks", "diskLayout", "dev" + key);
					setSystemStates(data[key], "disks","diskLayout.dev" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.fsSize()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					fsUsed[key] = [];
					createChannel("disks", "fsSize", "fs" + key);
					Object.keys(data[key]).forEach(function (key2) {
						if ((typeof data[key][key2] === "string" && data[key][key2].length) || typeof data[key][key2] !== "string") {
							setState("disks", "fsSize.fs" + key, key2, typeof data[key][key2], data[key][key2]);
						}
						if (key2 === "used") {
							setState("disks", "fsSize.fs" + key, "used_hist", "array", "[]");
						}
					});
				});
			}
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.diskSpeed !== 0) {
				let speed = adapter.config.diskSpeed;
				if (!speed) {
					speed = 120;
				}
				adapter.log.info("Reading disk data every " + speed + " seconds.");
				adapterIntervals.updateCurrentFilesystemInfos = setInterval(updateCurrentFilesystemInfos, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	//USB
	sistm.usb()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("usb", "dev" + key, null);
					setSystemStates(data[key], "usb","dev" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));
		if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.usbSpeed !== 0) {
			let speed = adapter.config.usbSpeed;
			if (!speed) {
				speed = 120;
			}
			adapter.log.info("Reading usb data every " + speed + " seconds.");
			adapterIntervals.updateCurrentUsbInfos = setInterval(updateCurrentUsbInfos, speed * 1000);
		}

	//PRINTER
	sistm.printer()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("printer", "dev" + key, null);
					setSystemStates(data[key], "printer","dev" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	//AUDIO
	sistm.audio()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("audio", "dev" + key, null);
					setSystemStates(data[key], "audio","dev" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	//NETWORK
	sistm.networkInterfaces()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("network", "interfaces", "iface" + key);
					setSystemStates(data[key], "network","interfaces.iface" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.networkInterfaceDefault()
		.then(data => {
			setState("network", "info", "defaultInterface", "string", data);
		})
		.catch(error => adapter.log.error(error));

	sistm.networkGatewayDefault()
		.then(data => {
			setState("network", "info", "defaultGateway", "string", data);
		})
		.catch(error => adapter.log.error(error));

	sistm.networkStats()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("network", "stats", "iface" + key);
					setSystemStates(data[key], "network","stats.iface" + key);
				});
			}
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.networkSpeed !== 0) {
				let speed = adapter.config.networkSpeed;
				if (!speed) {
					speed = 120;
				}
				adapter.log.info("Reading network data every " + speed + " seconds.");
				adapterIntervals.updateCurrentNetworkInfos = setInterval(updateCurrentNetworkInfos, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	//WIFI
	sistm.wifiInterfaces()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("wifi", "interfaces", "iface" + key);
					setSystemStates(data[key], "wifi","interfaces.iface" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.wifiConnections()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("wifi", "connections", "connection" + key);
					setSystemStates(data[key], "wifi","connections.connection" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.wifiNetworks()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("wifi", "networks", "net" + key);
					setSystemStates(data[key], "wifi","networks.net" + key);
				});
			}
			if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.wifiSpeed !== 0) {
				let speed = adapter.config.wifiSpeed;
				if (!speed) {
					speed = 120;
				}
				adapter.log.info("Reading network data every " + speed + " seconds.");
				adapterIntervals.updateCurrentWifiInfos = setInterval(updateCurrentWifiInfos, speed * 1000);
			}
		})
		.catch(error => adapter.log.error(error));

	//BLUETOOTH
	sistm.bluetoothDevices()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("bluetooth", "dev" + key, null);
					setSystemStates(data[key], "bluetooth","dev" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));
	if (setIntervals && adapter.config.noCurrentSysData !== true && adapter.config.bluetoothSpeed !== 0) {
		let speed = adapter.config.bluetoothSpeed;
		if (!speed) {
			speed = 120;
		}
		adapter.log.info("Reading usb data every " + speed + " seconds.");
		adapterIntervals.updateCurrentBluetoothInfos = setInterval(updateCurrentBluetoothInfos, speed * 1000);
	}

	//DOCKER
	sistm.dockerInfo()
		.then(data => {	setSystemStates(data, "docker","info");	})
		.catch(error => adapter.log.error(error));

	if(setIntervals) {
		adapterIntervals.globalReloadData = setInterval(updateAllData, 12 * 60 * 60 * 1000);
	}

	sistm.dockerImages()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("docker", "images", "img" + key);
					setSystemStates(data[key], "docker","images.img" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.dockerContainers()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("docker", "containers", "cnt" + key);
					setSystemStates(data[key], "docker","containers.cnt" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.dockerVolumes()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("docker", "volumes", "vol" + key);
					setSystemStates(data[key], "docker","volumes.vol" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));
};

const updateAllData = function () {
	updateSysinfo(false);
}

const updateCurrentCPUInfos = function () {

	sistm.currentLoad()
		.then(data => {
			adapter.setState("sysinfo.cpu.currentLoad.avgLoad", {val: data.avgLoad, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.currentLoad", {val: data.currentLoad, ack: true});
			cpuUsed.push(data["currentLoad"]);
			if (cpuUsed.length > 30) {
				cpuUsed.shift();
			}
			adapter.setState("sysinfo.cpu.currentLoad.currentLoad_hist", {val: JSON.stringify(cpuUsed), ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.currentLoadUser", {val: data.currentLoadUser, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.currentLoadSystem", {val: data.currentLoadSystem, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.currentLoadNice", {val: data.currentLoadNice, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.currentLoadIdle", {val: data.currentLoadIdle, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.currentLoadIrq", {val: data.currentLoadIrq, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.rawCurrentLoad", {val: data.rawCurrentLoad, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.rawCurrentLoadUser", {val: data.rawCurrentLoadUser, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.rawCurrentLoadSystem", {val: data.rawCurrentLoadSystem, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.rawCurrentLoadNice", {val: data.rawCurrentLoadNice, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.rawCurrentLoadIdle", {val: data.rawCurrentLoadIdle, ack: true});
			adapter.setState("sysinfo.cpu.currentLoad.rawCurrentLoadIrq", {val: data.rawCurrentLoadIrq, ack: true});
		})
		.catch(error => adapter.log.error(error));

};

const updateCurrentCPUTempInfos = function () {

	sistm.cpuTemperature()
		.then(data => {
			adapter.setState("sysinfo.cpu.temperature.main", {val: parseFloat(data.main), ack: true});
			cpuTemp.push(data.main);
			if (cpuTemp.length > 30) {
				cpuTemp.shift();
			}
			adapter.setState("sysinfo.cpu.temperature.main_hist", {val: JSON.stringify(cpuTemp), ack: true});
			adapter.setState("sysinfo.cpu.temperature.cores", {val: JSON.stringify(data.cores), ack: true});
			adapter.setState("sysinfo.cpu.temperature.max", {val: parseFloat(data.max), ack: true});
		})
		.catch(error => adapter.log.error(error));

};

const updateCurrentCPUSpeed = function () {

	sistm.cpuCurrentSpeed()
		.then(data => {
			adapter.setState("sysinfo.cpu.currentSpeed.avgSpeed", {val: data.avg, ack: true});
			adapter.setState("sysinfo.cpu.currentSpeed.minSpeed", {val: data.min, ack: true});
			adapter.setState("sysinfo.cpu.currentSpeed.maxSpeed", {val: data.max, ack: true});
			adapter.setState("sysinfo.cpu.currentSpeed.coresSpeed", {val: JSON.stringify(data.cores), ack: true});
		})
		.catch(error => adapter.log.error(error));
};

const updateCurrentMemoryInfos = function () {

	sistm.mem()
		.then(data => {
			adapter.setState("sysinfo.memory.info.free", {val: data.free, ack: true});
			adapter.setState("sysinfo.memory.info.used", {val: data.used, ack: true});
			adapter.setState("sysinfo.memory.info.active", {val: data.active, ack: true});
			memUsed.push(data["active"] / 1000000000);
			if (memUsed.length > 30) {
				memUsed.shift();
			}
			adapter.setState("sysinfo.memory.info.used_hist", {val: JSON.stringify(memUsed), ack: true});
			adapter.setState("sysinfo.memory.info.available", {val: data.available, ack: true});
			adapter.setState("sysinfo.memory.info.buffcache", {val: data.buffcache, ack: true});
			adapter.setState("sysinfo.memory.info.swapused", {val: data.swapused, ack: true});
			adapter.setState("sysinfo.memory.info.swapfree", {val: data.swapfree, ack: true});
		})
		.catch(error => adapter.log.error(error));

};

const updateCurrentUsbInfos = function () {
	sistm.usb()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("usb", "dev" + key, null);
					setSystemStates(data[key], "usb", "dev" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));
}

const updateCurrentBluetoothInfos = function () {
	sistm.bluetoothDevices()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("bluetooth", "dev" + key, null);
					setSystemStates(data[key], "bluetooth", "dev" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));
}

const updateCurrentFilesystemInfos = function () {

	sistm.fsSize()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("disks", "fsSize", "fs" + key);
					adapter.setState("sysinfo.disks.fsSize.fs" + key + ".used", {val: data[key].used, ack: true});
					fsUsed[key] = fsUsed[key] || [];
					fsUsed[key].push(data[key]["used"]);
					if (fsUsed[key].length > 30) {
						fsUsed[key].shift();
					}
					adapter.setState("sysinfo.disks.fsSize.fs" + key + ".used_hist", {val: JSON.stringify(fsUsed[key]), ack: true});
					adapter.setState("sysinfo.disks.fsSize.fs" + key + ".use", {val: data[key].use, ack: true});
				});
			}
		})
		.catch(error => adapter.log.error(error));

};

const updateCurrentNetworkInfos = function () {

	sistm.networkStats()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("network", "stats", "iface" + key);
					setSystemStates(data[key], "network","stats.iface" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

}

const updateCurrentWifiInfos = function () {

	sistm.wifiNetworks()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("wifi", "networks", "net" + key);
					setSystemStates(data[key], "wifi","networks.net" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

	sistm.wifiConnections()
		.then(data => {
			if (data.length > 0) {
				Object.keys(data).forEach(function (key) {
					createChannel("wifi", "connections", "connection" + key);
					setSystemStates(data[key], "wifi","connections.connection" + key);
				});
			}
		})
		.catch(error => adapter.log.error(error));

}

const updateCurrentBatteryInfos = function () {

	sistm.battery()
		.then(data => {
			adapter.setState("sysinfo.battery.hasBattery", {val: data.hasBattery, ack: true});
			adapter.setState("sysinfo.battery.cycleCount", {val: data.cycleCount, ack: true});
			adapter.setState("sysinfo.battery.isCharging", {val: data.isCharging, ack: true});
			adapter.setState("sysinfo.battery.maxCapacity", {val: data.maxCapacity, ack: true});
			adapter.setState("sysinfo.battery.currentCapacity", {val: data.currentCapacity, ack: true});
			adapter.setState("sysinfo.battery.percent", {val: data.percent, ack: true});
			adapter.setState("sysinfo.battery.timeRemaining", {val: data.timeRemaining, ack: true});
			adapter.setState("sysinfo.battery.acConnected", {val: data.acConnected, ack: true});
		})
		.catch(error => adapter.log.error(error));

};

const updateCurrentProcessInfos = function () {

	sistm.processes()
		.then(data => {
			adapter.setState("sysinfo.os.processes.all", {val: data.all, ack: true});
			adapter.setState("sysinfo.os.processes.running", {val: data.running, ack: true});
			adapter.setState("sysinfo.os.processes.blocked", {val: data.blocked, ack: true});
			adapter.setState("sysinfo.os.processes.sleeping", {val: data.sleeping, ack: true});
			adapter.setState("sysinfo.os.processes.unknown", {val: data.unknown, ack: true});
			adapter.setState("sysinfo.os.processes.list", {val: JSON.stringify(data.list), ack: true});
		})
		.catch(error => adapter.log.error(error));

};

const updateCurrentUsersInfos = function () {

	sistm.users()
		.then(data => {
			adapter.setState("sysinfo.os.users", {val: JSON.stringify(data), ack: true});
		})
		.catch(error => adapter.log.error(error));

};

function main() {
	if (!axios || typeof axios !== "function") {
		adapter.log.error("Axios HTTP client could not be required. Please check your installation!");
		adapter.terminate ? adapter.terminate(11) : process.exit(11);
		return;
	}

	adapter.getState("readTestFile", function (err, obj) {
		if (!err && obj) {
			testLink = obj.val;
			test = testLink && testLink.length > 0 && testLink.toUpperCase().endsWith(".JSON");
		} else {
			adapter.setState("readTestFile", {val: false, ack: true});
		}

		adapter.getState("last_popup", function (err, obj) {
			if (!err && (!obj || !obj.val)) {
				adapter.setState("last_popup", {val: "2019-01-01T00:00:00.000Z", ack: true});
			}
			checkNews();
			adapterIntervals.checkNews = setInterval(checkNews, 30 * 60 * 1000);
			updateSysinfo(true);
		});

	});
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
	module.exports = startAdapter;
} else {
	// or start the instance directly
	startAdapter();
}
