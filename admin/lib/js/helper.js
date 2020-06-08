/* global io, systemDictionary, systemLang, bootbox, showdown, socket, parseFloat, infoCharts, githubHelper */

const dateOptions = {"weekday": "short", "year": "numeric", "month": "long", "day": "2-digit", "hour": "2-digit", "minute": "2-digit", "second": "2-digit"};
let infoData = {};

let documentationData = {};

let systemConfig = {};
let adapterConfig = {};

let ignoredNews = [];

const systemInformationData = {"node": null, "npm": null, "os": null, "uuid": null};

let systemInfoForGithub = "";
let githubMarkdownArea;

const formatter = {
    formatSeconds: function (seconds) {
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
    },
    formatByte: function (bytes) {
        if (bytes === null || isNaN(bytes)) {
            return "-";
        }
        if (bytes === 0) {
            return '0 Bytes';
        }
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, formatSpeedMhz: function (mhz) {
        return mhz + " MHz";
    }, formatSpeedGhz: function (ghz) {
        return ghz + " GHz";
    }, formatSpeedV: function (v) {
        return v + " V";
    }, formatPercent2Digits: function (number) {
        return parseFloat(Math.round(number * 100) / 100).toFixed(2) + " %";
    }, formatDecimalPercent2Digits: function (number) {
        number *= 100;
        return parseFloat(Math.round(number * 100) / 100).toFixed(2) + " %";
    }, formatTemperature: function (temp) {
        return temp + " °C";
    }, formatMhzSec: function (speed) {
        return speed + " Mbit/s";
    }, formatTranslate: function (text) {
        return _(text);
    }, formatPixel: function (pixel) {
        return pixel + " pixel";
    }, formatBits: function (bits) {
        return bits + " bits";
    }, formatMm: function (mm) {
        return mm + " mm";
    }, formatMb: function (mb) {
        return mb + " MB";
    }, formatBoolean: function (bool) {
        if (true === bool || "true" === bool) {
            return "<i class='fa fa-check text-success' aria-hidden='true'></i>";
        } else if (false === bool || "false" === bool) {
            return "<i class='fa fa-times text-danger' aria-hidden='true'></i>";
        }
        return bool;
    }, formatArrayGhz: function (array) {
        let result = "";
        if (Array.isArray(array)) {
            array.forEach(function (item) {
                result += "[" + item + " GHz] ";
            });
        } else {
            result += "[" + array + " GHz] ";
        }
        return result;
    }, formatArrayTemperature: function (array) {
        let result = "";
        if (Array.isArray(array)) {
            array.forEach(function (item) {
                result += "[" + item + " °C] ";
            });
        } else {
            result += "[" + array + " °C] ";
        }
        return result;
    }
};

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

async function readInstanceConfig(callback) {

    if (sessionStorage.getItem('ioBroker.info.infoData')) {
        infoData = JSON.parse(sessionStorage.getItem('ioBroker.info.infoData'));
    } else {
        try {
            infoData = await (await fetch("https://raw.githubusercontent.com/iobroker-community-adapters/ioBroker.info/master/admin/lib/data/infoData.json")).json();
        } catch (e) {
            infoData = await (await fetch("../data/infoData.json")).json();
        }
        sessionStorage.setItem('ioBroker.info.infoData', JSON.stringify(infoData));
    }

    if (sessionStorage.getItem('ioBroker.info.documentationData')) {
        documentationData = JSON.parse(sessionStorage.getItem('ioBroker.info.documentationData'));
    } else {
        try {
            documentationData = await (await fetch("https://raw.githubusercontent.com/ioBroker/ioBroker.docs/master/info/documentation.json")).json();
            sessionStorage.setItem('ioBroker.info.documentationData', JSON.stringify(documentationData));
        } catch (e) {

        }
    }

    socket.emit('getState', 'info.0.sysinfo.os.versions.node', function (err, data) {
        if (!err && data) {
            systemInformationData.node = data.val;
        }
    });
    socket.emit('getState', 'info.0.sysinfo.os.versions.npm', function (err, data) {
        if (!err && data) {
            systemInformationData.npm = data.val;
        }
    });
    socket.emit('getState', 'info.0.sysinfo.os.info.platform', function (err, data) {
        if (!err && data) {
            systemInformationData.os = data.val;
        }
    });
    socket.emit('getState', 'info.0.uuid', function (err, data) {
        if (!err && data) {
            systemInformationData.uuid = data.val;
        }
    });

    socket.emit('getState', 'info.0.ignored_news', function (err, data) {
        if (!err && data) {
            ignoredNews = JSON.parse(data.val);
        }
    });

    socket.emit('getObject', 'system.config', function (err, data) {
        systemConfig = data;
        if (!err && systemConfig && systemConfig.common) {
            systemLang = systemConfig.common.language;
        } else {
            systemLang = window.navigator.userLanguage || window.navigator.language;
            if (!(systemLang in infoData.languages)) {
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

//-------------------------------------------------------- USABILITY FUNCTIONS -------------------------------------------------------------
$(function () {

    $(document.body).on('click', '.collapse-link', function () {
        const $BOX_PANEL = $(this).closest('.block_content'),
                $ICON = $(this).find('i'),
                $BOX_CONTENT = $BOX_PANEL.find('.y_content');
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

    $(document.body).on('click', ".loadAdapterIssues", function () {
        $(this).removeClass("loadAdapterIssues");
        getAndWriteIssuesFor($(this).attr("data-adapter"));
    });

    $(document.body).on('click', ".loadGithubData", function () {
        $(this).removeClass("loadGithubData");
        const url = $(this).data('md-url');
        const target = $(this).data('md-target');
        $.get(url, function (data) {
            const link = url.match(/([^/]*\/){6}/);
            const html = new showdown.Converter().makeHtml(data).replace(/src="(?!http)/g, 'class="img-responsive" src="' + link[0]);
            $("#" + target).html(html);
        }).fail(function () {
            $("#" + target).html("<p><b>" + _("Readme file was not found. No further information available.") + "</b></p>");
        });
    });


    $(document.body).on('click', '#show-system-details', function () {
        infoCharts.startCharts;
        $('#modal-system').modal();
    });
    $('a[href="#sys_info_tab_os"]').on('show.bs.tab', function (e) {
        socket.emit('subscribe', 'info.0.sysinfo.os.*');
    });
    $('a[href="#sys_info_tab_os"]').on('hide.bs.tab', function (e) {
        socket.emit('unsubscribe', 'info.0.sysinfo.os.*');
    });
    $('a[href="#sys_info_tab_cpu"]').on('show.bs.tab', function (e) {
        socket.emit('subscribe', 'info.0.sysinfo.cpu.*');
    });
    $('a[href="#sys_info_tab_cpu"]').on('hide.bs.tab', function (e) {
        socket.emit('unsubscribe', 'info.0.sysinfo.cpu.*');
    });
    $('a[href="#sys_info_tab_memory"]').on('show.bs.tab', function (e) {
        socket.emit('subscribe', 'info.0.sysinfo.memory.*');
    });
    $('a[href="#sys_info_tab_memory"]').on('hide.bs.tab', function (e) {
        socket.emit('unsubscribe', 'info.0.sysinfo.memory.*');
    });
    $('a[href="#sys_info_tab_disks"]').on('show.bs.tab', function (e) {
        socket.emit('subscribe', 'info.0.sysinfo.disks.*');
    });
    $('a[href="#sys_info_tab_disks"]').on('hide.bs.tab', function (e) {
        socket.emit('unsubscribe', 'info.0.sysinfo.disks.*');
    });
    $('a[href="#sys_info_tab_battery"]').on('show.bs.tab', function (e) {
        socket.emit('subscribe', 'info.0.sysinfo.battery.*');
    });
    $('a[href="#sys_info_tab_battery"]').on('hide.bs.tab', function (e) {
        socket.emit('unsubscribe', 'info.0.sysinfo.battery.*');
    });
    $('#modal-system').on('hidden.bs.modal', function (e) {
        socket.emit('unsubscribe', 'info.0.sysinfo.*');
    });

    $(document.body).on('click', '.adapterRequestReaction', function () {
        const $button = $(this);
        if (!$button.hasClass('btn-success')) {
            githubHelper.setReaction($button.attr("id"));
        }
    });
    $(document.body).on('click', '.adaptersInstalledReaction', function () {
        const $button = $(this);
        if (!$button.hasClass('btn-success')) {
            githubHelper.setStarred($button.attr("id"));
        }
    });

    $(document.body).on('click', '.openIssueComments', function () {
        const $button = $(this);
        $button.removeClass("openIssueComments").addClass("toggleIssueComments");
        githubHelper.loadAllComments($button.attr("id"), $button.attr("data-issue-id"));
    });
    $(document.body).on('click', '.toggleIssueComments', function () {
        const buttonId = $(this).attr("id");
        const issueId = buttonId.substring(13, buttonId.length);
        const commentsBox = $('#allCommentsDiv' + issueId);
        if (commentsBox.is(":hidden")) {
            commentsBox.show(500);
        } else {
            commentsBox.hide(500);
        }
    });

    $(document.body).on('click', '#new-adapter-request:not(.disabled)', function () {
        githubHelper.isFeatureRequest();
        $('#issueLinkForGithubApi').val('https://api.github.com/repos/ioBroker/AdapterRequests/issues');
        $('#modal-github').modal();
    });
    $(document.body).on('click', '.create-issue-adapter-button:not(.disabled)', function () {
        const adapterdata = $(this).data('adapter');
        $('#adapterVersionForBug').val(adapterdata);
        $('#issueLinkForGithubApi').val($(this).data('href'));
        $('#adapterNameForGithub').text(adapterdata).removeClass('hidden');
        $('#modal-github').modal();
    });
    $('#modal-github').on('hidden.bs.modal', function (e) {
        githubHelper.backToBasic();
    });
    $('#addRequestBtn').on('click', function () {
        githubHelper.isFeatureRequest();
    });
    $('#addBugBtn').on('click', function () {
        githubHelper.isBugReport();
    });
    $(document.body).on('keypress', '#githubTitle', function () {
        githubHelper.checkSendButton();
    });
    $('#submitGithubIssue').on('click', function () {
        if (!$(this).hasClass('disabled')) {
            githubHelper.createIssue();
        }
    });
    $('#openIssueOnGihub').on('click', function () {
        if (!$(this).hasClass('disabled')) {
            window.open($(this).attr("data-href"), '_blank');
        }
    });
    githubMarkdownArea = new SimpleMDE({element: $("#githubContent")[0]});
    githubMarkdownArea.codemirror.on('change', function () {
        githubHelper.checkSendButton();
    });
    $('#myIssuesListOnGithub').on('click', function () {
        if (!$(this).hasClass('disabled')) {
            githubHelper.loadIssues();
            $('#modal-githublist').modal();
        }
    });
    $('#myWatchedListOnGithub').on('click', function () {
        if (!$(this).hasClass('disabled')) {
            githubHelper.loadWatched();
            $('#modal-githublist').modal();
        }
    });
    $('#myStarredListOnGithub').on('click', function () {
        if (!$(this).hasClass('disabled')) {
            githubHelper.loadStarred();
            $('#modal-githublist').modal();
        }
    });
    $('#myAssignedListOnGithub').on('click', function () {
        if (!$(this).hasClass('disabled')) {
            githubHelper.loadAssigned();
            $('#modal-githublist').modal();
        }
    });
    $('#modal-githublist').on('hidden.bs.modal', function (e) {
        githubHelper.backToBasicList();
    });


    $(document.body).on('click', '.show-md', function () {
        const url = $(this).data('md-url');
        $.get(url, function (data) {
            const link = url.match(/([^/]*\/){6}/);
            const html = new showdown.Converter().makeHtml(data).replace(/src="(?!http)/g, 'src="' + link[0]).replace(/<img/g, '<img class="img-responsive"');
            bootbox.alert({
                size: 'large',
                backdrop: true,
                message: html
            }).off("shown.bs.modal");
        });
    });

    $(document.body).on("error", "img", function () {
        $(this).hide();
    });

    $(document.body).on('click', '.host-update', function () {
        parent.window.location.hash = '#tab-hosts';
    });

    $(document.body).on('click', '.spoiler-control', function () {
        $(this).parent().children(".spoiler-content").toggle();
    });

    $(document.body).on('click', '.popupnewsneveragain', function () {
        const id = $(this).attr('data-id');
        if (!Array.isArray(ignoredNews)) {
            ignoredNews = [];
        }
        ignoredNews.push(id);
        socket.emit('setState', 'info.0.ignored_news', {val: JSON.stringify(ignoredNews), ack: true});
    });

    var $menu = $('#sidebar-wrapper');
    var $content = $('#main-wrapper');

    $content.addClass('no-transition');
    $menu.hide();
    $menu.css('right', -($menu.outerWidth() + 10));

    $('.documentationButton').click(function () {
        $content.removeClass('no-transition');
        if ($menu.is(':visible') && $content.hasClass('col-md-9')) {
            // Slide out
            $menu.animate({
                right: -($menu.outerWidth() + 10)
            }, function () {
                $menu.hide(1000);
            });
            $content.removeClass('hidden-xs hidden-sm col-md-9').addClass('col-xs-12 col-md-12');
        } else {
            // Slide in
            $menu.show(500).animate({right: 0});
            $content.removeClass('col-xs-12 col-md-12').addClass('hidden-xs hidden-sm col-md-9');
        }
        if ($content.hasClass('col-md-12') && $menu.is(':hidden')) {
            $menu.animate({
                right: 0
            }, function () {
                $menu.show(1000);
            });
            $content.removeClass('no-transition');
            $content.removeClass('col-xs-12 col-md-12').addClass('hidden-xs hidden-sm col-md-9');
        }
    });
    $('.bs-tooltip').tooltip();

});
