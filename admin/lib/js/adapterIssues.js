/* global systemLang, dateOptions, adapterConfig */

function showIssues() {

    async function getIssues() {
        const adapters = window.top.gMain.tabs.adapters.curInstalled;
        if (adapters && typeof adapters === "object") {
            $('#adapterIssueList').empty();
            $('#adapterIssueListLoader').remove();            
            await asyncForEach(Object.keys(adapters), async function (key) {
                if (key !== "hosts") {
                    const adapter = adapters[key];
                    const $item = $('#forumEntryTemplate').children().clone(true, true);
                    $item.find('.label-success').remove();

                    const full_name = adapter.readme.substring(adapter.readme.indexOf(".com/") + 5, adapter.readme.indexOf("/blob/"));

                    const fullNameId = full_name.replace("/", "ISSUE-ISSUE").replace(".", "ISSUE-PUNKT-ISSUE");

                    $item.find('.titleLink').text(adapter.title).attr('href', "https://github.com/" + full_name + "/issues");
                    $item.find('.collapse-link').attr("data-adapter", fullNameId).addClass("loadAdapterIssues");

                    const ul = $('<ul/>').attr("id", "issue_" + fullNameId).addClass("list-unstyled timeline");
                    $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
                    $item.find('.y_content').addClass('spoiler-content').css('display', 'none').css('background-color', 'cornsilk').empty().append(ul);

                    $('#adapterIssueList').append($item);
                }
            });
        }
        if (adapterConfig.adapter_issue_closed) {
            $('#knownIssuesBlock').find('.x_title a.collapse-link').click();
        }
    }

    getIssues();
}

async function getAndWriteIssuesFor(id) {
    const full_name = id.replace("ISSUE-ISSUE", "/").replace("ISSUE-PUNKT-ISSUE", ".");
    const allIssues = await getAllIssuesFromAdapter(full_name);
    await writeAllIssues(allIssues, "issue_" + id);
}