/* global io, systemDictionary, systemLang, bootbox, showdown, socket */

const dateOptions = {"weekday": "short", "year": "numeric", "month": "long", "day": "2-digit", "hour": "2-digit", "minute": "2-digit", "second": "2-digit"};
let infoData = {};

let systemConfig = {};
let adapterConfig = {};

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
    
    $(document.body).on('click', '#show-system-details', function(){
        $('#modal-system').modal();
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

    $(document.body).on('click', '.spoiler-control', function () {
        $(this).parent().children(".spoiler-content").toggle();
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