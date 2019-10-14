/* global socket, updateInfoPage, infoData */

let versionMap;

let hosts = [];
let mainHost = '';

//------------------------------------------------------ HOST INFORMATION FUNCTIONS -------------------------------------------------------
async function getNodeVersionList(callback) {
    
    let data;
    if (sessionStorage.getItem('ioBroker.info.nodejsInfo')) {
        data = JSON.parse(sessionStorage.getItem('ioBroker.info.nodejsInfo'));
    } else {
        data = await(await fetch("https://nodejs.org/dist/index.json")).json();
        sessionStorage.setItem('ioBroker.info.nodejsInfo', JSON.stringify(data));
    }

    versionMap = {};
    await asyncForEach(data, function (value) {
        const version = value.version;
        const key = version.substring(0, version.indexOf("."));
        if (!versionMap[key]) {
            versionMap[key] = version;
        }
    });

    if (callback) {
        callback();
    }
}

function getNodeExtrainfo(host) {
    const hostID = host.replace(/[^a-z0-9]/gmi, "_").replace(/\s+/g, "_");
    const version = $('#aktNodeVersion' + hostID).text();
    const aktKey = version.substring(0, version.indexOf("."));

    let extraInfo = "";
    let color = "green";

    if (infoData.nodeOld.indexOf(aktKey) !== -1) {
        extraInfo += " <span style='color: red; font-weight: bold;'>(" + _("Node.js too old") + " " + versionMap[infoData.nodeRecommended] + "</span>";
        color = "red";
    } else if (versionMap[aktKey] !== version || aktKey !== infoData.nodeRecommended) {
        let first = true;
        extraInfo += " (";

        if (versionMap[aktKey] !== version) {
            extraInfo += _("New Node version") + " " + versionMap[aktKey];
            color = "orange";
            first = false;
        }
        if (infoData.nodeNew.indexOf(aktKey) !== -1) {
            if (!first) {
                extraInfo += " ";
            } else {
                first = false;
            }
            extraInfo += _("Version %s.x of Node.js is currently not fully supported.", aktKey);
            color = "red";
        }
        if (aktKey !== infoData.nodeRecommended) {
            if (!first) {
                extraInfo += " - ";
            } else {
                first = false;
            }
            extraInfo += _("Recommended version") + " " + versionMap[infoData.nodeRecommended];
            if (color === "green" && infoData.nodeAccepted.indexOf(aktKey) === -1) {
                color = "orange";
            }
        }

        extraInfo += ")";
    }

    $('#nodeExtraInfo' + hostID).append(extraInfo);
    $('#aktNodeVersion' + hostID).css('color', color).css('font-weight', 'bold');

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