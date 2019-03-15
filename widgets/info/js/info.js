/* global systemDictionary, vis, socket, newsPopup */

"use strict";

vis.binds["info"] = {
    version: "0.0.8",
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
            }, 100);
        }

        if (data && data.oid) {

            vis.states.bind(data.oid + '.val', function (e, newVal, oldVal) {
                newsPopup.showPopup(newVal, widgetID);
            });

            setData(data.oid + '.val', widgetID);
        }

    }
};

function setData(id, widgetID) {
    const value = vis.states.attr(id);
    if (value === undefined) {
        return setTimeout(function () {
            setData(id, widgetID);
        }, 2000);
    } else {
        newsPopup.showPopup(value, widgetID);
    }
}

vis.binds["info"].showVersion();

$(function () {

    $('[data-dismiss="alert"]').on('click', function () {
        $(this).parent().hide();
    });

});