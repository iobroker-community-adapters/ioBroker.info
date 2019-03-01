/* global socket, adapterConfig, systemLang, dateOptions, forumRss, feednami, infoData */

let newsLang;

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
        const feed = (typeof data === 'object') ? data : JSON.parse(data);

        $('#newsTime').text(new Date(feed.meta.pubDate).toLocaleDateString(systemLang, dateOptions));
        $('#news-link').attr("href", "http://www.iobroker.net/docu/?lang=" + newsLang);

        $('#newsList').empty();
        feed.entries.forEach(function (entry) {
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.tags').remove();
            $item.find('.titleLink').text(entry.title).attr('href', entry.link);
            $item.find('.description').html(entry.description);
            $item.find('.description a').attr('target', '_blank');
            $item.find('.byline').text(new Date(entry.pubDate).toLocaleDateString(systemLang, dateOptions) + " - " + entry.author);
            $('#newsList').append($item);
        });
    } catch (err) {
        console.log(err);
    }
}

function checkNewsLang(){
    newsLang = systemLang;
    if ($.inArray(newsLang, infoData.supportedNewsLang) === -1) {
        newsLang = "en";
    }    
    return newsLang;
}

async function readAndWriteNewsData() {    

    writeNewsData(await feednami.load('http://www.iobroker.net/docu/?feed=rss2&lang=' + newsLang), newsLang);
}
