/* global io, systemDictionary, systemLang, bootbox, showdown */

const dateOptions = {"weekday": "short", "year": "numeric", "month": "long", "day": "2-digit", "hour": "2-digit", "minute": "2-digit", "second": "2-digit"};

const socket = io.connect();

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

(function($){
    $.extend({
    	  // Case insensative $.inArray (http://api.jquery.com/jquery.inarray/)
        // $.inArrayIn(value, array [, fromIndex])
        //  value (type: String)
        //    The value to search for
        //  array (type: Array)
        //    An array through which to search.
        //  fromIndex (type: Number)
        //    The index of the array at which to begin the search.
        //    The default is 0, which will search the whole array.
        inArrayIn: function(elem, arr, i){
            // not looking for a string anyways, use default method
            if (typeof elem !== 'string'){
                return $.inArray.apply(this, arguments);
            }
            // confirm array is populated
            if (arr){
                var len = arr.length;
                    i = i ? (i < 0 ? Math.max(0, len + i) : i) : 0;
                elem = elem.toLowerCase();
                for (; i < len; i++){
                    if (i in arr && arr[i].toLowerCase() == elem){
                        return i;
                    }
                }
            }
            // stick with inArray/indexOf and return -1 on no match
            return -1;
        }
    });
})(jQuery);

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array [index], index, array);
    }
}

function _(word) {
    let text = translateWord(word, systemLang, systemDictionary);

    for (let i = 1; i < arguments.length; i++) {
        if (text.indexOf('%s') !== -1) {
            text = text.replace('%s', arguments[i]);
        }
    }

    return text;
}

function readInstanceConfig(callback) {
    const languages = ["de", "en", "ru", "pt", "nl", "fr", "it", "es", "pl", "zh-cn"];

    socket.emit('getObject', 'system.config', function (err, data) {
        systemConfig = data;
        if (!err && systemConfig && systemConfig.common) {
            systemLang = systemConfig.common.language;
        } else {
            systemLang = window.navigator.userLanguage || window.navigator.language;
            if (!(systemLang in languages)) {
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

});