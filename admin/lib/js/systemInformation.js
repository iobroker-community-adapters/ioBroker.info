/* global adapterConfig, Chartist, socket */

const cpuLabels = [];
const memLabels = [];
const diskLabels = [];

function startCharts() {
    
    if(cpuLabels.length === 0){
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
    if(memLabels.length === 0){
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
    if(diskLabels.length === 0){
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
    showCPU: function(data) {
      
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
    getData: function(){
        socket.emit('getObjectView', 'info', 'systemdata', {startkey: 'info.0.sysinfo.', endkey: 'info.0.sysinfo.\u9999'}, function (err, res) {
        if (!err && res) {
           
        }
    });
    }
};

