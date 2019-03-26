/* global systemConfig, socket, systemLang, mainHost */

//------------------------------------------------------ UPDATE ADAPTER LIST --------------------------------------------------------------

const installMsg = {};
let cmdCallback, activeCmdId;
let $stdout;
let stdout = '';

let curInstalled = null;
let curRepository = null;
let curRepoLastUpdate = null;
let curRunning = null;

/** 
 * Get adapter informations
 * @param {type} host
 * @param {type} callback
 */
const getAdaptersInfo = function (host, callback) {
    if (!host) {
        return;
    }

    if (!callback) {
        throw 'Callback cannot be null or undefined';
    }

    if (!curRepoLastUpdate || ((new Date()).getTime() - curRepoLastUpdate > 1000)) {
        curRepository = null;
        curInstalled = null;
    }

    if (curRunning) {
        curRunning.push(callback);
        return;
    }

    if (!this.curRepository) {
        socket.emit('sendToHost', host, 'getRepository', {repo: systemConfig.common.activeRepo, update: true}, function (_repository) {
            if (_repository === 'permissionError') {
                console.error('May not read "getRepository"');
                _repository = {};
            }

            curRepository = _repository || {};
            if (curRepository && curInstalled && curRunning) {
                curRepoLastUpdate = (new Date()).getTime();
                setTimeout(function () {
                    for (let c = 0; c < curRunning.length; c++) {
                        curRunning[c](curRepository, curInstalled);
                    }
                    curRunning = null;
                }, 0);
            }
        });
    }
    if (!this.curInstalled) {
        socket.emit('sendToHost', host, 'getInstalled', null, function (_installed) {
            if (_installed === 'permissionError') {
                console.error('May not read "getInstalled"');
                _installed = {};
            }

            curInstalled = _installed || {};
            if (curRepository && curInstalled) {
                curRepoLastUpdate = (new Date()).getTime();
                setTimeout(function () {
                    for (let c = 0; c < curRunning.length; c++) {
                        curRunning[c](curRepository, curInstalled);
                    }
                    curRunning = null;
                }, 0);
            }
        });
    }

    if (this.curInstalled && this.curRepository) {
        setTimeout(function () {
            if (curRunning) {
                for (let c = 0; c < curRunning.length; c++) {
                    curRunning[c](curRepository, curInstalled);
                }
                curRunning = null;
            }
            if (callback)
                callback(curRepository, curInstalled);
        }, 0);
    } else {
        curRunning = [callback];
    }

};

/** 
 * Look if the adapter is up to date
 * @param {type} _new
 * @param {type} old
 * @returns {Boolean}
 */
const upToDate = function (_new, old) {
    _new = _new.split('.');
    old = old.split('.');
    _new[0] = parseInt(_new[0], 10);
    old[0] = parseInt(old[0], 10);
    if (_new[0] > old[0]) {
        return false;
    } else if (_new[0] === old[0]) {
        _new[1] = parseInt(_new[1], 10);
        old[1] = parseInt(old[1], 10);
        if (_new[1] > old[1]) {
            return false;
        } else if (_new[1] === old[1]) {
            _new[2] = parseInt(_new[2], 10);
            old[2] = parseInt(old[2], 10);
            return (_new[2] <= old[2]);
        } else {
            return true;
        }
    } else {
        return true;
    }
};

/**
 * fill the update and new adapters list
 * @param {String} type
 * @param {Array} list
 * @param {Object} repository
 * @param {Object} installedList
 */
function fillList(type, list, repository, installedList) {
    const $ul = $('#' + type + 'HomeList');
    $ul.empty();
    $('#' + type + 'HomeListLoader').remove();

    const isInstalled = type === 'update';
    const isHost = type === 'hostUpdate';
    let counter = 0;
    const uniqueCount = [];

    for (let i = 0; i < list.length; i++) {

        const $tmpLiElement = $('#' + type + 'HomeListTemplate').children().clone(true, true);

        const adapter = list[i];
        const obj = (isInstalled || isHost) ? (installedList ? installedList[adapter] : null) : repository[adapter];

        if (isHost) {
            $tmpLiElement.find('.title').text(_("Your host '%s' is outdated!", adapter));
        } else {
            $tmpLiElement.find('.title').text((obj.title || '').replace('ioBroker Visualisation - ', ''));
        }

        $tmpLiElement.find('.version').text(obj.version);
        $tmpLiElement.attr("id", "adapter-InstallOrUpdate-" + adapter);

        if (isHost) {
            $tmpLiElement.find('.newVersion').text(repository[adapter].version);
            $tmpLiElement.find('.host-readme-submit').attr('data-md-url', obj.readme.replace('https://github.com', 'https://raw.githubusercontent.com').replace('blob/', ''));
            const news = getNews(obj.version, repository[adapter]);
            if (news) {
                $tmpLiElement.find('.notesVersion').attr('title', news);
            } else {
                $tmpLiElement.find('.notesVersion').remove();
            }
        } else if (isInstalled && repository[adapter]) {
            if (!(adapter in uniqueCount)) {
                uniqueCount.push(adapter);
            }
            counter++;
            
            $tmpLiElement.find('.adapter-update-submit').attr('data-adapter-name', adapter);
            $tmpLiElement.find('.newVersion').text(repository[adapter].version);
            if (obj.readme) {
                $tmpLiElement.find('.adapter-readme-submit').attr('data-md-url', obj.readme.replace('https://github.com', 'https://raw.githubusercontent.com').replace('blob/', ''));
            } else {
                $tmpLiElement.find('.adapter-readme-submit').remove();
            }
            const news = getNews(obj.version, repository[adapter]);
            if (news) {
                $tmpLiElement.find('.notesVersion').attr('title', news);
            } else {
                $tmpLiElement.find('.notesVersion').remove();
            }
        } else if (!isInstalled) {
            $tmpLiElement.find('.adapter-install-submit').attr('data-adapter-name', adapter);
            if (obj.readme) {
                $tmpLiElement.find('.adapter-readme-submit').attr('data-md-url', obj.readme.replace('https://github.com', 'https://raw.githubusercontent.com').replace('blob/', ''));
            } else {
                $tmpLiElement.find('.adapter-readme-submit').remove();
            }
        }

        $ul.append($tmpLiElement);
    }

    if (isInstalled && installedList) {
        if (counter === 0) {
            $('#homeUpdateListTab')
                    .find(".x_content")
                    .addClass('allOk')
                    .html('<h3 id="noUpdateAllOk" style="text-align: center;">' + _('All adapters are up to date!') + '</h3>');
        }
    }

    if (isHost && list.length === 0) {
        $('#hostUpdateHomeListRow').hide();
        $('#homeNewAdapterDiv').removeClass('height_150').addClass('height_320');
    }
}

const getNews = function (actualVersion, adapter) {
    let text = '';
    if (adapter.news) {
        for (let v in adapter.news) {
            if (!adapter.news.hasOwnProperty(v)) {
                continue;
            }
            if (systemLang === v) {
                text += (text ? '\n' : '') + adapter.news[v];
            }
            if (v === actualVersion) {
                break;
            }
            text += (text ? '\n' : '') + (adapter.news[v][systemLang] || adapter.news[v].en);
        }
    }
    return text;
};

const cmdExec = function (cmd, callback) {

    $stdout = $('#stdout');
    $stdout.val('');

    let title = cmd, tmp, name, msgSuccess, msgError;
    if (title.startsWith('add')) {
        tmp = title.split(' ');
        name = tmp[1];
        title = _('Installing adapter %s...', name);
        msgSuccess = _('The adapter %s has been successfully installed!', name);
        msgError = _('Failed to install %s', name);
    } else if (title.startsWith('upgrade')) {
        tmp = title.split(' ');
        name = tmp[1];
        title = _('Updating adapter %s...', name);
        msgSuccess = _('The adpter %s has been successfully updated!', name);
        msgError = _('Failed to update %s', name);
    }

    $('#modal-command-label').text(title);

    stdout = '$ ./iobroker ' + cmd;
    $stdout.val(stdout);

    activeCmdId = Math.floor(Math.random() * 0xFFFFFFE) + 1;

    installMsg[activeCmdId] = {};
    installMsg[activeCmdId].success = msgSuccess;
    installMsg[activeCmdId].error = msgError;
    installMsg[activeCmdId].name = name;

    $('#modal-command').modal();

    cmdCallback = callback;
    socket.emit('cmdExec', mainHost, activeCmdId, cmd, function (err) {
        if (err) {
            stdout += '\n' + _(err);
            $stdout.val(stdout);
            cmdCallback = null;
            callback(err);
        } else {
            if (callback) {
                callback();
            }
        }
    });
};

socket.on('cmdStdout', function (_id, text) {
    if (activeCmdId === _id) {
        stdout += '\n' + text;
        $('#adapter-meter').progressbar("auto");
        $stdout.val(stdout);
        $stdout.scrollTop($stdout[0].scrollHeight - $stdout.height());
    }
});
socket.on('cmdStderr', function (_id, text) {
    if (activeCmdId === _id) {
        stdout += '\nERROR: ' + text;
        $('#adapter-meter').progressbar("auto");
        $stdout.val(stdout);
        $stdout.scrollTop($stdout[0].scrollHeight - $stdout.height());
    }
});
socket.on('cmdExit', function (_id, exitCode) {
    exitCode = parseInt(exitCode, 10);
    if (activeCmdId === _id) {
        stdout += '\n' + (exitCode !== 0 ? 'ERROR: ' : '') + 'process exited with code ' + exitCode;
        $stdout.val(stdout);
        $stdout.scrollTop($stdout[0].scrollHeight - $stdout.height());
        $('#adapter-install-close-btn').text(_('close'));

        if (!exitCode) {
            $('#adapter-meter').progressbar(100);
            $('#adapter-install-message-on-end').text(installMsg[_id].success);
            setTimeout(function () {
                if ($('#adapter-install-close-after').is(':checked')) {
                    $('#modal-command').modal('hide');
                }
            }, 1500);
            $('#' + _id).remove();
            $('#adapter-InstallOrUpdate-' + installMsg[activeCmdId].name).remove();
            const updateCount = window.top.$('#updates-for-adapters').text();
            let number = null;
            if (updateCount) {
                number = parseInt(updateCount) - 1;
            }
            window.top.gMain.tabs.adapters.updateCounter(number);
        } else {
            $('#adapter-meter').progressbar(90, "error");
            $('#adapter-install-message-on-end').text(installMsg[_id].error);
        }
        if (cmdCallback) {
            $('#adapter-install-close-btn').text(_('close'));
            cmdCallback(exitCode);
            cmdCallback = null;
        }
    } else if (installMsg.hasOwnProperty(_id)) {
        if (!exitCode) {
            $('#' + _id).remove();
            const updateCount = window.top.$('#updates-for-adapters').text();
            let number = null;
            if (updateCount) {
                number = parseInt(updateCount) - 1;
            }
            window.top.gMain.tabs.adapters.updateCounter(number);
            alert(installMsg[_id].success);
        } else {
            alert(installMsg[_id].error);
        }
        delete installMsg[_id];
    }
});

$(function () {
    $(document.body).on('click', '.adapter-update-submit', function () {
        const aName = $(this).attr('data-adapter-name');

        $(this).closest("li").attr('id', activeCmdId);

        cmdExec('upgrade ' + aName, function (exitCode) {
            if (!exitCode) {

            }
        });
    });

    $(document.body).on('click', '.adapter-install-submit', function () {
        const aName = $(this).attr('data-adapter-name');

        $(this).closest("li").attr('id', activeCmdId);

        cmdExec('install ' + aName, function (exitCode) {
            if (!exitCode) {

            }
        });
    });

    $(document.body).on('hidden.bs.modal', '#modal-command', function () {
        if (installMsg.hasOwnProperty(activeCmdId)) {
            installMsg[activeCmdId].closed = true;
        }
        activeCmdId = null;
        $('#adapter-meter').progressbar(1);
        $('#adapter-install-message-on-end').html('&nbsp;');
        $('#adapter-install-close-btn').text(_('Run on background'));
    });
});