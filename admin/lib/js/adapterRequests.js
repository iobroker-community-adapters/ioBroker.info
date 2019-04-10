/* global systemLang, dateOptions, adapterConfig, showdown, githubHeaders, githubHelper */

const allTitles = [];

async function getAllIssues(owner, name, login) {
    let allIssues = [];
    const isAdapterRequest = (owner + "/" + name) === "ioBroker/AdapterRequests";
    const firstQL = githubHelper.getQueryForIssues(owner, name, login, isAdapterRequest);

    let issues = await githubHelper.getDataV4(firstQL);

    if (issues && issues.data && (issues.data.repository || issues.data.user)) {
        let data = login ? issues.data.user : issues.data.repository;
        if (isAdapterRequest) {
            $('#adapterRequestBlockTitle').append($("<span>(" + data.issues.totalCount + ")</span>"));
        }
        allIssues = allIssues.concat(data.issues.edges);
        let hasNext = data.issues.pageInfo.hasNextPage;
        let cursor = data.issues.pageInfo.endCursor;
        while (hasNext) {
            const nextQL = githubHelper.getQueryForIssues(owner, name, login, isAdapterRequest, cursor);
            issues = await githubHelper.getDataV4(nextQL);
            if (issues && issues.data && (issues.data.repository || issues.data.user)) {
                data = login ? issues.data.user : issues.data.repository;
                allIssues = allIssues.concat(data.issues.edges);
                hasNext = data.issues.pageInfo.hasNextPage;
                cursor = data.issues.pageInfo.endCursor;
            } else {
                hasNext = false;
                cursor = "";
            }
        }
    }

    if (isAdapterRequest) {
        allIssues = await cleanTitleV4(allIssues);

        allIssues.sort(function (a, b) {
            return a.node.title.toLowerCase().localeCompare(b.node.title.toLowerCase());
        });
    }

    return allIssues;
}

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

async function cleanTitleV4(allIssues) {
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

function writeAllIssuesV4(allIssues, id) {
    if (allIssues.length > 0) {
        allIssues.forEach(function (issueNode) {
            const issue = issueNode.node;
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.label-success').remove();
            if (id === "adapterRequestList") {
                $item.find('.title').prepend($("<span class='badge'>" + issue.reactions.totalCount + "</span>"));
                const votes = "<strong class='text-primary'>" + _("Total votes") + ": " + issue.reactions.totalCount + "</strong>";
                const thumb = "<div class='pull-right marginHoch'><button type='button' class='btn btn-" + (issue.reactions.viewerHasReacted ? 'success' : 'default') + "'><i class='fa fa-thumbs-up fa-lg'></i></button></div>";
                $item.find('.y_content').append($(thumb)).append($(votes));
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

function writeAllIssues(allIssues, id) {
    if (allIssues.length > 0) {
        allIssues.forEach(function (issue) {
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.label-success').remove();
            $item.find('.titleLink').text(issue.title).attr('href', issue.html_url);
            $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
            const thumb = "<div class='pull-right marginHoch'><button type='button' class='btn btn-default disabled'><i class='fa fa-thumbs-up fa-lg'></i></button></div>";
            $item.find('.y_content').append($(thumb)).addClass('spoiler-content').css('display', 'none');
            $item.find('.byline').text(new Date(issue.created_at).toLocaleDateString('en', dateOptions) + " - " + issue.user.login);

            const link = issue.html_url.match(/([^/]*\/){6}/);
            const html = new showdown.Converter().makeHtml(issue.body).replace(/src="(?!http)/g, 'src="' + link[0]).replace(/<img/g, '<img class="img-responsive"');

            $item.find('.description').html(html);

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
        if (id !== "githublistbody") {
            $('#' + id).parent().empty().html("<h2>" + _('no issues found') + "</h2>");
        }
    }
}

function showAdapterRequest() {

    async function getIssues() {

        let allIssues;
        const storagePoint = adapterConfig.github_token ? 'ioBroker.info.adapterRequestV4' : 'ioBroker.info.adapterRequest';
        if (sessionStorage.getItem(storagePoint)) {
            allIssues = JSON.parse(sessionStorage.getItem(storagePoint));
        } else {
            if (adapterConfig.github_token) {
                allIssues = await getAllIssues("ioBroker", "AdapterRequests");
            } else {
                allIssues = await getAllIssuesFromAdapter("ioBroker/AdapterRequests");
            }
            sessionStorage.setItem(storagePoint, JSON.stringify(allIssues));
        }

        $('#adapterRequestList').empty();
        $('#adapterRequestListLoader').remove();

        if (adapterConfig.github_token) {
            await writeAllIssuesV4(allIssues, "adapterRequestList");
        } else {
            await writeAllIssues(allIssues, "adapterRequestList");
        }

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