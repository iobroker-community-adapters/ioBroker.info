/* global adapterConfig, Chartist, socket */

const cpuLabels = [];
const memLabels = [];
const diskLabels = [];

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
                    obj.name = link[link.length-1];
                    let value = null;
                    if(res[key]){
                        value = res[key].val;
                    }
                    obj.value = value;
                    systemInformations.writeData(obj);
                });
            }            
        });
    },
    writeData: function (obj) {
        if (obj.device && $("#sys_info_" + obj.systype + "_" + obj.syssubtype + "_" + obj.device).length === 0) {
            const dl = "<h3>" + obj.device + "</h3><dl class='dl-horizontal' id='sys_info_" + obj.systype + "_" + obj.syssubtype + "_" + obj.device + "'></dl>";
            $('#sys_info_' + obj.systype + '_' + obj.syssubtype).append($(dl));
        }
        const row = "<dt>" + _(obj.name) + "</dt><dd>" + obj.value + "</dd>";
        $('#sys_info_' + obj.systype + (obj.systype !== "battery" ? '_' + obj.syssubtype : '') + (obj.device ? '_' + obj.device : '')).append($(row));
    }
};

