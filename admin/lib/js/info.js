/* global io, systemDictionary, showdown, bootbox */

$(function () {

    let versionMap;
    const nodeOld = ["v0", "v4", "v5", "v7"];
    const nodeNew = ["v9", "v10", "v11", "v12"];
    const nodeAccepted = ["v6"];
    const nodeRecommended = "v8";

    const socket = io.connect();

    let hosts = [];
    let mainHost = '';
    let systemLang;    
    let systemConfig = {};
    let adapterConfig = {};
    
    const uptimeMap = {};
    const languages = ["de", "en", "ru", "pt", "nl", "fr", "it", "es", "pl"];
    const dateOptions = {"weekday": "short", "year": "numeric", "month": "long", "day": "2-digit", "hour": "2-digit", "minute": "2-digit", "second": "2-digit"};

    const installMsg = {};
    let cmdCallback, activeCmdId;
    const $stdout = $('#stdout');
    let stdout = '';

    //--------------------------------------------------------- COMMONS -----------------------------------------------------------------------
    /** 
     * Read the settings for info adapter
     * @param {type} callback
     */
    function readInstanceConfig(callback) {
        socket.emit('getObject', 'system.config', function (err, data) {
            systemConfig = data;
            if (!err && systemConfig && systemConfig.common) {
                systemLang = systemConfig.common.language;
            } else {
                systemLang = window.navigator.userLanguage || window.navigator.language;
                if (!(systemLang in languages)) {
                    systemConfig.common.language = 'en';
                    systemLang = 'en';
                }
            }

            socket.emit('getObject', 'system.adapter.info.0', function (err, res) {
                if (!err && res && res.native) {
                    adapterConfig = res.native;
                }
                if (typeof callback === 'function') {
                    callback();
                }
            });
        });
    }

    /** 
     * Translate word
     * @param {type} word
     * @returns {String}
     */
    function _(word) {
        let text = translateWord(word, systemLang, systemDictionary);

        for (let i = 1; i < arguments.length; i++) {
            if (text.indexOf('%s') !== -1) {
                text = text.replace('%s', arguments[i]);
            }
        }

        return text;
    }

    //-------------------------------------------------------- USABILITY FUNCTIONS -------------------------------------------------------------
    $(document.body).on('click', '.x_panel .x_title', function () {
        const $BOX_PANEL = $(this).closest('.x_panel'),
                $ICON = $(this).find('i'),
                $BOX_CONTENT = $BOX_PANEL.find('.x_content');
        // fix for some div with hardcoded fix class
        if ($BOX_PANEL.attr('style')) {
            $BOX_CONTENT.slideToggle(200, function () {
                $BOX_PANEL.removeAttr('style');
            });
        } else {
            $BOX_CONTENT.slideToggle(200);
            $BOX_PANEL.css('height', 'auto');
        }

        $ICON.toggleClass('fa-chevron-up fa-chevron-down');
    });

    $('.close-link').click(function () {
        $(this).closest('.x_panel').remove();
    });

    $(document.body).on('click', '.show-md', function () {
        const url = $(this).data('md-url');
        $.get(url, function (data) {
            const link = url.match(/([^/]*\/){6}/);
            const html = new showdown.Converter().makeHtml(data).replace(/src="(?!http)/g, 'class="img-responsive" src="' + link[0]);
            bootbox.alert({
                size: 'large',
                backdrop: true,
                message: html
            }).off("shown.bs.modal");
        });
    });

    $(document.body).on('click', '.host-update', function () {
        parent.window.location.hash = '#tab-hosts';
    });

    //------------------------------------------------------- CLOCK FUNCTIONS -----------------------------------------------------------------
    let secInterval, hourInterval, minInterval, isClockOn = false;

    /** 
     * Start clock
     */
    function startClock() {
        isClockOn = true;
        secInterval = setInterval(function () {
            const seconds = new Date().getSeconds();
            const sdegree = seconds * 6;
            const srotate = "rotate(" + sdegree + "deg)";

            $("#cssSec").css({"-moz-transform": srotate, "-webkit-transform": srotate});

        }, 1000);


        hourInterval = setInterval(function () {
            const hours = new Date().getHours();
            if (hours === 0) {
                getActualDate();
            }
            const mins = new Date().getMinutes();
            const hdegree = hours * 30 + (mins / 2);
            const hrotate = "rotate(" + hdegree + "deg)";

            $("#cssHour").css({"-moz-transform": hrotate, "-webkit-transform": hrotate});

        }, 1000);


        minInterval = setInterval(function () {
            const mins = new Date().getMinutes();
            const mdegree = mins * 6;
            const mrotate = "rotate(" + mdegree + "deg)";

            $("#cssMin").css({"-moz-transform": mrotate, "-webkit-transform": mrotate});

        }, 1000);

        getActualDate();
    }

    /** 
     * Get actual local date
     */
    function getActualDate() {
        const date = new Date();
        $('#date_now').text(date.toLocaleString(systemLang, {"year": "numeric", "month": "long", "day": "2-digit"}));
        $('#weekday_now').text(date.toLocaleString(systemLang, {weekday: "long"}));
    }

    /** 
     * Stop clock
     */
    function stopClock() {
        isClockOn = false;
        clearInterval(secInterval);
        clearInterval(hourInterval);
        clearInterval(minInterval);
        $(window).off('resize');
    }

    //------------------------------------------------------ NEWS & FORUM FUNCTIONS -----------------------------------------------------------

    /** 
     * Request Data for News
     * @param {type} site
     * @param {type} callback
     * @returns {Boolean}
     */
    function requestCrossDomain(site, callback) {
        if (!site) {
            alert('No site was passed.');
            return false;
        }

        const yql = 'https://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="' + site + '"') + '&format=xml&callback=?';

        $.getJSON(yql, function(data){
            if (data.results[0]) {
                if (typeof callback === 'function') {
                    callback(data);
                }
            } else {
                throw new Error('Nothing returned from getJSON.');
            }
        });
    }

    const getForumData = function () {
        requestCrossDomain('http://forum.iobroker.net/feed.php?mode=topics', writeForumData);
    };

    /** 
     * Format the newest forum threads
     * @param {type} data
     */
    const writeForumData = function (data) {
        if (data.results && data.results[0]) {
            const $forumContent = $($.parseXML(data.results[0]));

            $('#forumTime').text(new Date($forumContent.find('updated:first').text()).toLocaleDateString(systemLang, dateOptions));
            let forumLink = $forumContent.find('link:nth-of-type(2)').attr('href');
            if (!forumLink) {
                forumLink = "https://forum.iobroker.net/";
            }
            $('#forum-link').attr("href", forumLink);

            $('#forumList').empty();
            $('entry', $forumContent).each(function () {
                const $item = $('#forumEntryTemplate').children().clone(true, true);
                $item.find('.forumClass').text($(this).find('category').eq(0).attr('label').replace('ioBroker ', ''));
                $item.find('.titleLink').text($(this).find('title').eq(0).text())
                        .attr('href', $(this).find('link').eq(0).attr('href'));
                $item.find('.description').html($(this).find('content').eq(0).text());
                $item.find('.postimage').addClass('img-responsive');
                $item.find('.description a').attr('target', '_blank');
                $item.find('.byline').text(new Date($(this).find('updated').eq(0).text()).toLocaleDateString(systemLang, dateOptions) + " - " + $(this).find('name').eq(0).text());
                $('#forumList').append($item);
            });
        }
    };

    socket.on('stateChange', function (id, obj) {
        if (adapterConfig.news && id === "info.0.newsfeed") {
            writeNewsData(obj);
        } else if (id === "info.0.lastPopupWarning") {
            showPopup(obj);
        }
    });

    function showPopup(obj) {
        $.each(obj, function (i, val) {
            window.top.gMain.showMessage(val.title, val.description, 'info');
            socket.emit('setState', 'info.0.popupReaded', {val: true, ack: true});
        });
    }

    /** 
     * Format RSS Stream from iobroker.net
     * @param {type} data
     */
    const writeNewsData = function (data) {
        if (data.results && data.results[0]) {
            const $newsContent = $($.parseXML(data.results[0]));

            $('#newsTime').text(new Date($newsContent.find('lastBuildDate:first').text()).toLocaleDateString(systemLang, dateOptions));
            $('#news-link').attr("href", $newsContent.find('link:first').text());

            $('#newsList').empty();
            $('item', $newsContent).each(function () {
                const $item = $('#forumEntryTemplate').children().clone(true, true);
                $item.find('.forumClass').text($(this).find('category').text());
                $item.find('.titleLink').text($(this).find('title').text()).attr('href', $(this).find('link').text());
                $item.find('.description').html($(this).find('description').text());
                $item.find('.description a').attr('target', '_blank');
                $item.find('.byline').text(new Date($(this).find('pubDate').text()).toLocaleDateString(systemLang, dateOptions) + " - " + $(this).find('dc\\:creator').text());
                $('#newsList').append($item);
            });
        }
    };

    //------------------------------------------------------ SEARCH GITHUB --------------------------------------------------------------------

    const searchGithubForNewAdapters = function () {

        $.getJSON('https://raw.githubusercontent.com/ioBroker/ioBroker.repositories/master/sources-dist.json', function (data) {
            const adapters = [];
            $.each(data, function (key, val) {
                adapters.push(key.toUpperCase());
            });
            checkGitHub(createIgnoreList(adapters));
        });

    };

    function createIgnoreList(adapterList) {
        adapterList.push('BUILD');
        adapterList.push('SCRIPT.RAUMKLIMA');
        adapterList.push('RESOL-VBUS');
        adapterList.push('OLD');
        adapterList.push('DOCS');
        adapterList.push('WIKI.JS');
        adapterList.push('REPOSITORIES');
        adapterList.push('TEMPLATE');
        adapterList.push('TEMPLATE-REST');
        adapterList.push('TEMPLATE-TS');
        adapterList.push('DOKU-ADAPTERENWICKLUNG-MIT-VSCODE');
        adapterList.push('PELLETOFENSTEUERUNG');
        adapterList.push('PFLANZEN-GIESSEN-SCRIPT');
        adapterList.push('ADAPTER-CORE');
        return adapterList;
    }

    function checkGitHub(adapterList) {
        for (let i = 0; i < 8; i++) {
            $.getJSON("https://api.github.com/search/repositories?q=iobroker&sort=updated&page=" + i + "&per_page=100", function (data) {
                $.each(data.items, function (key, val) {
                    const adapter = val.name;
                    const upcaseName = adapter.toUpperCase();
                    if (upcaseName.startsWith('IOBROKER.') && $.inArray(upcaseName.substring(9), adapterList) === -1) {
                        $('#githubSearchList').append("<li><a href='" + val.html_url + "' target='_blank'>" + adapter + "</a> - (" + val.size + " kb) - " + val.owner.login + " - " + new Date(val.updated_at).toLocaleDateString(systemLang, dateOptions) + " - " + val.description + "</li>");
                    }
                });
            });
        }
    }


    //------------------------------------------------------ UPDATE ADAPTER LIST --------------------------------------------------------------

    let curInstalled = null;
    let curRepository = null;
    let curRepoLastUpdate = null;
    let curRunning = null;

    $(document.body).on('click', '.adapter-update-submit', function () {
        const aName = $(this).attr('data-adapter-name');

        // genereate the unique id to coordinate the outputs
        activeCmdId = Math.floor(Math.random() * 0xFFFFFFE) + 1;
        $(this).closest("li").attr('id', activeCmdId);

        cmdExec('upgrade ' + aName, function (exitCode) {
            if (!exitCode) {

            }
        });
    });

    $(document.body).on('click', '.adapter-install-submit', function () {
        const aName = $(this).attr('data-adapter-name');

        // genereate the unique id to coordinate the outputs
        activeCmdId = Math.floor(Math.random() * 0xFFFFFFE) + 1;
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

        installMsg[activeCmdId] = {};
        installMsg[activeCmdId].success = msgSuccess;
        installMsg[activeCmdId].error = msgError;

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
            $('#adapter-install-close-btn').text('close');

            if (!exitCode) {
                $('#adapter-meter').progressbar(100);
                $('#adapter-install-message-on-end').text(installMsg[_id].success);
                setTimeout(function () {
                    $('#modal-command').modal('hide');
                }, 1500);
                $('#' + _id).remove();
                window.top.gMain.tabs.adapters.updateCounter;
            } else {
                $('#adapter-meter').progressbar(90, "error");
                $('#adapter-install-message-on-end').text(installMsg[_id].error);
            }
            if (cmdCallback) {
                $('#adapter-install-close-btn').text('close');
                cmdCallback(exitCode);
                cmdCallback = null;
            }
        } else if (installMsg.hasOwnProperty(_id)) {
            if (!exitCode) {
                $('#' + _id).remove();
                window.top.gMain.tabs.adapters.updateCounter;
                alert(installMsg[_id].success);
            } else {
                alert(installMsg[_id].error);
            }
            delete installMsg[_id];
        }
    });

    //------------------------------------------------------ HOST INFORMATION FUNCTIONS -------------------------------------------------------
    function getNodeVersionList() {
        $.getJSON("https://nodejs.org/dist/index.json", function (data) {
            versionMap = {};

            $.each(data, function (i, value) {
                const version = value.version;
                const key = version.substring(0, version.indexOf("."));
                if (!versionMap[key]) {
                    versionMap[key] = version;
                }
            });
        }).always(updateInfoPage);
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

    /** 
     * Get all ioBroker hosts
     * @param {type} callback
     */
    const getHosts = function (callback) {
        socket.emit('getObjectView', 'system', 'host', {startkey: 'system.host.', endkey: 'system.host.\u9999'}, function (err, res) {
            if (!err && res) {
                hosts = [];
                for (let i = 0; i < res.rows.length; i++) {
                    hosts.push(res.rows[i].id.substring('system.host.'.length));
                }
                mainHost = res.rows[0].id.substring('system.host.'.length);
            }
            if (callback) {
                callback();
            }
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

    //------------------------------------------------------- UPDATE FIELDS -------------------------------------------------------------------

    const updateInfoPage = function () {
        $('#systemInfoList').empty();
        for (let currentHost in hosts) {
            getHostInfo(hosts[currentHost], function (data) {
                let text = '';
                if (data) {
                    text += "<h3>" + data.hostname + "</h3>";
                    text += "<dl class='dl-horizontal'>";
                    for (let item in data) {
                        if (data.hasOwnProperty(item)) {
                            text += '<dt>' + _(item) + '</dt>';
                            if (item === 'Node.js') {
                                text += '<dd><span id="aktNodeVersion' + data.hostname + '">' + (formatInfo[item] ? formatInfo[item](data[item]) : data[item]) + '</span><span id="nodeExtraInfo' + data.hostname + '"></span></dd>';
                            } else {
                                text += '<dd' + ((item === 'Uptime' || item === 'System uptime') ? (" id='" + data.hostname + item + "' class='timeCounter' data-start='" + data[item] + "'") : "") + '>' + (formatInfo[item] ? formatInfo[item](data[item]) : data[item]) + '</dd>';
                            }
                        }
                    }
                    text += "</dl>";
                }
                if (text) {
                    $('#systemInfoList').append(text);
                    if (versionMap) {
                        getNodeExtrainfo(data.hostname);
                    }
                }
            });
        }

        setInterval(function () {
            $(".timeCounter").each(function () {
                const key = $(this).attr("id");
                if (!(key in uptimeMap)) {
                    uptimeMap[key] = $(this).data("start");
                }
                uptimeMap[key] = ++uptimeMap[key];
                $(this).text(formatSeconds(uptimeMap[key]));
            });
        }, 1000);


        getAdaptersInfo(mainHost, function (repository, installedList) {

            const listUpdatable = [];
            const listNew = [];
            const listHost = [];
            let adapter, obj;

            if (installedList) {
                for (adapter in installedList) {
                    if (!installedList.hasOwnProperty(adapter)) {
                        continue;
                    }
                    obj = installedList[adapter];

                    if (!obj || !obj.version || adapter === "hosts") {
                        continue;
                    }

                    let version = '';
                    if (repository[adapter] && repository[adapter].version) {
                        version = repository[adapter].version;
                    }
                    if (!upToDate(version, obj.version)) {
                        if (obj.controller) {
                            listHost.push(adapter);
                        } else {
                            listUpdatable.push(adapter);
                        }
                    }

                }
                listUpdatable.sort();

            }

            fillList('hostUpdate', listHost, repository, installedList);
            fillList('update', listUpdatable, repository, installedList);

            const now = new Date();
            for (adapter in repository) {
                if (!repository.hasOwnProperty(adapter)) {
                    continue;
                }
                obj = repository[adapter];
                if (!obj || obj.controller) {
                    continue;
                }
                if (installedList && installedList[adapter]) {
                    continue;
                }
                if (!(obj.published && ((now - new Date(obj.published)) < 3600000 * 24 * 60))) {
                    continue;
                }
                listNew.push(adapter);
            }
            listNew.sort();

            fillList('new', listNew, repository, installedList);

        });
    };

    //------------------------------------------------------- FILL DATA -----------------------------------------------------------------------   
    readInstanceConfig(function () {

        getHosts(getNodeVersionList);

        if (adapterConfig.forum) {
            getForumData();
            setInterval(getForumData, 10 * 60 * 1000);

        } else {
            $('#forumBlock').hide();
        }
        if (adapterConfig.news) {
            socket.emit('getState', 'info.0.newsfeed', function (err, state) {
                writeNewsData(state);
            });
            socket.emit('subscribe', 'info.0.newsfeed');
        } else {
            $('#newsBlock').hide();
        }
        if (!adapterConfig.clock) {
            startClock();
        } else {
            $('#home-container').hide();
        }
        if (adapterConfig.new_adapters) {
            searchGithubForNewAdapters();
        } else {
            $('#adapterSearchBlock').hide();
        }

        socket.emit('getState', 'info.0.popupReaded', function (err, state) {
            if (!state) {
                socket.emit('getState', 'info.0.lastPopupWarning', function (err, obj) {
                    showPopup(obj);
                });
            }
            socket.emit('subscribe', 'info.0.lastPopupWarning');
        });

        translateAll(systemLang);

    });

});

jQuery.fn.progressbar = function (a, b) {
    const $this = $(this);
    if ($this.hasClass('meter')) {
        if (a === "error" || b === "error") {
            $this.removeClass('orange').addClass('red').addClass('nostripes');
        } else if (a === "warning" || b === "warning") {
            $this.removeClass('red').addClass('orange').removeClass('nostripes');
        } else {
            $this.removeClass('red').removeClass('orange').removeClass('nostripes');
        }

        const $span = $this.find('span');

        let value;
        const orgval = 100 * $span.width() / $span.offsetParent().width();
        if (a === "auto" || b === "auto") {
            if (orgval < 10) {
                value = orgval + 3;
            } else if (orgval < 30) {
                value = orgval + 1;
            } else if (orgval < 40) {
                value = orgval + 2;
            } else if (orgval < 60) {
                value = orgval + 0.5;
            } else if (orgval < 80) {
                value = orgval + 1;
            } else if (orgval < 90) {
                value = orgval + 0.2;
            } else {
                value = orgval;
            }
        } else if (typeof a === "string" && a.startsWith("+")) {
            value = parseInt(a.substr(1));
            value = a.startsWith("+") ? (orgval + value) : (orgval - value);
            if (value > 90) {
                value = orgval;
            }
        } else if (typeof b === "string" && b.startsWith("+")) {
            value = parseInt(b.substr(1));
            value = orgval + value;
            if (value > 90) {
                value = orgval;
            }
        } else {
            value = parseInt(a) || parseInt(b);
        }

        if (!isNaN(value)) {
            if (value > 100) {
                value = 100;
            }
            if (value === 100) {
                $this.addClass('nostripes');
            }
            $span.width(value + "%");
        }
    }
    return this;
};
