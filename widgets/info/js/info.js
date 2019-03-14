/* global systemDictionary, vis, socket, newsPopup */

"use strict";

// add translations for edit mode
$.get("../adapter/info/words.js", function (script) {
    let translation = script.substring(script.indexOf('{'), script.length);
    translation = translation.substring(0, translation.lastIndexOf(';'));
    $.extend(systemDictionary, JSON.parse(translation));
});

vis.binds["info"] = {
    version: "0.0.4",
    showVersion: function () {
        if (vis.binds["info"].version) {
            console.log('Version Info-Adapter-Widget: ' + vis.binds["info"].version);
            vis.binds["info"].version = null;
        }
    },
    createMessage: function (widgetID, view, data, style) {
        var $div = $('#' + widgetID);
        // if nothing found => wait
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds["info"].createMessage(widgetID, view, data, style);
            }, 1000);
        }

        if (data.oid) {

            vis.states.bind('info.0.newsfeed', function (e, newVal, oldVal) {
                newsPopup.showVisPopup(newVal.val, widgetID);
            });
                        
            newsPopup.showVisPopup(vis.states['info.0.newsfeed'].val, widgetID);
        }
    }
};

vis.binds["info"].showVersion();