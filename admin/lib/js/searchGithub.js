/* global systemLang, dateOptions */

//------------------------------------------------------ SEARCH GITHUB --------------------------------------------------------------------

function searchGithubForNewAdapters(by = "name", order = false) {

    sessionStorage.getItem('ioBroker.info.foundGit') ? write() : search();

    async function search() {

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

            const found = {};
            for (let i = 1; i < 20; i++) {
                data = await (await fetch("https://api.github.com/search/repositories?q=iobroker+in:name&sort=updated&page=" + i + "&per_page=100")).json();
                if (data && data.items) {
                    if (data.total_count < i * 100) {
                        i = 100;
                    }
                    await asyncForEach(data.items, async function (val) {
                        const full_name = val.full_name;
                        if ($.inArrayIn(full_name, adapters) === -1) {
                            if (by === "create") {
                                found[val.created_at] = val;
                            } else if (by === "update") {
                                found[val.updated_at] = val;
                            } else {
                                found[val.name] = val;
                            }
                        }
                    });
                }
            }
            const foundSorted = {};

            if ((by === "name" && !order) || (by !== "name" && order)) {
                Object.keys(found).sort(function (a, b) {
                    return a.toLowerCase().localeCompare(b.toLowerCase());
                }).forEach(function (key) {
                    foundSorted[key] = found[key];
                });
            } else {
                Object.keys(found).sort(function (a, b) {
                    return a.toLowerCase().localeCompare(b.toLowerCase());
                }).reverse().forEach(function (key) {
                    foundSorted[key] = found[key];
                });
            }

            sessionStorage.setItem('ioBroker.info.foundGit', JSON.stringify(foundSorted));

            write();
        } catch (e) {
            console.log(e);
        }
    }

    function write() {
        const data = JSON.parse(sessionStorage.getItem('ioBroker.info.foundGit'));
        $('#githubSearchList').empty();
        Object.keys(data).forEach(function (key) {
            const val = data[key];
            $('#githubSearchList').append("<li><a href='" + val.html_url + "' target='_blank'>" + val.name + "</a> - (" + val.size + " kb) - " + val.owner.login + " - " + new Date(val.updated_at).toLocaleDateString(systemLang, dateOptions) + " - " + val.description + "</li>");
        });
}
}