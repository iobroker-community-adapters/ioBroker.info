/* global systemLang, dateOptions, adapterConfig, githubHelper */

let stargazers = {};

function searchGithubForNewAdapters(by = "name", order = false, allRepos) {

    sessionStorage.getItem('ioBroker.info.foundGit') ? write() : search(allRepos);

    async function search(repos) {

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
            if (repos && repos.length > 0) {
                await asyncForEach(repos, async function (val) {
                    const adapter = val.node;
                    const full_name = adapter.nameWithOwner;
                    if ($.inArrayIn(full_name, adapters) === -1) {
                        if (by === "create") {
                            found[adapter.createdAt] = adapter;
                        } else if (by === "update") {
                            found[adapter.updatedAt] = adapter;
                        } else {
                            found[adapter.name] = adapter;
                        }
                    }
                });
            } else {
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

            write(foundSorted);
        } catch (e) {
            console.log(e);
        }
    }

    async function write(data) {

        if (!data) {
            data = JSON.parse(sessionStorage.getItem('ioBroker.info.foundGit'));
        }

        $('#githubSearchList').empty();
        $('#githubSearchListLoader').remove();
        await asyncForEach(Object.keys(data), function (key) {
            const val = data[key];
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.label-success').remove();
            $item.find('.assignDiv').remove();
            $item.find('.byline').remove();
            $item.find('.titleLink').text(val.name + " - " + _('last update') + ": " + new Date(val.updated_at ? val.updated_at : val.updatedAt).toLocaleDateString(systemLang, dateOptions) + " (" + val.owner.login + ")").attr('href', (val.html_url ? val.html_url : val.url));
            $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
            $item.find('.y_content').addClass('spoiler-content').css('display', 'none');
            const repoID = val.id ? val.id : val.databaseId;
            $item.find('.collapse-link').attr("data-md-url", "https://raw.githubusercontent.com/" + (val.full_name ? val.full_name : val.nameWithOwner) + "/master/README.md").addClass("loadGithubData").attr('data-md-target', 'git_desc_readme_' + repoID);
            $item.find('.description').attr('id', 'git_desc_readme_' + repoID);
            $('#githubSearchList').append($item);
        });
        if (adapterConfig.new_adapters_closed) {
            $('#adapterSearchBlock').find('.x_title a.collapse-link').click();
        }
}
}

async function searchAdaptersOnGithub() {

    if (adapterConfig.new_adapters && sessionStorage.getItem('ioBroker.info.foundGit')) {
        searchGithubForNewAdapters(adapterConfig.new_adapters_sort, adapterConfig.new_adapters_order);
    }

    let allRepos = [];
    if (adapterConfig.github_token) {
        const firstQL = githubHelper.getQueryForRepos();

        let issues = await githubHelper.getDataV4(firstQL);
        if (issues && issues.data && issues.data.search) {
            let data = issues.data.search;
            allRepos = allRepos.concat(data.edges);
            stargazers = {};
            issues.data.search.edges.forEach(function (repoNode) {
                const repo = repoNode.node;
                const id = repo.nameWithOwner.replace("/", "ISSUE-ISSUE").replace(".", "ISSUE-PUNKT-ISSUE").toUpperCase();
                stargazers[id] = {};
                stargazers[id].count = repo.stargazers.totalCount;
                stargazers[id].starred = repo.viewerHasStarred;
            });
            let hasNext = data.pageInfo.hasNextPage;
            let cursor = data.pageInfo.endCursor;
            while (hasNext) {
                const nextQL = githubHelper.getQueryForRepos(cursor);
                issues = await githubHelper.getDataV4(nextQL);
                if (issues && issues.data && issues.data.search) {
                    data = issues.data.search;
                    allRepos = allRepos.concat(data.edges);
                    issues.data.search.edges.forEach(function (repoNode) {
                        const repo = repoNode.node;
                        const id = repo.nameWithOwner.replace("/", "ISSUE-ISSUE").replace(".", "ISSUE-PUNKT-ISSUE").toUpperCase();
                        stargazers[id] = {};
                        stargazers[id].count = repo.stargazers.totalCount;
                        stargazers[id].starred = repo.viewerHasStarred;
                    });
                    hasNext = data.pageInfo.hasNextPage;
                    cursor = data.pageInfo.endCursor;
                } else {
                    hasNext = false;
                    cursor = "";
                }
            }
        }

        sessionStorage.setItem('ioBroker.info.stargazers', JSON.stringify(stargazers));
        addStarsToAdapterIssues();
    }

    if (adapterConfig.new_adapters && !sessionStorage.getItem('ioBroker.info.foundGit')) {
        searchGithubForNewAdapters(adapterConfig.new_adapters_sort, adapterConfig.new_adapters_order, allRepos);
    }
}