/* global systemDictionary, vis, socket, newsPopup */

"use strict";

vis.binds["info"] = {
    version: "0.0.5",
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

        vis.states.bind('info.0.newsfeed', function (e, newVal, oldVal) {
            newsPopup.showVisPopup(newVal.val, widgetID);
        });

        setData('info.0.newsfeed', widgetID);

    }
};

function setData(id, widgetID) {
    if (vis.states[id] === undefined) {
        return setTimeout(function () {
            setData(id, widgetID);
        }, 2000);
    } else {
        newsPopup.showVisPopup(vis.states['info.0.newsfeed'].val, widgetID);
    }
}

vis.binds["info"].showVersion();