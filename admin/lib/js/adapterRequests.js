/* global systemLang, dateOptions */

//------------------------------------------------------ SEARCH GITHUB --------------------------------------------------------------------

function showAdapterRequest() {

    async function getIssues() {

        const issues = await (await fetch("https://api.github.com/repos/ioBroker/AdapterRequests/issues")).json();

        await asyncForEach(issues, async function (issue) {
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.label-success').remove();
            $item.find('.titleLink').text(issue.title).attr('href', issue.html_url);
            $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
            $item.find('.y_content').addClass('spoiler-content').css('display', 'none');
            $item.find('.byline').text(new Date(issue.created_at).toLocaleDateString('en', dateOptions) + " - " + issue.user.login);
            $item.find('.description').html(issue.body);

            if (issue.assignee.login) {
                $item.find('.assigner_img').attr('src', issue.assignee.avatar_url);
                $item.find('.assigner').text('assined from ' + issue.assignee.login);
            } else {
                $item.find('.assignDiv').remove;
            }

            issue.labels.forEach(function (label) {
                const $label = $('#tagTemplate').children().clone(true, true);
                $label.find('.forumClass').text(label.name);
                $label.css('background-color', '#' + label.color);
                $item.find('.tags').append($label);
            });

            $('#adapterRequestList').append($item);
        });
    }

    getIssues();
}