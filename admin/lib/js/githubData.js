/* global systemInfoForGithub, adapterConfig, githubMarkdownArea */

const githubHelper = {
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

            const isBug = $('#isBug').val();

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
    }
};

