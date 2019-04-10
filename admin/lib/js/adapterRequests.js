/* global systemLang, dateOptions, adapterConfig, showdown, githubHeaders, githubHelper */

const allTitles = [];

async function getAllIssues(owner, name, login) {
    let allIssues = [];
    const isAdapterRequest = (owner + "/" + name) === "ioBroker/AdapterRequests";
    const firstQL = githubHelper.getQueryForIssues(owner, name, login, isAdapterRequest);

    let issues = await githubHelper.getDataV4(firstQL);

    if (issues && issues.data && issues.data.repository && issues.data.repository.issues) {
        if (isAdapterRequest) {
            $('#adapterRequestBlockTitle').append($("<span>(" + issues.data.repository.issues.totalCount + ")</span>"));
        }
        allIssues = allIssues.concat(issues.data.repository.issues.edges);
        let hasNext = issues.data.repository.issues.pageInfo.hasNextPage;
        let cursor = issues.data.repository.issues.pageInfo.endCursor;
        while (hasNext) {
            const nextQL = githubHelper.getQueryForIssues(owner, name, login, isAdapterRequest, cursor);
            issues = await githubHelper.getDataV4(nextQL);
            if (issues && issues.data && issues.data.repository && issues.data.repository.issues) {
                allIssues = allIssues.concat(issues.data.repository.issues.edges);
                hasNext = issues.data.repository.issues.pageInfo.hasNextPage;
                cursor = issues.data.repository.issues.pageInfo.endCursor;
            }else{
                hasNext = false;
                cursor = "";
            }
        }
    }

    if (isAdapterRequest) {
        allIssues = await cleanTitle(allIssues);

        allIssues.sort(function (a, b) {
            return a.node.title.toLowerCase().localeCompare(b.node.title.toLowerCase());
        });
    }

    return allIssues;
}

async function cleanTitle(allIssues) {
    const response = [];
    await asyncForEach(allIssues, async function (issue) {
        let title = issue.node.title;
        if (title.toLowerCase().startsWith("adapter for ") || title.toLowerCase().startsWith("adapter für ")) {
            title = title.substring(12, title.length);
        } else if (title.toLowerCase().startsWith("adapter ")) {
            title = title.substring(8, title.length);
        }
        issue.node.title = title;
        allTitles.push(title);

        response.push(issue);
    });
    return response;
}

function writeAllIssues(allIssues, id) {
    if (allIssues.length > 0) {
        allIssues.forEach(function (issueNode) {
            const issue = issueNode.node;
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.label-success').remove();
            if (id === "adapterRequestList") {
                $item.find('.title').prepend($("<span class='badge'>" + issue.reactions.totalCount + "</span>"));
                const votes = "<strong class='text-primary'>" + _("Total votes") + ": " + issue.reactions.totalCount + "</strong>";
                $item.find('.y_content').append($(votes));
            }
            $item.find('.titleLink').text(issue.title).attr('href', issue.url);
            $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
            $item.find('.y_content').addClass('spoiler-content').css('display', 'none');
            $item.find('.byline').text(new Date(issue.createdAt).toLocaleDateString('en', dateOptions) + " - " + issue.author.login);

            const link = issue.url.match(/([^/]*\/){6}/);
            const html = new showdown.Converter().makeHtml(issue.body).replace(/src="(?!http)/g, 'src="' + link[0]).replace(/<img/g, '<img class="img-responsive"');

            $item.find('.description').html(html);

            if (issue.assignees.nodes.length > 0) {
                $item.find('.assigner_img').attr('src', issue.assignees.nodes[0].avatarUrl);
                $item.find('.assigner').text('assined to ' + issue.assignees.nodes[0].login);
            } else {
                $item.find('.assignDiv').remove();
            }

            issue.labels.nodes.forEach(function (label) {
                const $label = $('#tagTemplate').children().clone(true, true);
                $label.find('.forumClass').text(label.name);
                $label.css('background-color', '#' + label.color);
                $item.find('.tags').append($label);
            });

            $('#' + id).append($item);
        });
    } else {
        if (id !== "githublistbody") {
            $('#' + id).parent().empty().html("<h2>" + _('no issues found') + "</h2>");
        }
    }
}

function showAdapterRequest() {

    async function getIssues() {

        let allIssues;
        if (sessionStorage.getItem('ioBroker.info.adapterRequestV4')) {
            allIssues = JSON.parse(sessionStorage.getItem('ioBroker.info.adapterRequestV4'));
        } else {
            allIssues = await getAllIssues("ioBroker", "AdapterRequests");
            sessionStorage.setItem('ioBroker.info.adapterRequestV4', JSON.stringify(allIssues));
        }

        $('#adapterRequestList').empty();
        $('#adapterRequestListLoader').remove();
        await writeAllIssues(allIssues, "adapterRequestList");
        if (adapterConfig.adapter_request_closed) {
            $('#adapterRequestBlock').find('.x_title a.collapse-link').click();
        }
    }

    if (adapterConfig.github_token) {
        $("#new-adapter-request-li").removeClass("disabled");
        $("#new-adapter-request").removeClass("disabled");
    }

    getIssues();
}