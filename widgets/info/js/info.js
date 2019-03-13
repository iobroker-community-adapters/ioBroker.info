/* global systemDictionary, vis, socket, newsPopup */

"use strict";

// add translations for edit mode
$.get("../adapter/info/words.js", function (script) {
    let translation = script.substring(script.indexOf('{'), script.length);
    translation = translation.substring(0, translation.lastIndexOf(';'));
    $.extend(systemDictionary, JSON.parse(translation));
});

vis.binds["info"] = {
    version: "0.0.1",
    showVersion: function () {
        if (vis.binds["info"].version) {
            console.log('Version template: ' + vis.binds["info"].version);
            vis.binds["info"].version = null;
        }
    },
    createWidget: function (widgetID, view, data, style) {
        var $div = $('#' + widgetID);
        // if nothing found => wait
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds["info"].createWidget(widgetID, view, data, style);
            }, 100);
        }
        
        socket.emit('getState', 'info.0.newsfeed', function (err, data) {
            if (!err && data) {
                newsPopup.showVisPopup(data.val, widgetID);
            }
        });
        
    }
};

vis.binds["info"].showVersion();