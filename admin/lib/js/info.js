/* global io */
/* global systemDictionary */

$(function () {

    const socket = io.connect();
    var hosts = [];

    //--------------------------------------------------------- COMMONS -----------------------------------------------------------------------
    /** 
     * Read the settings for info adapter
     * @param {type} callback
     */
    function readInstanceConfig(callback) {
        socket.emit('getObject', 'system.adapter.info', function (err, res) {
            if (!err && res && res.native) {
                adapterConfig = res.native;
            }
            if (typeof callback === 'function') {
                callback(adapterConfig);
            }
        });
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
     * Fill actual date to clock
     */
    function getActualDate() {
        var MONTH = [
            'january',
            'february',
            'march',
            'april',
            'may',
            'june',
            'july',
            'august',
            'september',
            'october',
            'november',
            'december'
        ];
        var DOW = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday'
        ];
        var date = new Date();
        $('#date_now').text(date.getDate() + '. ' + MONTH[date.getMonth()] + ' ' + date.getFullYear());
        $('#weekday_now').text(DOW[date.getDay()]);
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

            $('#forumTime').text($forumContent.find('updated:first').text());
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
                $item.find('.byline').text(new Date($(this).find('updated').eq(0).text()) + " - " + $(this).find('name').eq(0).text());
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

            $('#newsTime').text($newsContent.find('lastBuildDate:first').text());
            $('#news-link').attr("href", $newsContent.find('link:first').text());

            $('#newsList').empty();
            $('item', $newsContent).each(function () {
                var $item = $('#forumEntryTemplate').children().clone(true, true);
                $item.find('.forumClass').text($(this).find('category').text());
                $item.find('.titleLink').text($(this).find('title').text())
                        .attr('href', $(this).find('link').text());
                $item.find('.description').html($(this).find('description').text());
                $item.find('.description a').attr('target', '_blank');
                $item.find('.byline').text($(this).find('pubDate').text() + " - " + $(this).find('dc\\:creator').text());
                $('#newsList').append($item);
            });
        }
    };

    //------------------------------------------------------ MEMORY FUNCTIONS -----------------------------------------------------------------
    var totalmem;
    /** 
     * Calculate free memory
     * @param {type} aktHost
     * @returns {undefined|Number}
     */
    var calculateFreeMem = function (aktHost) {
        if (!aktHost) {
            return;
        }
        var host = that.main.states['system.host.' + aktHost + '.freemem'];
        if (host) {
            that.totalmem = that.totalmem || that.main.objects['system.host.' + aktHost].native.hardware.totalmem / (1024 * 1024);
            var percent = Math.round((host.val / that.totalmem) * 100);

            if (host.val.toString() !== $('#freeMem').text()) {
                $('#' + page + 'FreeMemPercent').text(percent + ' %');
                $("#" + page + "FreeMemSparkline").sparkline([that.totalmem - host.val, host.val], {
                    type: 'pie',
                    sliceColors: ["#F78181", "#088A29"],
                    height: "40px",
                    width: "40px"
                });
                $('#' + page + 'FreeMemSparkline > canvas').css('vertical-align', 'middle');
            }
        } else {
            $('.free-mem-label').hide();
        }

        return Math.round(host.val);
    };

    /** 
     * Calcutate total RAM 
     * @param {type} host
     * @returns {undefined|Number}
     */
    var calculateTotalRam = function (aktHost) {
        if (!aktHost) {
            return;
        }
        var host = that.main.states['system.host.' + host + '.memRss'];
        var processes = 1;
        var mem = host ? host.val : 0;
        for (var i = 0; i < that.list.length; i++) {
            var obj = that.main.objects[that.list[i]];
            if (!obj || !obj.common)
                continue;
            if (obj.common.host !== aktHost)
                continue;
            if (obj.common.enabled && obj.common.mode === 'daemon') {
                var m = that.main.states[obj._id + '.memRss'];
                mem += m ? m.val : 0;
                processes++;
            }
        }
        var text = $.i18n('countProcesses', processes);
        var $running_processes = $('#' + page + 'RunningProcesses');
        if (text !== $running_processes.text()) {
            $running_processes.html('<span class="highlight">' + text + '</span>');
        }

        return Math.round(mem);
    };

    //------------------------------------------------------ HOST INFORMATION FUNCTIONS -------------------------------------------------------
    
    var getHosts = function(callback){
        socket.emit('getObjectView', 'system', 'host', {startkey: 'system.host.', endkey: 'system.host.\u9999'}, function (err, res) {
            if (!err && res) {
                hosts = [];
                for (var i = 0; i < res.rows.length; i++) {
                    hosts.push(res.rows[i].id.substring('system.host.'.length));
                }
            }
            if (callback){
                callback(hosts);
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
            text += days + systemDictionary.daysShortText + ' ';
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
            text += GB + 'GB ';
        } else {
            text += MB + 'MB ';
        }

        return text;
    }

    /** 
     * FormatObject for host informations
     * @type type
     */
    var formatInfo = {
        'Uptime': formatSeconds,
        'System uptime': formatSeconds,
        'RAM': formatRam
    };

    //------------------------------------------------------- FILL DATA -----------------------------------------------------------------------   

    readInstanceConfig(function (config) {
        getHosts(function(){
            for(var currentHost in hosts ){
                getHostInfo(hosts[currentHost], function (data) {
                    var text = '';
                    if (data) {
                        for (var item in data) {
                            if (data.hasOwnProperty(item)) {
                                text += '<dt>' + item + '</dt>';
                                text += '<dd class="system-info" data-attribute="' + item + '">' + (formatInfo[item] ? formatInfo[item](data[item]) : data[item]) + '</dd>';
                            }
                        }
                    }
                    if (text) {
                        $('#systemInfoList').html(text);
                    }
                });
            }
        });

        if (config.forum) {
            requestCrossDomain('http://forum.iobroker.net/feed.php?mode=topics', getForumData);
        } else {
            $('#forumBlock').hide();
        }
        if (config.news != 'none') {
            requestCrossDomain('http://www.iobroker.net/docu/?feed=rss2&lang=' + config.news, getNewsData);
        } else {
            $('#newsBlock').hide();
        }
        startClock();
    });

});