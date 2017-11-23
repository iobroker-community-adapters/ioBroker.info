$(function () {

    $(document.body).on('click', '.x_panel .x_title', function () {
        var $BOX_PANEL = $(this).closest('.x_panel'),
                $ICON = $(this).find('i'),
                $BOX_CONTENT = $BOX_PANEL.find('.x_content');
        // fix for some div with hardcoded fix class
        if ($BOX_PANEL.attr('style')) {
            $BOX_CONTENT.slideToggle(200, function () {
                $BOX_PANEL.removeAttr('style');
            });
        } else {
            $BOX_CONTENT.slideToggle(200);
            $BOX_PANEL.css('height', 'auto');
        }

        $ICON.toggleClass('fa-chevron-up fa-chevron-down');
    });
    $('.close-link').click(function () {
        var $BOX_PANEL = $(this).closest('.x_panel');
        $BOX_PANEL.remove();
    });

    function requestCrossDomain(site, callback) {
        if (!site) {
            alert('No site was passed.');
            return false;
        }

        var yql = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="' + site + '"') + '&format=xml&callback=?';

        $.getJSON(yql, cbFunc);

        function cbFunc(data) {
            if (data.results[0]) {
                if (typeof callback === 'function') {
                    callback(data);
                }
            } else {
                throw new Error('Nothing returned from getJSON.');
            }
        }
    }
    
    var getForumData = function (data) {
        if (data.results && data.results[0]) {
            var $forumContent = $($.parseXML(data.results[0]));

            $('#forumTitle').text($forumContent.find('title:first').text());
            $('#forumTime').text($forumContent.find('updated:first').text());
            $('#forum-link').attr("href", $forumContent.find('link:nth-of-type(2)').attr('href'));

            $('#forumList').empty();
            $('entry', $forumContent).each(function () {
                var $item = $('#forumEntryTemplate').children().clone(true, true);
                $item.find('.forumClass').text($(this).find('category').eq(0).attr('label').replace('ioBroker ', ''));
                $item.find('.titleLink').text($(this).find('title').eq(0).text())
                        .attr('href', $(this).find('link').eq(0).attr('href'));
                $item.find('.description').html($(this).find('content').eq(0).text());
                $item.find('.postimage').addClass('img-responsive');
                $item.find('.description a').attr('target', '_blank');
                $item.find('.byline').text(new Date($(this).find('updated').eq(0).text()) + " - " + $(this).find('name').eq(0).text());
                $('#forumList').prepend($item);
            });
        }
    };

    // Clock
    var secInterval, hourInterval, minInterval, isClockOn = false;

    function startClock() {
        isClockOn = true;
        secInterval = setInterval(function () {
            var seconds = new Date().getSeconds();
            var sdegree = seconds * 6;
            var srotate = "rotate(" + sdegree + "deg)";

            $("#cssSec").css({"-moz-transform": srotate, "-webkit-transform": srotate});

        }, 1000);


        hourInterval = setInterval(function () {
            var hours = new Date().getHours();
            if (hours === 0) {
                getActualDate();
            }
            var mins = new Date().getMinutes();
            var hdegree = hours * 30 + (mins / 2);
            var hrotate = "rotate(" + hdegree + "deg)";

            $("#cssHour").css({"-moz-transform": hrotate, "-webkit-transform": hrotate});

        }, 1000);


        minInterval = setInterval(function () {
            var mins = new Date().getMinutes();
            var mdegree = mins * 6;
            var mrotate = "rotate(" + mdegree + "deg)";

            $("#cssMin").css({"-moz-transform": mrotate, "-webkit-transform": mrotate});

        }, 1000);

        getActualDate();
  }

    function getActualDate() {
        var MONTH = [
            'january',
            'february',
            'march',
            'april',
            'may',
            'june',
            'july',
            'august',
            'september',
            'october',
            'november',
            'december'
        ];
        var DOW = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday'
        ];
        var date = new Date();
        $('#date_now').text(date.getDate() + '. ' + MONTH[date.getMonth()] + ' ' + date.getFullYear());
        $('#weekday_now').text(DOW[date.getDay()]);
    }

    function stopClock() {
        isClockOn = false;
        clearInterval(secInterval);
        clearInterval(hourInterval);
        clearInterval(minInterval);
        $(window).off('resize');
    }

    // / Clock
    
    requestCrossDomain('http://forum.iobroker.net/feed.php?mode=topics', getForumData);
    startClock();

});