/* global systemLang, feednami, dateOptions */

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

    const forumRss = {
        "de": {"link": "https://forum.iobroker.net/category/4", "feeds": ["https://forum.iobroker.net/category/5.rss", "https://forum.iobroker.net/category/6.rss", "https://forum.iobroker.net/category/93.rss", "https://forum.iobroker.net/category/94.rss", "https://forum.iobroker.net/category/96.rss", "https://forum.iobroker.net/category/7.rss", "https://forum.iobroker.net/category/8.rss", "https://forum.iobroker.net/category/10.rss", "https://forum.iobroker.net/category/11.rss", "https://forum.iobroker.net/category/91.rss", "https://forum.iobroker.net/category/12.rss", "https://forum.iobroker.net/category/13.rss", "https://forum.iobroker.net/category/14.rss", "https://forum.iobroker.net/category/15.rss"]},
        "en": {"link": "https://forum.iobroker.net/category/16", "feeds": ["https://forum.iobroker.net/category/17.rss", "https://forum.iobroker.net/category/18.rss", "https://forum.iobroker.net/category/97.rss", "https://forum.iobroker.net/category/99.rss", "https://forum.iobroker.net/category/98.rss", "https://forum.iobroker.net/category/19.rss", "https://forum.iobroker.net/category/20.rss", "https://forum.iobroker.net/category/22.rss", "https://forum.iobroker.net/category/23.rss", "https://forum.iobroker.net/category/24.rss", "https://forum.iobroker.net/category/25.rss", "https://forum.iobroker.net/category/26.rss", "https://forum.iobroker.net/category/27.rss"]},
        "nl": {"link": "https://forum.iobroker.net/category/40", "feeds": ["https://forum.iobroker.net/category/41.rss", "https://forum.iobroker.net/category/42.rss", "https://forum.iobroker.net/category/100.rss", "https://forum.iobroker.net/category/102.rss", "https://forum.iobroker.net/category/103.rss", "https://forum.iobroker.net/category/43.rss", "https://forum.iobroker.net/category/44.rss", "https://forum.iobroker.net/category/47.rss", "https://forum.iobroker.net/category/46.rss", "https://forum.iobroker.net/category/48.rss", "https://forum.iobroker.net/category/49.rss", "https://forum.iobroker.net/category/50.rss", "https://forum.iobroker.net/category/51.rss"]},
        "ru": {"link": "https://forum.iobroker.net/category/28", "feeds": ["https://forum.iobroker.net/category/29.rss", "https://forum.iobroker.net/category/30.rss", "https://forum.iobroker.net/category/32.rss", "https://forum.iobroker.net/category/34.rss", "https://forum.iobroker.net/category/60.rss", "https://forum.iobroker.net/category/63.rss", "https://forum.iobroker.net/category/31.rss", "https://forum.iobroker.net/category/35.rss", "https://forum.iobroker.net/category/61.rss", "https://forum.iobroker.net/category/70.rss", "https://forum.iobroker.net/category/36.rss", "https://forum.iobroker.net/category/73.rss", "https://forum.iobroker.net/category/86.rss", "https://forum.iobroker.net/category/37.rss", "https://forum.iobroker.net/category/78.rss", "https://forum.iobroker.net/category/38.rss", "https://forum.iobroker.net/category/35.rss"]},
        "zh-cn": {"link": "https://bbs.iobroker.cn", "feeds": ["https://bbs.iobroker.cn/?mod=rss"]}
    };

    async function getGermanForumData(lang) {
        const rssFeed = await getGermanFeedData(lang);

        for (let i = 0; i < 30; i++) {
            const thread = rssFeed[i];
            if (i === 0) {
                $('#forumTime').text(new Date(thread.pubDate).toLocaleDateString(systemLang, dateOptions));
                $('#forum-link').attr("href", forumRss[lang].link);
                $('#forumList').empty();
            }
            const feed = await getDescription(thread);
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.tag').text(thread.category);
            $item.find('.forumClass').attr('href', thread.categoryLink);
            $item.find('.titleLink').text(feed.title).attr('href', feed.link);
            
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

    async function getGermanFeedData(lang) {
        let rssFeedUnordered = [];
        await asyncForEach(forumRss[lang].feeds, async function (link) {
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
    }

    async function getDescription(thread) {
        const link = thread.link;
        const topic = link.substring(0, link.lastIndexOf('/')) + ".rss";
        const data = await feednami.load(topic);
        if (data && data.entries) {
            return data.entries[0];
        } else {
            return thread;
        }
    }

    async function getChinaForumData(lang) {
        const data = await feednami.load(forumRss[lang].feeds[0]);
        if (data && data.entries) {
            for (let i = 0; i < data.entries.length; i++) {
                const thread = data.entries[i];
                if (i === 0) {
                    $('#forumTime').text(new Date(thread.pubDate).toLocaleDateString(systemLang, dateOptions));
                    $('#forum-link').attr("href", forumRss[lang].link);
                    $('#forumList').empty();
                }
                const $item = $('#forumEntryTemplate').children().clone(true, true);               
                $item.find('.forumClass').text(thread.categories.join());
                $item.find('.titleLink').text(thread.title).attr('href', thread.link);                
                $item.find('.description').html(thread.description);
                $item.find('.description a').attr('target', '_blank');

                $item.find('.byline').text(new Date(thread.pubDate).toLocaleDateString(systemLang, dateOptions) + " - " + thread.author);
                $('#forumList').append($item);
            }
        }
    }

    writeForumData();
}

