/* global adapterConfig, systemLang, infoData */

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

        langs.forEach(function (lang) {
            infoData.docs.community[lang].forEach(function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_community').append($li);
            });
            infoData.docs.documentation[lang].forEach(function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_documentation').append($li);
            });
            infoData.docs.news[lang].forEach(function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title + " (" + data.date + ")");
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_news').append($li);
            });
            infoData.docs.blog[lang].forEach(function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_blog').append($li);
            });
            infoData.docs.development[lang].forEach(function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_development').append($li);
            });
            infoData.docs.other[lang].forEach(function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_other').append($li);
            });
        });

    }

    getDocuments();
}
