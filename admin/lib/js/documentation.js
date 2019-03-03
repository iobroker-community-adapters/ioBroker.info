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

        const docs = infoData.docs;

        await asyncForEach(tmpLangs, async function (lang) {
            await asyncForEach(docs.community[lang], async function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_community').append($li);
            });
            await asyncForEach(docs.documentation[lang], async function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_documentation').append($li);
            });
            await asyncForEach(docs.news[lang], async function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_news').append($li);
            });
            await asyncForEach(docs.blog[lang], async function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_blog').append($li);
            });
            await asyncForEach(docs.development[lang], async function (data) {
                const $link = $('#tagTemplate').children().clone(true, true);
                $link.find('.forumClass').text(data.title);
                $link.find('.tag').addClass("tag label").attr("href", data.link);
                const $li = $('<li/>').append($link);
                $('#doc_development').append($li);
            });
            await asyncForEach(docs.other[lang], async function (data) {
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
