/* global systemLang, dateOptions, adapterConfig */

const allTitles = [];

async function getAllIssuesFromAdapter(full_name) {
    let allIssues = [];

    for (let i = 1; i < 20; i++) {
        const issues = await (await fetch("https://api.github.com/repos/" + full_name + "/issues?page=" + i + "&per_page=100")).json();
        allIssues = allIssues.concat(issues);
        if (issues.length !== 100) {
            i = 100;
        }
    }

    allIssues = await cleanTitle(allIssues);

    allIssues.sort(function (a, b) {
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    });

    return allIssues;
}

async function cleanTitle(allIssues) {
    const response = [];
    await asyncForEach(allIssues, async function (issue) {
        let title = issue.title;
        if (title.toLowerCase().startsWith("adapter for ") || title.toLowerCase().startsWith("adapter für ")) {
            title = title.substring(12, title.length);
        } else if (title.toLowerCase().startsWith("adapter ")) {
            title = title.substring(8, title.length);
        }
        issue.title = title;
        allTitles.push(title);
        
        response.push(issue);
    });
    return response;
}

async function writeAllIssues(allIssues, id) {
    if (allIssues.length > 0) {
        await asyncForEach(allIssues, async function (issue) {
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.label-success').remove();
            $item.find('.titleLink').text(issue.title).attr('href', issue.html_url);
            $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
            $item.find('.y_content').addClass('spoiler-content').css('display', 'none');
            $item.find('.byline').text(new Date(issue.created_at).toLocaleDateString('en', dateOptions) + " - " + issue.user.login);
            $item.find('.description').html(issue.body);

            if (issue.assignee) {
                $item.find('.assigner_img').attr('src', issue.assignee.avatar_url);
                $item.find('.assigner').text('assined to ' + issue.assignee.login);
            } else {
                $item.find('.assignDiv').remove();
            }

            issue.labels.forEach(function (label) {
                const $label = $('#tagTemplate').children().clone(true, true);
                $label.find('.forumClass').text(label.name);
                $label.css('background-color', '#' + label.color);
                $item.find('.tags').append($label);
            });

            $('#' + id).append($item);
        });
    } else {
        $('#' + id).parent().empty().html("<h2>" + _('no issues found') + "</h2>");
    }
}

function showAdapterRequest() {

    async function getIssues() {

        let allIssues;
        if (sessionStorage.getItem('ioBroker.info.adapterRequest')) {
            allIssues = JSON.parse(sessionStorage.getItem('ioBroker.info.adapterRequest'));
        } else {
            allIssues = await getAllIssuesFromAdapter("ioBroker/AdapterRequests");
            sessionStorage.setItem('ioBroker.info.adapterRequest', JSON.stringify(allIssues));
        }

        $('#adapterRequestList').empty();
        $('#adapterRequestListLoader').remove();
        await writeAllIssues(allIssues, "adapterRequestList");
        if (adapterConfig.adapter_request_closed) {
            $('#adapterRequestBlock').find('.x_title a.collapse-link').click();
        }
    }
    
    if(adapterConfig.github_token){
       $("#new-adapter-request-li").removeClass("disabled");
       $("#new-adapter-request").removeClass("disabled");
    }

    getIssues();
}
