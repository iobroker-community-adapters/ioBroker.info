/* global systemLang, feednami, dateOptions, infoData, adapterConfig */

function startForum() {

    function writeForumData() {
        let lang = systemLang;
        if ($.inArray(lang, Object.keys(forumRss)) === -1) {
            lang = "en";
        }

        if (lang === "zh-cn") {
            getChinaForumData(lang);
        } else {
            getGermanForumData(lang);
        }
    }

    const forumRss = infoData.forumRss;

    async function getGermanForumData(lang) {
        const rssFeed = await getGermanFeedData(lang);

        if (rssFeed.length > 0) {
            for (let i = 0; i < 30; i++) {
                const thread = rssFeed[i];
                if (i === 0) {
                    $('#forumTime').text(new Date(thread.pubDate).toLocaleDateString(systemLang, dateOptions));
                    $('#forum-link').attr("href", forumRss[lang].link);
                    $('#forumList').empty();
                    $('#forumListLoader').remove();
                }
                const feed = await getDescription(thread);
                const $item = $('#forumEntryTemplate').children().clone(true, true);
                $item.find('.navbar-right').remove();
                $item.find('.assignDiv').remove();
                $item.find('.forumClass').text(thread.category);
                $item.find('.tag').attr('href', thread.categoryLink);
                $item.find('.y_title').addClass('titleRSS');
                $item.find('.title').addClass('titleRSS');
                $item.find('.collapse-link').addClass('titleRSS');
                const title = feed.title.replace("Reply to ", "");
                $item.find('.titleLink').addClass('titleRSS').text(title).attr('href', feed.link);

                let desc = feed.description;
                desc += "<div style='width: 100%; text-align: center;'>&#9711;&nbsp;&#9711;&nbsp;&#9711;</div>";
                desc += "<p class='spoiler-content'>";
                desc += "<b>" + thread.author + " " + _("replied on") + " " + new Date(thread.pubDate).toLocaleDateString(systemLang, dateOptions) + ":</b>";
                desc += "<br>" + thread.description + "</p>";
                desc = desc.replace(/\/assets\/uploads\/files/g, "https://forum.iobroker.net/assets/uploads/files");

                $item.find('.description').html(desc);
                $item.find('.description a').attr('target', '_blank');

                $item.find('.byline').text(new Date(feed.pubDate).toLocaleDateString(systemLang, dateOptions) + " - " + feed.author);
                $('#forumList').append($item);
            }
        }
    }

    async function getGermanFeedData(lang) {
        let rssFeedUnordered = [];
        try {
            await asyncForEach(forumRss[lang].feeds, async function (link) {
                if (adapterConfig.feednami) {
                    feednami.setPublicApiKey(adapterConfig.feednami);
                }
                const data = await feednami.load(link);
                if (data && data.entries) {
                    await asyncForEach(data.entries, function (feed) {
                        feed.category = $("<div/>").html(data.meta.title).text();
                        feed.categoryLink = data.meta.link;
                        rssFeedUnordered.push(feed);
                    });
                }
            });
            return rssFeedUnordered.sort(function (a, b) {
                return new Date(b.pubDate) - new Date(a.pubDate);
            });
        } catch (e) {
            $('#forumListLoader').remove();
            if (e == "Error: Hostname in referer header is not registered") {
                $('#forumList').append($('<li>' + _("To read news or forum, you need a free API Key if your ioBroker installation can be reached via a hostname, such as iobroker: 8081 or something similar. For IP access it is not needed.") + '</li>'));
            } else {
                $('#forumList').append($('<li>' + e + '</li>'));
            }
            return rssFeedUnordered;
        }
    }

    async function getDescription(thread) {
        const link = thread.link;
        const topic = link.substring(0, link.lastIndexOf('/')) + ".rss";
        if (adapterConfig.feednami) {
            feednami.setPublicApiKey(adapterConfig.feednami);
        }
        const data = await feednami.load(topic);
        if (data && data.entries) {
            return data.entries[0];
        } else {
            return thread;
        }
    }

    async function getChinaForumData(lang) {
        if (adapterConfig.feednami) {
            feednami.setPublicApiKey(adapterConfig.feednami);
        }

        try {
            const data = await feednami.load(forumRss[lang].feeds[0]);
            if (data && data.entries) {
                for (let i = 0; i < data.entries.length; i++) {
                    const thread = data.entries[i];
                    if (i === 0) {
                        $('#forumTime').text(new Date(thread.pubDate).toLocaleDateString(systemLang, dateOptions));
                        $('#forum-link').attr("href", forumRss[lang].link);
                        $('#forumList').empty();
                        $('#forumListLoader').remove();
                    }
                    const $item = $('#forumEntryTemplate').children().clone(true, true);
                    $item.find('.navbar-right').remove();
                    $item.find('.assignDiv').remove();
                    $item.find('.forumClass').text(thread.categories.join());
                    $item.find('.y_title').addClass('titleRSS');
                    $item.find('.title').addClass('titleRSS');
                    $item.find('.collapse-link').addClass('titleRSS');
                    $item.find('.titleLink').addClass('titleRSS').text(thread.title).attr('href', thread.link);
                    $item.find('.description').html(thread.description);
                    $item.find('.description a').attr('target', '_blank');

                    $item.find('.byline').text(new Date(thread.pubDate).toLocaleDateString(systemLang, dateOptions) + " - " + thread.author);
                    $('#forumList').append($item);
                }
            }
        } catch (e) {
            $('#forumListLoader').remove();
            if (e == "Error: Hostname in referer header is not registered") {
                $('#forumList').append($('<li>' + _("To read news or forum, you need a free API Key if your ioBroker installation can be reached via a hostname, such as iobroker: 8081 or something similar. For IP access it is not needed.") + '</li>'));
            } else {
                $('#forumList').append($('<li>' + e + '</li>'));
            }
        }
    }

    writeForumData();
}

