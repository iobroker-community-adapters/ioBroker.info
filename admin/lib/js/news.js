/* global socket, adapterConfig, systemLang, dateOptions, forumRss, feednami, infoData */

let newsLang;

function writeNewsData(data) {
    try {
        const feed = (typeof data === 'object') ? data : JSON.parse(data);

        $('#newsTime').text(new Date(feed.meta.pubDate).toLocaleDateString(systemLang, dateOptions));
        $('#news-link').attr("href", "http://www.iobroker.net/docu/?lang=" + newsLang);

        $('#newsList').empty();
        $('#newsListLoader').remove();
        feed.entries.forEach(function (entry) {
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.tags').remove();
            $item.find('.navbar-right').remove();
            $item.find('.assignDiv').remove();
            $item.find('.y_title').addClass('titleRSS');
            $item.find('.title').addClass('titleRSS');
            $item.find('.collapse-link').addClass('titleRSS');
            $item.find('.titleLink').addClass('titleRSS').text(entry.title).attr('href', entry.link);
            $item.find('.description').html(entry.description);
            $item.find('.description a').attr('target', '_blank');
            $item.find('.byline').text(new Date(entry.pubDate).toLocaleDateString(systemLang, dateOptions) + " - " + entry.author);
            $('#newsList').append($item);
        });
    } catch (err) {
        console.log(err);
    }
}

function checkNewsLang() {
    newsLang = systemLang;
    if ($.inArray(newsLang, infoData.supportedNewsLang) === -1) {
        newsLang = "en";
    }
    return newsLang;
}

async function readAndWriteNewsData() {
    if (adapterConfig.feednami) {
        feednami.setPublicApiKey(adapterConfig.feednami);
    }
    try {
        const rss = await feednami.load('http://www.iobroker.net/blog_' + newsLang + '.xml');
        writeNewsData(rss);
    } catch (e) {
        $('#newsListLoader').remove();
        if (e == "Error: Hostname in referer header is not registered") {
            $('#newsList').append($('<li>' + _("To read news or forum, you need a free API Key if your ioBroker installation can be reached via a hostname, such as iobroker: 8081 or something similar. For IP access it is not needed.") + '</li>'));
        } else {
            $('#newsList').append($('<li>' + e + '</li>'));
        }
    }
}
