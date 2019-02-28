/* global socket, updateInfoPage */

let versionMap;
const nodeOld = ["v0", "v4", "v5", "v7"];
const nodeNew = ["v9", "v10", "v11", "v12"];
const nodeAccepted = ["v6"];
const nodeRecommended = "v8";

let hosts = [];
let mainHost = '';

//------------------------------------------------------ HOST INFORMATION FUNCTIONS -------------------------------------------------------
async function getNodeVersionList(callback) {
    const data = await(await fetch("https://nodejs.org/dist/index.json")).json();
    versionMap = {};
    await asyncForEach(data, function (value) {
        const version = value.version;
        const key = version.substring(0, version.indexOf("."));
        if (!versionMap[key]) {
            versionMap[key] = version;
        }
    });
    
    if(callback){
        callback();
    }
}

function getNodeExtrainfo(host) {
    const version = $('#aktNodeVersion' + host).text();
    const aktKey = version.substring(0, version.indexOf("."));

    let extraInfo = "";
    let color = "green";

    if (nodeOld.indexOf(aktKey) !== -1) {
        extraInfo += " <span style='color: red; font-weight: bold;'>(" + _("Node.js too old") + " " + versionMap[nodeRecommended] + "</span>";
        color = "red";
    } else if (versionMap[aktKey] !== version || aktKey !== nodeRecommended) {
        let first = true;
        extraInfo += " (";

        if (versionMap[aktKey] !== version) {
            extraInfo += _("New Node version") + " " + versionMap[aktKey];
            color = "orange";
            first = false;
        }
        if (nodeNew.indexOf(aktKey) !== -1) {
            if (!first) {
                extraInfo += " ";
            } else {
                first = false;
            }
            extraInfo += _("Version %s.x of Node.js is currently not fully supported.", aktKey);
            color = "red";
        }
        if (aktKey !== nodeRecommended) {
            if (!first) {
                extraInfo += " - ";
            } else {
                first = false;
            }
            extraInfo += _("Recommended version") + " " + versionMap[nodeRecommended];
            if (color === "green" && nodeAccepted.indexOf(aktKey) === -1) {
                color = "orange";
            }
        }

        extraInfo += ")";
    }

    $('#nodeExtraInfo' + host).append(extraInfo);
    $('#aktNodeVersion' + host).css('color', color).css('font-weight', 'bold');

}

const getHosts = function () {
    socket.emit('getObjectView', 'system', 'host', {startkey: 'system.host.', endkey: 'system.host.\u9999'}, async function (err, res) {
        if (!err && res) {
            hosts = [];
            for (let i = 0; i < res.rows.length; i++) {
                hosts.push(res.rows[i].id.substring('system.host.'.length));
            }
            mainHost = res.rows[0].id.substring('system.host.'.length);
        }
        
        await getNodeVersionList(updateInfoPage);           
        
    });
};

/** 
 * Get host informations
 * @param {type} host
 * @param {type} callback
 */
const getHostInfo = function (host, callback) {
    if (!host) {
        return;
    }

    if (!callback) {
        throw 'Callback cannot be null or undefined';
    }

    socket.emit('sendToHost', host, 'getHostInfo', null, function (data) {
        if (data === 'permissionError') {
            console.error('May not read "getHostInfo"');
        } else if (!data) {
            console.error('Cannot read "getHostInfo"');
        } else {
            data.hostname = host;
        }

        data && callback && callback(data);
    });
};

/**
 * Format number in seconds to time text
 * @param {!number} seconds
 * @returns {String}
 */
function formatSeconds(seconds) {
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
}

/**
 * Format bytes to MB or GB
 * @param {!number} bytes
 * @returns {String}
 */
function formatRam(bytes) {
    const GB = Math.floor(bytes / (1024 * 1024 * 1024) * 10) / 10;
    bytes %= (1024 * 1024 * 1024);
    const MB = Math.floor(bytes / (1024 * 1024) * 10) / 10;
    let text = '';
    if (GB > 1) {
        text += GB + ' GB ';
    } else {
        text += MB + ' MB ';
    }

    return text;
}

function formatSpeed(mhz) {
    return mhz + " MHz";
}

/** 
 * FormatObject for host informations
 * @type type
 */
const formatInfo = {
    'Uptime': formatSeconds,
    'System uptime': formatSeconds,
    'RAM': formatRam,
    'Speed': formatSpeed
};