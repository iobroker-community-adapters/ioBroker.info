/* global formatGoogleCalendar */

$(function () {
    formatGoogleCalendar.init({
        calendarUrl: 'https://www.googleapis.com/calendar/v3/calendars/mh14bh7m2bdva7pb7tkirsbcsg@group.calendar.google.com/events?key=AIzaSyA4GWhsN21aMARuc6uyl45zdq8Ue5dJu10',
        past: false,
        upcoming: true,
        sameDayTimes: true,
        dayNames: false,
        pastTopN: 0,
        upcomingTopN: 3,
        itemsTagName: 'li',
        upcomingSelector: '#events-upcoming',
        pastSelector: '#events-past',
        recurringEvents: true,
        upcomingHeading: '<h4>' + _('Upcoming events') + '</h4>',
        pastHeading: '<h4>' + _('Past events') + '</h4>',
        format: ['<div class="block"><div class="block_content"><div class="y_title spoiler-content" style="padding-left: 20px;"><ul class="nav navbar-right panel_toolbox"><li><a class="collapse-link"><i class="fa fa-chevron-down"></i></a></li></ul><span>', '*date*', ': ', '*summary*', '</span></div><div class="y_content spoiler-content" style="display: none;"><p class="description">', '*description*', ' in ', '*location*', '</p></div></div></div>'],
        timeMin: '2019-09-03T10:00:00-07:00',
        timeMax: '2021-06-03T10:00:00-07:00'
    });
});