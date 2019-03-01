/* global systemLang, dateOptions */

//------------------------------------------------------ SEARCH GITHUB --------------------------------------------------------------------

function showIssues() {

    async function getIssues() {
        const adapters = window.top.gMain.tabs.adapters.curInstalled;
        if (adapters && typeof adapters === "object") {
            await asyncForEach(Object.keys(adapters), async function (key) {
                const adapter = adapters[key];
                const $item = $('#forumEntryTemplate').children().clone(true, true);
                $item.find('.label-success').remove();
                
                const full_name = adapter.readme.substring(adapter.readme.indexOf(".com/") + 5, adapter.readme.indexOf("/blob/"));
                
                $item.find('.titleLink').text(adapter.title).attr('href', "https://github.com/" + full_name + "/issues");
                $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
                $item.find('.y_content').addClass('spoiler-content').css('display', 'none').empty();

                $('#adapterIssueList').append($item);
            });
        }
    }

    getIssues();
}