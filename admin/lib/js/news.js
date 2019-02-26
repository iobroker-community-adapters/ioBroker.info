/* global socket, adapterConfig, systemLang, dateOptions */

socket.on('stateChange', function (id, obj) {
    if (adapterConfig.news && id === "info.0.newsfeed") {
        writeNewsData(obj.val);
    } else if (id === "info.0.lastPopupWarning") {
        showPopup(obj.val);
    }
});

function showPopup(obj) {
    try {
        const messages = JSON.parse(obj);
        if (messages.length > 1) {
            const title = _("Important information!");
            let description = "";
            $.each(messages, function (i, val) {
                description += "<b>" + val.title + "</b>";
                description += "<p>" + val.description + "</p>";
                description += "<br/>";
            });
            window.top.gMain.showMessage(title, description, 'info');
            socket.emit('setState', 'info.0.popupReaded', {val: true, ack: true});
        } else {
            window.top.gMain.showMessage(messages[0].title, messages[0].description, 'info');
            socket.emit('setState', 'info.0.popupReaded', {val: true, ack: true});
        }
    } catch (err) {

    }
}

function writeNewsData(data) {
    try {
        const feed = JSON.parse(data);

        $('#newsTime').text(new Date(feed['lastBuildDate']).toLocaleDateString(systemLang, dateOptions));
        $('#news-link').attr("href", feed.link[1]);

        $('#newsList').empty();
        feed.item.forEach(function (entry) {
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.forumClass').text(entry['category']);
            $item.find('.titleLink').text(entry['title']).attr('href', entry['link']);
            $item.find('.description').html(entry['description']);
            $item.find('.description a').attr('target', '_blank');
            $item.find('.byline').text(new Date(entry['pubDate']).toLocaleDateString(systemLang, dateOptions) + " - " + entry['creator']);
            $('#newsList').append($item);
        });
    } catch (err) {
        console.log(err);
    }
};
