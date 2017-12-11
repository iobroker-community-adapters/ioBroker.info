/* global io, systemDictionary, showdown, bootbox */

$(function () {

    const socket = io.connect();
    var hosts = [];
    var mainHost = '';
    var systemLang = 'en';
    var systemConfig = {};
    var adapterConfig = {};
    var uptimeMap = {};
    var dateOptions = {"weekday": "short", "year": "numeric", "month": "long", "day": "2-digit", "hour": "2-digit", "minute": "2-digit", "second": "2-digit"};
    var installMsg = {};
    var cmdCallback = null;
    var activeCmdId = null;
    var $stdout = $('#stdout');
    var stdout = '';

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

                if (systemLang !== 'en' && systemLang !== 'de' && systemLang !== 'ru') {
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
        var text = translateWord(word, systemLang, systemDictionary);
        
        for (var i = 1; i < arguments.length; i++) {
            var pos = text.indexOf('%s');
            if (pos !== -1) {
                text = text.replace('%s', arguments[i]);
            }
        }
        
        return text;
    }

    //-------------------------------------------------------- USABILITY FUNCTIONS -------------------------------------------------------------
    $(document.body).on('click', '.x_panel .x_title', function () {
        var $BOX_PANEL = $(this).closest('.x_panel'),
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
        var $BOX_PANEL = $(this).closest('.x_panel');
        $BOX_PANEL.remove();
    });

    $(document.body).on('click', '.show-md', function () {
        var url = $(this).data('md-url');
        $.get(url, function (data) {
            var link = url.match(/([^/]*\/){6}/);
            var html = new showdown.Converter().makeHtml(data).replace(/src="(?!http)/g, 'class="img-responsive" src="' + link[0]);
            bootbox.alert({
                size: 'large',
                backdrop: true,
                message: html
            }).off("shown.bs.modal");
        });
    });

    //------------------------------------------------------- CLOCK FUNCTIONS -----------------------------------------------------------------
    var secInterval, hourInterval, minInterval, isClockOn = false;

    /** 
     * Start clock
     */
    function startClock() {
        isClockOn = true;
        secInterval = setInterval(function () {
            var seconds = new Date().getSeconds();
            var sdegree = seconds * 6;
            var srotate = "rotate(" + sdegree + "deg)";

            $("#cssSec").css({"-moz-transform": srotate, "-webkit-transform": srotate});

        }, 1000);


        hourInterval = setInterval(function () {
            var hours = new Date().getHours();
            if (hours === 0) {
                getActualDate();
            }
            var mins = new Date().getMinutes();
            var hdegree = hours * 30 + (mins / 2);
            var hrotate = "rotate(" + hdegree + "deg)";

            $("#cssHour").css({"-moz-transform": hrotate, "-webkit-transform": hrotate});

        }, 1000);


        minInterval = setInterval(function () {
            var mins = new Date().getMinutes();
            var mdegree = mins * 6;
            var mrotate = "rotate(" + mdegree + "deg)";

            $("#cssMin").css({"-moz-transform": mrotate, "-webkit-transform": mrotate});

        }, 1000);

        getActualDate();
    }

    /** 
     * Get actual local date
     */
    function getActualDate() {
        var date = new Date();
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

        var yql = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="' + site + '"') + '&format=xml&callback=?';

        $.getJSON(yql, cbFunc);

        function cbFunc(data) {
            if (data.results[0]) {
                if (typeof callback === 'function') {
                    callback(data);
                }
            } else {
                throw new Error('Nothing returned from getJSON.');
            }
        }
    }

    /** 
     * Format the newest forum threads
     * @param {type} data
     */
    var getForumData = function (data) {
        if (data.results && data.results[0]) {
            var $forumContent = $($.parseXML(data.results[0]));

            $('#forumTime').text(new Date($forumContent.find('updated:first').text()).toLocaleDateString(systemLang, dateOptions));
            $('#forum-link').attr("href", $forumContent.find('link:nth-of-type(2)').attr('href'));

            $('#forumList').empty();
            $('entry', $forumContent).each(function () {
                var $item = $('#forumEntryTemplate').children().clone(true, true);
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

    /** 
     * Format RSS Stream from iobroker.net
     * @param {type} data
     */
    var getNewsData = function (data) {
        if (data.results && data.results[0]) {
            var $newsContent = $($.parseXML(data.results[0]));

            $('#newsTime').text(new Date($newsContent.find('lastBuildDate:first').text()).toLocaleDateString(systemLang, dateOptions));
            $('#news-link').attr("href", $newsContent.find('link:first').text());

            $('#newsList').empty();
            $('item', $newsContent).each(function () {
                var $item = $('#forumEntryTemplate').children().clone(true, true);
                $item.find('.forumClass').text($(this).find('category').text());
                $item.find('.titleLink').text($(this).find('title').text())
                        .attr('href', $(this).find('link').text());
                $item.find('.description').html($(this).find('description').text());
                $item.find('.description a').attr('target', '_blank');
                $item.find('.byline').text(new Date($(this).find('pubDate').text()).toLocaleDateString(systemLang, dateOptions) + " - " + $(this).find('dc\\:creator').text());
                $('#newsList').append($item);
            });
        }
    };

    //------------------------------------------------------ UPDATE ADAPTER LIST --------------------------------------------------------------

    var curInstalled = null;
    var curRepository = null;
    var curRepoLastUpdate = null;
    var curRunning = null;

    $(document.body).on('click', '.adapter-update-submit', function () {
        var aName = $(this).attr('data-adapter-name');

        // genereate the unique id to coordinate the outputs
        activeCmdId = Math.floor(Math.random() * 0xFFFFFFE) + 1;
        $(this).closest("li").attr('id', activeCmdId);

        cmdExec('upgrade ' + aName, function (exitCode) {
            if (!exitCode) {

            }
        });
    });

    $(document.body).on('click', '.adapter-install-submit', function () {
        var aName = $(this).attr('data-adapter-name');

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
    var getAdaptersInfo = function (host, callback) {
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
                        for (var c = 0; c < curRunning.length; c++) {
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
                        for (var c = 0; c < curRunning.length; c++) {
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
                    for (var c = 0; c < curRunning.length; c++) {
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
    var upToDate = function (_new, old) {
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
        var $ul = $('#' + type + 'HomeList');
        $ul.empty();

        var isInstalled = type === 'update';
        var counter = 0;

        for (var i = 0; i < list.length; i++) {

            var $tmpLiElement = $('#' + type + 'HomeListTemplate').children().clone(true, true);

            var adapter = list[i];
            var obj = isInstalled ? (installedList ? installedList[adapter] : null) : repository[adapter];

            $tmpLiElement.find('.title').text((obj.title || '').replace('ioBroker Visualisation - ', ''));
            $tmpLiElement.find('.version').text(obj.version);

            if (isInstalled && repository[adapter]) {
                counter++;
                $tmpLiElement.find('.adapter-update-submit').attr('data-adapter-name', adapter);
                $tmpLiElement.find('.newVersion').text(repository[adapter].version);
                if (obj.readme) {
                    $tmpLiElement.find('.adapter-readme-submit').attr('data-md-url', obj.readme.replace('https://github.com', 'https://raw.githubusercontent.com').replace('blob/', ''));
                } else {
                    $tmpLiElement.find('.adapter-readme-submit').remove();
                }
                var news = getNews(obj.version, repository[adapter]);
                if (news) {
                    $tmpLiElement.find('.notesVersion').attr('title', news).tooltip();
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
            if(counter === 0){
                $('#homeUpdateListTab')
                        .find(".x_content")
                        .addClass('allOk')
                        .html('<h3 id="noUpdateAllOk" style="text-align: center;">' + _('All adapters are up to date!') + '</h3>');
            }
            $('#adapterCountSysInfo').html(Object.keys(installedList).length);
        }
    }

    var getNews = function (actualVersion, adapter) {
        var text = '';
        if (adapter.news) {
            for (var v in adapter.news) {
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

    var cmdExec = function (cmd, callback) {

        $stdout.val('');

        var title = cmd, tmp, name, msgSuccess, msgError;
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
                alert(installMsg[_id].success);
            } else {
                alert(installMsg[_id].error);
            }
            delete installMsg[_id];
        }
    });

    //------------------------------------------------------ HOST INFORMATION FUNCTIONS -------------------------------------------------------

    /** 
     * Get all ioBroker hosts
     * @param {type} callback
     */
    var getHosts = function (callback) {
        socket.emit('getObjectView', 'system', 'host', {startkey: 'system.host.', endkey: 'system.host.\u9999'}, function (err, res) {
            if (!err && res) {
                hosts = [];
                for (var i = 0; i < res.rows.length; i++) {
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
    var getHostInfo = function (host, callback) {
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
        var days = Math.floor(seconds / (3600 * 24));
        seconds %= 3600 * 24;
        var hours = Math.floor(seconds / 3600);
        if (hours < 10) {
            hours = '0' + hours;
        }
        seconds %= 3600;
        var minutes = Math.floor(seconds / 60);
        if (minutes < 10) {
            minutes = '0' + minutes;
        }
        seconds %= 60;
        seconds = Math.floor(seconds);
        if (seconds < 10) {
            seconds = '0' + seconds;
        }
        var text = '';
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
        var GB = Math.floor(bytes / (1024 * 1024 * 1024) * 10) / 10;
        bytes %= (1024 * 1024 * 1024);
        var MB = Math.floor(bytes / (1024 * 1024) * 10) / 10;
        var text = '';
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

    function formatAdaptercount(all) {
        return "<span id='adapterCountSysInfo'>?</span>/" + all;
    }

    /** 
     * FormatObject for host informations
     * @type type
     */
    var formatInfo = {
        'Uptime': formatSeconds,
        'System uptime': formatSeconds,
        'RAM': formatRam,
        'Speed': formatSpeed,
        'adapters count': formatAdaptercount
    };

    //------------------------------------------------------- UPDATE FIELDS -------------------------------------------------------------------

    var updateInfoPage = function () {
        $('#systemInfoList').empty();
        for (var currentHost in hosts) {
            getHostInfo(hosts[currentHost], function (data) {
                var text = '';
                if (data) {
                    text += "<h3>" + data.hostname + "</h3>";
                    text += "<dl class='dl-horizontal'>";
                    for (var item in data) {
                        if (data.hasOwnProperty(item)) {
                            text += '<dt>' + _(item) + '</dt>';
                            text += '<dd' + ((item === 'Uptime' || item === 'System uptime') ? (" id='" + data.hostname + item + "' class='timeCounter' data-start='" + data[item] + "'") : "") + '>' + (formatInfo[item] ? formatInfo[item](data[item]) : data[item]) + '</dd>';
                        }
                    }
                    text += "</dl>";
                }
                if (text) {
                    $('#systemInfoList').append(text);
                }
            });
        }

        setInterval(function () {
            $(".timeCounter").each(function () {
                var key = $(this).attr("id");
                if (!(key in uptimeMap)) {
                    uptimeMap[key] = $(this).data("start");
                }
                uptimeMap[key] = ++uptimeMap[key];
                $(this).text(formatSeconds(uptimeMap[key]));
            });
        }, 1000);


        getAdaptersInfo(mainHost, function (repository, installedList) {

            var listUpdatable = [];
            var listNew = [];
            var adapter, obj;

            if (installedList) {
                for (adapter in installedList) {
                    if (!installedList.hasOwnProperty(adapter)) {
                        continue;
                    }
                    obj = installedList[adapter];
                    if (!obj || obj.controller || adapter === 'hosts' || !obj.version) {
                        continue;
                    }
                    var version = '';
                    if (repository[adapter] && repository[adapter].version) {
                        version = repository[adapter].version;
                    }
                    if (!upToDate(version, obj.version)) {
                        listUpdatable.push(adapter);
                    }

                }
                listUpdatable.sort();

            }

            fillList('update', listUpdatable, repository, installedList);

            var now = new Date();
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

        getHosts(updateInfoPage);

        if (adapterConfig.forum) {
            requestCrossDomain('http://forum.iobroker.net/feed.php?mode=topics', getForumData);
        } else {
            $('#forumBlock').hide();
        }
        if (adapterConfig.news) {
            requestCrossDomain('http://www.iobroker.net/docu/?feed=rss2&lang=' + systemLang, getNewsData);
        } else {
            $('#newsBlock').hide();
        }
        startClock();
        translateAll(systemLang);

    });

});

jQuery.fn.progressbar = function (a, b) {
    var $this = $(this);
    if ($this.hasClass('meter')) {
        if (a === "error" || b === "error") {
            $this.removeClass('orange').addClass('red').addClass('nostripes');
        } else if (a === "warning" || b === "warning") {
            $this.removeClass('red').addClass('orange').removeClass('nostripes');
        } else {
            $this.removeClass('red').removeClass('orange').removeClass('nostripes');
        }

        var $span = $this.find('span');

        var value;
        var orgval = 100 * $span.width() / $span.offsetParent().width();
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