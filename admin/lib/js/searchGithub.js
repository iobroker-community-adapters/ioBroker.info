/* global systemLang, dateOptions */

//------------------------------------------------------ SEARCH GITHUB --------------------------------------------------------------------

const searchGithubForNewAdapters = async function () {

    let adapters = [];

    try {
        let data = await (await fetch('https://raw.githubusercontent.com/ioBroker/ioBroker.repositories/master/sources-dist.json')).json();
        Object.keys(data).forEach(function (key) {
            let link = data[key].icon;
            if (link) {
                link = link.substring(link.indexOf(".com/") + 5, link.indexOf("/master/"));
                adapters.push(link);
            }
        });

        data = await (await fetch('https://raw.githubusercontent.com/ioBrokerChecker/testData/master/data.json')).json();
        adapters = adapters.concat(data.ignore);
        adapters = adapters.concat(data.noIoPackage);

        for (let i = 1; i < 20; i++) {
            data = await (await fetch("https://api.github.com/search/repositories?q=iobroker+in:name&sort=updated&page=" + i + "&per_page=100")).json();
            if (data && data.items) {
                if (data.total_count < i * 100) {
                    i = 100;
                }
                data.items.forEach(async function (val) {
                    const full_name = val.full_name;
                    if ($.inArrayIn(full_name, adapters) === -1) {
                        $('#githubSearchList').append("<li><a href='" + val.html_url + "' target='_blank'>" + val.name + "</a> - (" + val.size + " kb) - " + val.owner.login + " - " + new Date(val.updated_at).toLocaleDateString(systemLang, dateOptions) + " - " + val.description + "</li>");
                    }
                });
            }
        }
    } catch (e) {
        console.log(e);
    }

};