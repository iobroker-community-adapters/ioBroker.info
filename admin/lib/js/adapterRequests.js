/* global systemLang, dateOptions, adapterConfig, showdown, githubHeaders, githubHelper */

const allTitles = [];

async function getAllIssues(owner, name, login, search, onlyOpen) {
    let allIssues = [];
    const isAdapterRequest = (owner + "/" + name) === "ioBroker/AdapterRequests";
    const firstQL = githubHelper.getQueryForIssues(owner, name, login, isAdapterRequest, null, search, onlyOpen);

    let issues = await githubHelper.getDataV4(firstQL);

    if (issues && issues.data && (issues.data.repository || issues.data.user || issues.data.search)) {
        let data = login ? (search ? issues.data.search : issues.data.user.issues) : issues.data.repository.issues;
        allIssues = allIssues.concat(data.edges);
        let hasNext = data.pageInfo.hasNextPage;
        let cursor = data.pageInfo.endCursor;
        while (hasNext) {
            const nextQL = githubHelper.getQueryForIssues(owner, name, login, isAdapterRequest, cursor, search, onlyOpen);
            issues = await githubHelper.getDataV4(nextQL);
            if (issues && issues.data && (issues.data.repository || issues.data.user || issues.data.search)) {
                data = login ? (search ? issues.data.search : issues.data.user.issues) : issues.data.repository.issues;
                allIssues = allIssues.concat(data.edges);
                hasNext = data.pageInfo.hasNextPage;
                cursor = data.pageInfo.endCursor;
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
        if (title) {
            if (title.toLowerCase().startsWith("adapter for ") || title.toLowerCase().startsWith("adapter für ")) {
                title = title.substring(12, title.length);
            } else if (title.toLowerCase().startsWith("adapter ")) {
                title = title.substring(8, title.length);
            }
            issue.title = title;
            allTitles.push(title);

            response.push(issue);
        }
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
        if (id === "adapterRequestList") {
            $('#adapterRequestBlockTitle').append($("<span>(" + allIssues.length + ")</span>"));
        } else if (id === "githublistbody") {
            $('#modal-githublist-title').append($("<span>(" + allIssues.length + ")</span>"));
        }
        const now = new Date();
        allIssues.forEach(function (issueNode) {
            const issue = issueNode.node;
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.label-success').remove();
            const createdAt = new Date(issue.createdAt);
            if (id === "adapterRequestList") {
                $item.find('.title').prepend($("<span title='" + _("Total votes") + "' class='badge" + (issue.reactions.viewerHasReacted ? " badge-success" : "") + "' id='reactionARBadge" + issue.number + "'>" + issue.reactions.totalCount + "</span>"));
                const votes = "<strong class='text-primary'>" + _("Total votes") + ": <span id='reactionARNumber" + issue.number + "'>" + issue.reactions.totalCount + "</span></strong>";
                let buttons = "<div class='pull-right marginHoch'>";
                if (issue.comments.totalCount > 0) {
                    buttons += "<button type='button' data-issue-id='" + issue.id + "' id='issueComments" + issue.databaseId + "' class='openIssueComments btn btn-default'><i class='fa fa-commenting fa-lg'></i></button>&nbsp;";
                }
                if (issue.state === "OPEN") {
                    buttons += "<button type='button' title='" + (issue.reactions.viewerHasReacted ? _("I voted!") : _("Vote for this adapter request!")) + "' id='reactionAR" + issue.number + "' class='adapterRequestReaction btn btn-" + (issue.reactions.viewerHasReacted ? 'success' : 'default') + "'><i class='fa fa-thumbs-up fa-lg'></i></button>";
                } else if (issue.reactions.viewerHasReacted) {
                    buttons += "<button type='button' title='I voted!' class='btn btn-success'><i class='fa fa-thumbs-up fa-lg'></i></button>";
                }
                buttons += "</div>";
                $item.find('.y_content').append($(buttons));
                if (issue.state === "OPEN") {
                    if (issue.reactions.viewerHasReacted) {
                        $item.find('.y_title').css("background-color", "#dff0d8");
                    } else if ((now - createdAt) < (3600000 * 24 * 30)) {
                        $item.find('.y_title').css("background-color", "#d9edf7");
                    }
                } else {
                    const lock = "<i class='fa fa-lock fa-2x text-warning'>&nbsp;</i>";
                    $item.find('.y_content').append($(lock)).css("background-color", "#f2f2f2");
                    if (issue.reactions.viewerHasReacted) {
                        $item.find('.y_title').css("background-color", "#ccd8cc");
                    } else {
                        $item.find('.y_title').css("background-color", "#cccccc");
                    }
                }
                $item.find('.y_content').append($(votes)).append($("<div class='marginRunter' id='allCommentsDiv" + issue.databaseId + "'></div>"));
            } else {
                if (issue.comments.totalCount > 0) {
                    let number = issue.comments.totalCount;
                    if (number < 9) {
                        number += "&nbsp;&nbsp;";
                    } else if (number < 99) {
                        number += "&nbsp;";
                    }
                    const comment = "<span class='comments-counter has-badge' data-count='" + number + "'><i class='fa fa-comment xfa-inverse'></i></span>";
                    $item.find('.title').prepend($(comment));
                    const commentsCount = "<strong class='text-primary'>" + _("Total comments") + ": <span>" + issue.comments.totalCount + "</span></strong>";
                    const allComments = "<div class='pull-right marginHoch'><button type='button' data-issue-id='" + issue.id + "' id='issueComments" + issue.databaseId + "' class='openIssueComments btn btn-default'><i class='fa fa-commenting fa-lg'></i></button></div>";
                    $item.find('.y_content').append($(commentsCount)).append($(allComments)).append($("<div class='marginRunter' id='allCommentsDiv" + issue.databaseId + "'></div>"));
                }
                $item.find('.titleLink').attr('title', issue.repository.nameWithOwner);
            }
            $item.find('.titleLink').text(issue.title).attr('href', issue.url);
            $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
            $item.find('.y_content').addClass('spoiler-content').css('display', 'none');
            $item.find('.byline').text(createdAt.toLocaleDateString('en', dateOptions) + " - " + (issue.author ? issue.author.login : ''));

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
            $('#' + id).replaceWith("<h2>" + _('no issues found') + "</h2>");
        }
    }
}

function writeAllIssues(allIssues, id) {
    if (allIssues.length > 0) {
        if (id === "adapterRequestList") {
            $('#adapterRequestBlockTitle').append($("<span>(" + allIssues.length + ")</span>"));
        }
        const now = new Date();
        allIssues.forEach(function (issue) {
            const $item = $('#forumEntryTemplate').children().clone(true, true);
            $item.find('.label-success').remove();
            $item.find('.titleLink').text(issue.title).attr('href', issue.html_url);
            $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
            const thumb = "<div class='pull-right marginHoch2'><button type='button' class='btn btn-default disabled'><i class='fa fa-thumbs-up fa-lg'></i></button></div>";
            $item.find('.y_content').append($(thumb)).addClass('spoiler-content').css('display', 'none');
            const createdAt = new Date(issue.created_at);
            $item.find('.byline').text(createdAt.toLocaleDateString('en', dateOptions) + " - " + issue.user.login);

            if ((now - createdAt) < (3600000 * 24 * 30)) {
                $item.find('.y_title').css("background-color", "#d9edf7");
            }

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
            $('#' + id).replaceWith("<h2>" + _('no issues found') + "</h2>");
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
                allIssues = await getAllIssues("ioBroker", "AdapterRequests", null, false, adapterConfig.adapter_request_close_hidden ? true : false);
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