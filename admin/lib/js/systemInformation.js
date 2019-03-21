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
        socket.emit('getObjectView', 'system', 'state', {startkey: 'info.0.sysinfo.', endkey: 'info.0.sysinfo.\u9999'}, function (err, res) {
            if (!err && res) {
                var _res = {};
                for (var i = 0; i < res.rows.length; i++) {
                    const link = res.rows[i].id.split('.');
                    _res[res.rows[i].id] = {};
                    _res[res.rows[i].id].systype = link[3];
                    if (link.length > 5) {
                        _res[res.rows[i].id].syssubtype = link[4];
                    }
                    if (link.length > 6) {
                        _res[res.rows[i].id].device = link[5];
                    }
                    _res[res.rows[i].id].name = res.rows[i].value.common.name;
                    _res[res.rows[i].id].unit = res.rows[i].value.common.unit;
                    _res[res.rows[i].id].min = res.rows[i].value.common.min;
                    _res[res.rows[i].id].max = res.rows[i].value.common.max;
                }

                Object.keys(_res).forEach(function (key) {
                    socket.emit('getState', key, function (err, data) {
                        if (!err && data) {
                            const obj = _res[key];
                            obj.value = data.val;
                            systemInformations.writeData(obj);
                        }
                    });
                });

            } else {
                console.log(JSON.stringify(err));
            }
        });
    },
    writeData: function (obj) {
        if (obj.device) {
            const dl = "<h3>" + obj.device + "</h3><dl class='dl-horizontal' id='sys_info_" + obj.systype + "_" + obj.syssubtype + "_" + obj.device + "'></dl>";
            $('#sys_info_' + obj.systype + '_' + obj.syssubtype).append($(dl));
        }
        const row = "<dt>" + _(obj.name) + "</dt><dd>" + obj.value + "</dd>";
        $('#sys_info_' + obj.systype + (obj.systype !== "battery" ? '_' + obj.syssubtype : '') + (obj.device ? '_' + obj.device : '')).append($(row));
    }
};

