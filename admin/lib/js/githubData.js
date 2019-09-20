/* global systemInfoForGithub, adapterConfig, githubMarkdownArea, dateOptions, showdown */

let githubuser = {};

const githubHelper = {
    getUserdata: async function () {
        githubuser = await githubHelper.getData("https://api.github.com/user", "GET");
        if (!githubuser) {
            githubuser = {};
            githubuser.login = "";
        }
    },
    isBugReport: function () {
        $('#githubChooseButtons').addClass('hidden');
        $('#githubIssueCreator').removeClass('hidden');
        $('#githubSystemInformationForRequestFigure').removeClass('hidden');
        $('#isBug').val(true);
        const showInfo = systemInfoForGithub.replace(/(?:\r\n|\r|\n)/g, ", ") + $('#adapterVersionForBug').val();
        $('#githubSystemInformationForRequest').html(showInfo);
        githubHelper.checkSendButton();
    },
    isFeatureRequest: function () {
        $('#githubChooseButtons').addClass('hidden');
        $('#githubIssueCreator').removeClass('hidden');
        $('#isBug').val(false);
        $('#adapterVersionForBug').val('');
        $('#githubSystemInformationForRequestFigure').addClass('hidden');
        githubHelper.checkSendButton();
    },
    backToBasic: function () {
        $('#adapterVersionForBug').val('');
        $('#githubChooseButtons').removeClass('hidden');
        $('#githubIssueCreator').addClass('hidden');
        $('#githubSystemInformationForRequestFigure').addClass('hidden');
        $('#githubErrorList').empty().parent().addClass('hidden');
        $('#openIssueOnGihub').addClass('disabled btn-default').removeClass('btn-info').attr('data-href', '');
        $('#submitGithubIssue').addClass('disabled');
        $('#adapterNameForGithub').addClass('hidden');
        $('#githubCloseButtonText').text(_('Cancel'));
    },
    checkSendButton: function () {
        const title = $('#githubTitle').val();
        const body = githubMarkdownArea.value();
        if (title.length > 0 && body.length > 0) {
            $('#submitGithubIssue').removeClass('disabled');
            if ($('#openIssueOnGihub').hasClass('btn-info')) {
                $('#openIssueOnGihub').addClass('disabled btn-default').removeClass('btn-info').attr('data-href', '');
                $('#githubCloseButtonText').text(_('Cancel'));
            }
        } else {
            $('#submitGithubIssue').addClass('disabled');
        }
    },
    createIssue: function () {
        const issueTitle = $('#githubTitle').val();
        let issueBody = githubMarkdownArea.value();
        const url = $('#issueLinkForGithubApi').val();

        if (issueTitle.length > 0 && issueBody.length > 0 && url.length > 0) {

            const isBug = $('#isBug').val() == "true";

            if (isBug) {
                issueBody += "\r\n\r\n---\r\n\r\n**System data:**\r\n\r\n";
                issueBody += systemInfoForGithub;
                issueBody += $('#adapterVersionForBug').val();
            }

            issueBody += "\r\n\r\n> *created by ioBroker.info*";

            $.ajax({
                url: url,
                type: "POST",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "token " + adapterConfig.github_token);
                },
                error: function (xhr, status, error) {
                    var err = JSON.parse(xhr.responseText);
                    $('#githubErrorList').append($("<li>" + err.message + "</li>"));
                    $('#githubErrorList').parent().removeClass('hidden');
                },
                success: function (issue) {
                    $('#githubTitle').val('');
                    githubMarkdownArea.value('');
                    $('#githubErrorList').parent().addClass('hidden');
                    $('#submitGithubIssue').addClass('disabled');
                    $('#openIssueOnGihub').removeClass('disabled btn-default').addClass('btn-info').attr('data-href', issue['html_url']);
                    $('#githubCloseButtonText').text(_('Close'));
                },
                data: JSON.stringify({
                    title: issueTitle,
                    body: issueBody
                })
            });
        } else {
            if (!issueTitle.length > 0) {
                $('#githubTitle').parent().addClass('has-error');
                $('#githubErrorList').append($("<li>" + _('Title is a required field!') + "</li>"));
                $('#githubTitle').one('focus', function () {
                    $('#githubTitle').parent().removeClass('has-error');
                });
            }
            if (!issueBody.length > 0) {
                $('#githubContent').parent().addClass('has-error');
                $('#githubErrorList').append($("<li>" + _('A description is required!') + "</li>"));
                githubMarkdownArea.codemirror.one('focus', function () {
                    $('#githubContent').parent().removeClass('has-error');
                });
            }
            if (!url.length > 0) {
                $('#githubErrorList').append($("<li>" + _('Something went wrong. Please close the window and open again.') + "</li>"));
            }
            $('#githubErrorList').parent().removeClass('hidden');
        }
    },
    loadAssigned: async function () {
        $('#modal-githublist-title').html(_('Issues assigned to me') + "&nbsp;");

        const issues = await getAllIssues(null, null, githubuser.login, true, true);
        $('#githublistLoader').addClass("hidden");
        if (issues) {
            await writeAllIssuesV4(issues, "githublistbody");
        }
    },
    loadIssues: async function () {
        $('#modal-githublist-title').html(_('My issues list') + "&nbsp;");

        const issues = await getAllIssues(null, null, githubuser.login, false, true);
        $('#githublistLoader').addClass("hidden");
        if (issues) {
            await writeAllIssuesV4(issues, "githublistbody");
        }
    },
    loadWatched: async function () {
        $('#modal-githublist-title').html(_('Watched repositories') + "&nbsp;");
        const watched = await githubHelper.getData("https://api.github.com/user/subscriptions", "GET");
        $('#githublistLoader').addClass("hidden");
        if (watched) {
            await writeAllRepos(watched, "githublistbody");
        }
    },
    loadStarred: async function () {
        $('#modal-githublist-title').html(_('Starred repositories') + "&nbsp;");
        const starred = await githubHelper.getData("https://api.github.com/user/starred", "GET");
        $('#githublistLoader').addClass("hidden");
        if (starred) {
            await writeAllRepos(starred, "githublistbody");
        }
    },
    backToBasicList: async function () {
        $('#modal-githublist-title').empty();
        $('#githublistLoader').removeClass("hidden");
        $('#githublistbody').empty();
    },
    getData: async function (url, methode, body) {
        if (body) {
            body = JSON.stringify(body);
        }
        try {
            return await (await fetch(url, {
                method: methode,
                headers: new Headers({
                    "Authorization": "token " + adapterConfig.github_token,
                    "Accept": "application/vnd.github.squirrel-girl-preview+json"
                }),
                body: body
            })).json();
        } catch (e) {
            return false;
        }
    },
    getDataV4: async function (query) {
        return await (await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json',
                'Authorization': 'bearer ' + adapterConfig.github_token
            }),
            body: JSON.stringify({query: query})
        })).json();
    },
    getQueryForIssues: function (owner, name, login, isAdapterRequest, cursor, search, onlyOpen = true) {
        let query = search ? getIssuesSearchQL : getIssuesDataQL;

        if (search) {
            query = query.replace("$assignee", login);
        } else {
            if(onlyOpen){
                query = query.replace("$states", ', states: OPEN');
            }else{
                query = query.replace("$states", '');
            }
            if (login) {
                query = query.replace("$repoORuser", 'user(login: "' + login + '"){').replace("$reactions", "").replace("$orderby", ", orderBy:{field: CREATED_AT, direction: DESC}");
            } else {
                query = query.replace("$repoORuser", 'repository(owner: "' + owner + '", name: "' + name + '") {');
                if (isAdapterRequest) {
                    query = query.replace("$reactions", "reactions(first: 100) {totalCount viewerHasReacted}").replace("$orderby", "");
                } else {
                    query = query.replace("$reactions", "").replace("$orderby", ", orderBy:{field: CREATED_AT, direction: DESC}");
                }
            }
        }

        if (cursor) {
            query = query.replace("$cursor", ', after: "' + cursor + '"');
        } else {
            query = query.replace("$cursor", "");
        }
        return query;
    },
    getQueryForRepos: function (cursor) {
        let query = getRepoSearchQL;

        if (cursor) {
            query = query.replace("$cursor", ', after: "' + cursor + '"');
        } else {
            query = query.replace("$cursor", "");
        }
        return query;
    },
    setReaction: async function (id) {
        const issueNumber = id.substring(10, id.length);
        const response = await githubHelper.getData("https://api.github.com/repos/ioBroker/AdapterRequests/issues/" + issueNumber + "/reactions", "POST", {'content': '+1'});
        if (response && response.id) {
            $("#" + id).removeClass("btn-default").addClass("btn-success").attr("title", "I voted!");
            let count = parseInt($('#reactionARBadge' + issueNumber).text()) + 1;
            $('#reactionARBadge' + issueNumber).addClass('badge-success').text(count).parent().parent().css("background-color", "#dff0d8");
            $('#reactionARNumber' + issueNumber).text(count);
            sessionStorage.removeItem('ioBroker.info.adapterRequestV4');
        }
    },
    setStarred: async function (id) {
        const idSuffix = id.substring(10, id.length);
        const full_name = $("#" + id).data('fullname');

        const response = await githubHelper.getData("https://api.github.com/user/starred/" + full_name, "PUT");
        if (!response) {
            $("#" + id).removeClass("btn-default").addClass("btn-success").attr('title', _("Thanks for the adapter!"));
            let count = parseInt($('#starsCounter' + idSuffix).text()) + 1;
            $('#starsCounter' + idSuffix).addClass('badge-success').text(count).parent().parent().css("background-color", "#dff0d8");
            sessionStorage.removeItem('ioBroker.info.stargazers');
        }
    },
    loadAllComments: async function (id, issueId) {
        const dataId = id.substring(13, id.length);
        const query = getIssueCommentsQL.replace("$issueID", issueId);

        const comments = await githubHelper.getDataV4(query);
        if (comments && comments.data && comments.data.node) {
            githubHelper.writeComments(dataId, comments.data.node.comments.edges);
        }
    },
    writeComments: function (issueId, comments) {
        comments.forEach(function (commentNode) {
            const comment = commentNode.node;
            const $item = $('#commentsTemplate').children().clone(true, true);
            $item.find('.byline').text(new Date(comment.createdAt).toLocaleDateString('en', dateOptions) + " - " + comment.author.login);

            const link = comment.url.match(/([^/]*\/){6}/);
            const html = new showdown.Converter().makeHtml(comment.body).replace(/src="(?!http)/g, 'src="' + link[0]).replace(/<img/g, '<img class="img-responsive"');
            $item.find('.description').html(html);

            $('#allCommentsDiv' + issueId).append($item);
        });
    }
};

async function writeAllRepos(allRepos, id) {
    await asyncForEach(allRepos, async function (repo) {
        const $item = $('#forumEntryTemplate').children().clone(true, true);
        $item.find('.label-success').remove();

        const full_name = repo.full_name;

        const fullNameId = full_name.replace("/", "ISSUE-ISSUE").replace(".", "ISSUE-PUNKT-ISSUE").toUpperCase();

        $item.find('.titleLink').text(repo.name).attr('href', repo.html_url);
        $item.find('.collapse-link').remove();
        $item.find('.y_title').addClass('spoiler-content').css('padding-left', '20px');
        $item.find('.y_content').remove();

        $('#' + id).append($item);

    });
}

const getIssuesDataQL = `
query{
    $repoORuser
        issues(first: 100$states$cursor$orderby) {
            totalCount
            edges {
                node {
                    id
                    databaseId
                    repository {nameWithOwner}
                    number
                    title
                    body
                    url
                    comments{totalCount}
                    assignees(first: 20) {
                        nodes {
                            avatarUrl
                            login
                        }
                    }
                    labels(first: 20) {
                        nodes {
                            color
                            name
                        }
                    }
                    author {
                        login
                    }
                    state
                    createdAt
                    $reactions
                }
                cursor
            }
            pageInfo {
                endCursor
                hasNextPage
            }
        }
    }
}`;

const getIssuesSearchQL = `
query {
    search(first: 100, type: ISSUE, query: "assignee:$assignee state:open"$cursor) {
        issueCount
        edges {
            node {
                ... on Issue {
                    id
                    databaseId
                    repository {nameWithOwner}
                    number
                    title
                    body
                    url
                    comments{totalCount}
                    assignees(first: 20) {
                        nodes {
                            avatarUrl
                            login
                        }
                    }
                    labels(first: 20) {
                        nodes {
                            color
                            name
                        }
                    }
                    author {
                        login
                    }
                    createdAt
                }
            }
            cursor
        }
        pageInfo {
            hasNextPage
            endCursor
        }
    }
}`;

const getIssueCommentsQL = `
query{
    node(id: "$issueID") {
        ... on Issue {
            comments(first: 100) {
                edges {
                    node {
                        author {
                            login
                        }
                        url
                        body
                        createdAt
                    }
                }
            }
        }
    }
}
`;

const getRepoSearchQL = `
query {
    search(first: 100, type: REPOSITORY, query: "iobroker"$cursor) {
        repositoryCount
        edges {
            node {
            	... on Repository{
                    databaseId
                    nameWithOwner
                    name
                    url
                    owner{login}
                    updatedAt
                    createdAt
                    stargazers{
                        totalCount
                    }
                    viewerHasStarred
                }
            }
            cursor
        }
        pageInfo {
            hasNextPage
            endCursor
        }
    }
}`;