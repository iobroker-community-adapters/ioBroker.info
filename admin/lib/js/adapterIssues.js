/* global systemLang, dateOptions, adapterConfig, stargazers */

function showIssues() {

    async function getIssues() {
        const adapters = window.top.gMain.tabs.adapters.curInstalled;
        if (adapters && typeof adapters === "object") {
            $('#adapterIssueList').empty();
            $('#adapterIssueListLoader').remove();
            await asyncForEach(Object.keys(adapters), async function (key) {
                if (key !== "hosts") {
                    const adapter = adapters[key];
                    
                    if(adapter && adapter.readme){
                        const $item = $('#forumEntryTemplate').children().clone(true, true);
                        $item.find('.label-success').remove();

                        const full_name = adapter.readme.substring(adapter.readme.indexOf(".com/") + 5, adapter.readme.indexOf("/blob/"));

                        const fullNameId = full_name.replace("/", "ISSUE-ISSUE").replace(".", "ISSUE-PUNKT-ISSUE").toUpperCase();

                        $item.find('.title').attr('id', 'adapterTitleIssueList' + fullNameId);
                        $item.find('.titleLink').text(adapter.title).attr('href', "https://github.com/" + full_name + "/issues").attr('title', full_name);
                        $item.find('.collapse-link').attr("data-adapter", fullNameId).addClass("loadAdapterIssues");

                        let button = "<div class='text-center'>";
                        button += "<button type='button' data-adapter='" + adapter.title + ": " + adapter.version + "' data-href='https://api.github.com/repos/" + full_name + "/issues' class='btn btn-primary create-issue-adapter-button" + (adapterConfig.github_token ? "" : " disabled") + "'>";
                        button += "<i class='fa fa-plus fa-lg'></i> ";
                        button += _("add new request");
                        button += "</button>";
                        button += "</div>";

                        const ul = $('<ul/>').attr("id", "issue_" + fullNameId).addClass("list-unstyled timeline").attr('style', "margin-bottom: 3px;");
                        $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
                        $item.find('.y_content').addClass('spoiler-content').css('display', 'none').css('background-color', 'cornsilk').empty().append($(button)).append(ul).append($(button));

                        $('#adapterIssueList').append($item);
                    }
                }
            });
            if (sessionStorage.getItem('ioBroker.info.stargazers')) {
                stargazers = JSON.parse(sessionStorage.getItem('ioBroker.info.stargazers'));
                addStarsToAdapterIssues();
            }
        }
        if (adapterConfig.adapter_issue_closed) {
            $('#knownIssuesBlock').find('.x_title a.collapse-link').click();
        }
    }

    getIssues();
}

function addStarsToAdapterIssues() {
    const adapters = window.top.gMain.tabs.adapters.curInstalled;
    if (adapters && typeof adapters === "object") {
        Object.keys(adapters).forEach(function (key) {
            if (key !== "hosts") {
                const adapter = adapters[key];
                const full_name = adapter.readme.substring(adapter.readme.indexOf(".com/") + 5, adapter.readme.indexOf("/blob/"));
                const fullNameId = full_name.replace("/", "ISSUE-ISSUE").replace(".", "ISSUE-PUNKT-ISSUE").toUpperCase();
                const stars = stargazers[fullNameId];
                if (stars && $('#starsCounter' + fullNameId).length === 0) {
                    const button = "<div class='pull-right'><button type='button' title='" + (stars.starred ? _("Thanks for the adapter!") : _("I want to thank the developer...")) + "' data-fullname='" + full_name + "' id='reactionBI" + fullNameId + "' class='adaptersInstalledReaction btn btn-" + (stars.starred ? "success" : "default") + "'><i class='fa fa-thumbs-up fa-lg'></i></button></div>";
                    const starCounter = "<span title='" + _("Total votes") + "' class='badge" + (stars.starred ? ' badge-success' : '') + "' id='starsCounter" + fullNameId + "'>" + stars.count + "</span>";
                    $('#adapterTitleIssueList' + fullNameId).prepend($(starCounter));
                    const $content = $('#adapterTitleIssueList' + fullNameId).parent().parent().find(".y_content");
                    $content.prepend($(button));
                    $($content.find('.create-issue-adapter-button')[0]).css('margin-left', '44px');
                    if (stars.starred) {
                        $('#adapterTitleIssueList' + fullNameId).parent().css("background-color", "#dff0d8");
                    }
                } else if (stars) {
                    if (stars.starred) {
                        $('#reactionBI' + fullNameId).addClass('btn-success').removeClass('btn-default');
                        $('#starsCounter' + fullNameId).addClass('badge-success');
                        $('#adapterTitleIssueList' + fullNameId).parent().css("background-color", "#dff0d8");
                    } else {
                        $('#reactionBI' + fullNameId).removeClass('btn-success').addClass('btn-default');
                        $('#starsCounter' + fullNameId).removeClass('badge-success');
                        $('#adapterTitleIssueList' + fullNameId).parent().css("background-color", "");
                    }
                    $('#starsCounter' + fullNameId).text(stars.count);
                }
            }
        });
    }
}

async function getAndWriteIssuesFor(id) {
    const full_name = id.replace("ISSUE-ISSUE", "/").replace("ISSUE-PUNKT-ISSUE", ".").split("/");
    let allIssues;
    $("<div class='loader3 loader-small' id='loader_" + id + "'></div>").insertBefore("#issue_" + id);
    if (adapterConfig.github_token) {
        allIssues = await getAllIssues(full_name[0], full_name[1], null, false, true);
        await writeAllIssuesV4(allIssues, "issue_" + id);
    } else {
        allIssues = await getAllIssuesFromAdapter(full_name);
        await writeAllIssues(allIssues, "issue_" + id);
    }
    $("#loader_" + id).remove();
}