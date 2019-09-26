/* global adapterConfig, systemLang, documentationData */



function showDocumentation() {

    async function getDocuments() {
        let langs = [];

        if (!adapterConfig.doc_langs || adapterConfig.doc_langs.length === 0) {
            langs.push(systemLang);
            if (systemLang !== "en") {
                langs.push("en");
            }
            langs.push("noLang");
        } else {
            langs = langs.concat(adapterConfig.doc_langs);
            langs.push("noLang");
        }

        let tmpLangs;
        await asyncForEach(langs, async function (lang) {
            if (lang === systemLang) {
                if (!tmpLangs) {
                    tmpLangs = lang;
                } else {
                    tmpLangs = lang + "," + tmpLangs;
                }
            } else {
                if (!tmpLangs) {
                    tmpLangs = lang;
                } else {
                    tmpLangs += "," + lang;
                }
            }
        });
        langs = tmpLangs.split(',');

        const newsObject = [];
        await asyncForEach(langs, function (lang) {
            documentationData.docs[lang].community.forEach(function (data) {
                $('#doc_community').append(createLi(data, lang, false));
            });
            documentationData.docs[lang].documentation.forEach(function (data) {
                $('#doc_documentation').append(createLi(data, lang, false));
            });
            documentationData.docs[lang].news.forEach(function (data) {
                newsObject.push(data);
            });
            documentationData.docs[lang].blog.forEach(function (data) {
                $('#doc_blog').append(createLi(data, lang, false));
            });
            documentationData.docs[lang].video.forEach(function (data) {
                $('#doc_video').append(createLi(data, lang, false));
            });
            documentationData.docs[lang].development.forEach(function (data) {
                $('#doc_development').append(createLi(data, lang, false));
            });
            documentationData.docs[lang].other.forEach(function (data) {
                $('#doc_other').append(createLi(data, lang, false));
            });
        });

        if ($('#doc_community').children().length === 0) {
            $('#doc_community_parent').remove();
        }
        if ($('#doc_documentation').children().length === 0) {
            $('#doc_documentation_parent').remove();
        }
        if ($('#doc_blog').children().length === 0) {
            $('#doc_blog_parent').remove();
        }
        if ($('#doc_video').children().length === 0) {
            $('#doc_video_parent').remove();
        }
        if ($('#doc_development').children().length === 0) {
            $('#doc_development_parent').remove();
        }
        if ($('#doc_other').children().length === 0) {
            $('#doc_other_parent').remove();
        }
        if (newsObject.length === 0) {
            $('#doc_news_parent').remove();
        } else {
            newsObject.sort(function (a, b) {
                return a.date.localeCompare(b.date);
            }).reverse().forEach(function (data) {
                $('#doc_news').append(createLi(data, systemLang, true));
            });
        }

    }

    function createLi(data, lang, hasDate) {
        const $link = $('#tagTemplate').children().clone(true, true);
        let title;
        if ("noLang" === lang) {
            title = data.title[systemLang];
        } else {
            title = data.title;
        }

        if (hasDate) {
            title += " (" + new Date(data.date).toLocaleDateString(systemLang, {weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit'}) + ")";
        }

        $link.find('.forumClass').removeClass('forumClass').text(title);
        $link.removeClass("tag label").attr("href", data.link);
        const $i = $('<i/>').addClass("fa fa-arrow-circle-right");
        $link.prepend($i);
        return $('<li/>').append($link);
    }

    getDocuments();

    if (adapterConfig.clock && adapterConfig.hide_events) {
        $('.documentationButton').parent().removeClass('rotate-button');
    }
}
