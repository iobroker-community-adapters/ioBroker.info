/* global adapterConfig, Chartist, socket, parseFloat, formatter */

const cpuLabels = [];
const memLabels = [];
const diskLabels = [];

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
    'cpu.avgSpeed': formatter.formatSpeedGhz,
    'cpu.maxSpeed': formatter.formatSpeedGhz,
    'cpu.minSpeed': formatter.formatSpeedGhz,
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
    'memory.size': formatter.formatByte,
    'memory.clockSpeed': formatter.formatSpeedMhz,
    'memory.buffcache': formatter.formatByte,
    'memory.available': formatter.formatByte,
    'memory.type': formatter.formatTranslate,
    'memory.swaptotal': formatter.formatByte,
    'memory.swapused': formatter.formatByte,
    'memory.swapfree': formatter.formatByte,
    'memory.voltageConfigured': formatter.formatSpeedV,
    'memory.voltageMin': formatter.formatSpeedV,
    'memory.voltageMax': formatter.formatSpeedV,
    'disks.size': formatter.formatByte,
    'disks.used': formatter.formatByte,
    'disks.use': formatter.formatPercent2Digits,
    'disks.removable': formatter.formatBoolean,
    'disks.smartStatus': formatter.formatTranslate,
    'network.speed': formatter.formatMhzSec,
    'network.type': formatter.formatTranslate,
    'network.duplex': formatter.formatTranslate,
    'network.internal': formatter.formatBoolean,
    'network.operstate': formatter.formatTranslate,
    'network.mtu': formatter.formatByte,
    'graphics.resolutiony': formatter.formatPixel,
    'graphics.resolutionx': formatter.formatPixel,
    'graphics.pixeldepth': formatter.formatBits,
    'graphics.sizex': formatter.formatMm,
    'graphics.sizey': formatter.formatMm,
    'graphics.vram': formatter.formatMb,
    'battery.hasbattery': formatter.formatBoolean,
    'battery.acconnected': formatter.formatBoolean,
    'battery.ischarging': formatter.formatBoolean
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
            // For Charts
        } else if (obj.syssubtype === "processes") {
            if (obj.name === "list") {
                const list = JSON.parse(obj.value);
                list.forEach(function (data) {
                    let row = "<tr>";
                    row += "<td>" + data.pid + "</td>";
                    row += "<td>" + data.parentPid + "</td>";
                    row += "<td>" + data.name + "</td>";
                    row += "<td>" + formatter.formatPercent2Digits(data.pcpu) + "</td>";
                    row += "<td>" + formatter.formatPercent2Digits(data.pcpuu) + "</td>";
                    row += "<td>" + formatter.formatPercent2Digits(data.pcpus) + "</td>";
                    row += "<td>" + formatter.formatPercent2Digits(data.pmem) + "</td>";
                    row += "<td>" + data.priority + "</td>";
                    row += "<td>" + formatter.formatByte(data.mem_vsz) + "</td>";
                    row += "<td>" + formatter.formatByte(data.mem_rss) + "</td>";
                    row += "<td>" + data.nice + "</td>";
                    row += "<td>" + data.started + "</td>";
                    row += "<td>" + _(data.state) + "</td>";
                    row += "<td>" + data.tty + "</td>";
                    row += "<td>" + data.user + "</td>";
                    row += "<td>" + data.command + "</td>";
                    row += "</tr>";
                    $('#info_0_sysinfo_os_processes_list_data').append($(row));
                });

            } else {
                $('#info_0_sysinfo_os_processes_' + obj.name + '_data').text(obj.value);
            }
        } else {
            if (obj.device && $("#sys_info_" + obj.systype + "_" + obj.syssubtype + "_" + obj.device).length === 0) {
                const dl = "<h3 id='sys_info_" + obj.systype + "_" + obj.syssubtype + "_" + obj.device + "_devicename'>" + obj.device + "</h3><dl class='dl-horizontal' id='sys_info_" + obj.systype + "_" + obj.syssubtype + "_" + obj.device + "'></dl>";
                $('#sys_info_' + obj.systype + '_' + obj.syssubtype).append($(dl));
            }
            const row = "<dt>" + _(obj.systype + "." + obj.name) + "</dt><dd id='info_0_sysinfo_" + obj.systype + (obj.systype !== "battery" ? '_' + obj.syssubtype : '') + (obj.device ? '_' + obj.device : '') + "_" + obj.name + "_data'>" + (formatInfo[obj.systype + "." + obj.name] ? formatInfo[obj.systype + "." + obj.name](obj.value) : obj.value) + "</dd>";
            $('#sys_info_' + obj.systype + (obj.systype !== "battery" ? '_' + obj.syssubtype : '') + (obj.device ? '_' + obj.device : '')).append($(row));
        }
    }
};

