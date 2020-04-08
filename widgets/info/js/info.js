/* global vis, socket, newsPopup, systemDictionary */

"use strict";

if (vis.editMode) {
    getTranslation();    
}

async function getTranslation(){
    let translation = await(await fetch("widgets/info/js/words.js")).text();
    if (translation) {
        translation = translation.substring(translation.indexOf('{'), translation.lastIndexOf(';'));
        $.extend(true, systemDictionary, JSON.parse(translation));
    }
}

vis.binds.info = {
    version: "0.0.9",
    showVersion: function () {
        if (vis.binds.info.version) {
            console.log('Version Info-Adapter-Widget: ' + vis.binds.info.version);
            vis.binds.info.version = null;
        }
    },
    createMessage: function (widgetID, view, data, style) {
        var $div = $('#' + widgetID);
        // if nothing found => wait
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds.info.createMessage(widgetID, view, data, style);
            }, 100);
        }

        if (data && data.oid) {

            vis.states.bind(data.oid + '.val', function (e, newVal, oldVal) {
                newsPopup.showPopup(newVal, widgetID);
            });

            setData(data.oid + '.val', widgetID, vis.editMode);
        }

    },
    createCalendar: function (widgetID, view, data, style) {
        var $div = $('#' + widgetID);
        // if nothing found => wait
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds.info.createCalendar(widgetID, view, data, style);
            }, 100);
        }

        if (data) {            
            const text = `<iframe src="https://calendar.google.com/calendar/embed?height=${data.height ? data.height: '400'}&amp;wkst=1&amp;bgcolor=%23${data.bgcolor ? data.bgcolor : 'ffffff'}&amp;ctz=Europe%2FBerlin&amp;src=bWgxNGJoN20yYmR2YTdwYjd0a2lyc2Jjc2dAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ&amp;color=%2330487E&amp;showTitle=1&amp;showNav=1&amp;showDate=1&amp;showPrint=0&amp;showTabs=1&amp;showCalendars=0&amp;showTz=1&amp;hl=de&amp;mode=${data.mode?data.mode:'AGENDA'}" style="border-width:0" width="${data.width ? data.width: '400'}" height="${data.height ? data.height : '400'}" frameborder="0" scrolling="no"></iframe>`;
            $div.html(text);        
        }
    }
};

function setData(id, widgetID, dummy) {
    const value = vis.states.attr(id);
    if (value === undefined) {
        return setTimeout(function () {
            setData(id, widgetID, dummy);
        }, 2000);
    } else {
        newsPopup.showPopup(value, widgetID, dummy);
    }
}

vis.binds.info.showVersion();

$(function () {
    $('[data-dismiss="alert"]').on('click', function () {
        $(this).parent().remove();
    });

});
