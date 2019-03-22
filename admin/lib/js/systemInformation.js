/* global adapterConfig, Chartist, socket, parseFloat */

const cpuLabels = [];
const memLabels = [];
const diskLabels = [];

/** 
 * FormatObject for host informations
 * @type type
 */
const formatInfo = {
    'Uptime': formatter.formatSeconds,
    'System uptime': formatter.formatSeconds,
    'RAM': formatter.formatByte,
    'Speed': formatter.formatSpeedMhz,
    'Disk size': formatter.formatByte,
    'Disk free': formatter.formatByte,
    'cpu.speed': formatter.formatSpeedGhz,
    'cpu.speedmax': formatter.formatSpeedGhz,
    'cpu.speedmin': formatter.formatSpeedGhz,
    'cpu.cache-l1d': formatter.formatByte,
    'cpu.cache-l1i': formatter.formatByte,
    'cpu.cache-l2': formatter.formatByte,
    'cpu.cache-l3': formatter.formatByte,
    'cpu.currentload': formatter.formatPercent2Digits,
    'cpu.currentload_idle': formatter.formatPercent2Digits,
    'cpu.currentload_irq': formatter.formatPercent2Digits,
    'cpu.currentload_nice': formatter.formatPercent2Digits,
    'cpu.currentload_system': formatter.formatPercent2Digits,
    'cpu.currentload_user': formatter.formatPercent2Digits,
    'cpu.avgload': formatter.formatDecimalPercent2Digits,
    'cpu.main': formatter.formatTemperature,
    'cpu.max': formatter.formatTemperature,
    'memory.total': formatter.formatByte,
    'memory.free': formatter.formatByte,
    'memory.used': formatter.formatByte,
    'memory.active': formatter.formatByte,
    'memory.buffcache': formatter.formatByte,
    'memory.available': formatter.formatByte,
    'memory.swaptotal': formatter.formatByte,
    'memory.swapused': formatter.formatByte,
    'memory.swapfree': formatter.formatByte,
    'disks.size': formatter.formatByte,
    'disks.used': formatter.formatByte,
    'disks.use': formatter.formatPercent2Digits,
    'network.speed': formatter.formatMhzSec,
    'network.type': formatter.translateValue,
    'network.duplex': formatter.translateValue
};

const formatter = {
    formatSeconds: function (seconds) {
        const days = Math.floor(seconds / (3600 * 24));
        seconds %= 3600 * 24;
        let hours = Math.floor(seconds / 3600);
        if (hours < 10) {
            hours = '0' + hours;
        }
        seconds %= 3600;
        let minutes = Math.floor(seconds / 60);
        if (minutes < 10) {
            minutes = '0' + minutes;
        }
        seconds %= 60;
        seconds = Math.floor(seconds);
        if (seconds < 10) {
            seconds = '0' + seconds;
        }
        let text = '';
        if (days) {
            text += days + " " + _("daysShortText") + ' ';
        }
        text += hours + ':' + minutes + ':' + seconds;

        return text;
    },
    formatByte: function (bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, formatSpeedMhz: function (mhz) {
        return mhz + " MHz";
    }, formatSpeedGhz: function (ghz) {
        return ghz + " GHz";
    }, formatPercent2Digits: function (number) {
        return parseFloat(Math.round(number * 100) / 100).toFixed(2) + " %";
    }, formatDecimalPercent2Digits: function (number) {
        number *= 100;
        return parseFloat(Math.round(number * 100) / 100).toFixed(2) + " %";
    }, formatTemperature: function (temp) {
        return temp + " °C";
    }, formatMhzSec: function (speed) {
        return speed + " Mbit/s";
    }, translateValue: function(text){
        return _(text);
    }
};

function startCharts() {

    if (cpuLabels.length === 0) {
        let labelText = 0;
        for (let i = 0; i < 31; i++) {
            if (labelText % 5 === 0) {
                cpuLabels.push(labelText + "s");
            } else {
                cpuLabels.push(" ");
            }
            labelText += adapterConfig.cpuSpeed;
        }
        cpuLabels.reverse();
    }
    if (memLabels.length === 0) {
        let labelText = 0;
        for (let i = 0; i < 31; i++) {
            if (labelText % 5 === 0) {
                memLabels.push(labelText + "s");
            } else {
                memLabels.push(" ");
            }
            labelText += adapterConfig.memSpeed;
        }
        memLabels.reverse();
    }
    if (diskLabels.length === 0) {
        let labelText = 0;
        for (let i = 0; i < 31; i++) {
            if (labelText % 5 === 0) {
                diskLabels.push(labelText + "s");
            } else {
                diskLabels.push(" ");
            }
            labelText += adapterConfig.diskSpeed;
        }
        diskLabels.reverse();
    }

    socket.emit('subscribe', 'info.0.sysinfo.cpu.currentLoad_currentload_hist');
    socket.emit('subscribe', 'info.0.sysinfo.memory.mem_used_hist');

    socket.on('stateChange', function (id, obj) {
        if (id === "info.0.sysinfo.cpu.currentLoad_currentload_hist") {
            infoCharts.showCPU(obj.val.split(','));
        }
    });

    socket.emit('getState', 'info.0.sysinfo.cpu.currentLoad_currentload_hist', function (err, data) {
        if (!err && data) {
            infoCharts.showCPU(data.val.split(','));
        }
    });

}

const infoCharts = {
    showCPU: function (data) {

        var data = {
            labels: cpuLabels,
            series: [data]
        };

        var options = {
            high: 100,
            low: 0,
            width: '400px',
            height: '200px',
            showPoint: false
        };

        new Chartist.Line('#cpu-chart', data, options);
    }
};

const systemInformations = {
    getData: function () {
        socket.emit('getForeignStates', 'info.0.sysinfo.*', function (err, res) {
            if (!err && res) {
                Object.keys(res).forEach(function (key) {
                    const obj = {};
                    const link = key.split('.');
                    obj.systype = link[3];
                    if (link.length > 5) {
                        obj.syssubtype = link[4];
                    }
                    if (link.length > 6) {
                        obj.device = link[5];
                    }
                    obj.name = link[link.length - 1];
                    let value = null;
                    if (res[key]) {
                        value = res[key].val;
                    }
                    obj.value = value;
                    systemInformations.writeData(obj);
                });
            }
        });
    },
    writeData: function (obj) {
        if (obj.systype === "os" && obj.name === "logofile") {
            $('#sys_info_os_img_logo').attr('src', 'lib/img/logos/' + obj.value + '.png');
        } else if (obj.name.endsWith('_hist')) {

        } else {
            if (obj.device && $("#sys_info_" + obj.systype + "_" + obj.syssubtype + "_" + obj.device).length === 0) {
                const dl = "<h3>" + obj.device + "</h3><dl class='dl-horizontal' id='sys_info_" + obj.systype + "_" + obj.syssubtype + "_" + obj.device + "'></dl>";
                $('#sys_info_' + obj.systype + '_' + obj.syssubtype).append($(dl));
            }
            const row = "<dt>" + _(obj.systype + "." + obj.name) + "</dt><dd>" + (formatInfo[obj.systype + "." + obj.name] ? formatInfo[obj.systype + "." + obj.name](obj.value) : obj.value) + "</dd>";
            $('#sys_info_' + obj.systype + (obj.systype !== "battery" ? '_' + obj.syssubtype : '') + (obj.device ? '_' + obj.device : '')).append($(row));
        }
    }
};

