/* global formatGoogleCalendar */

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
    format: ['*date*', ': ', '*summary*', ' — ', '*description*', ' in ', '*location*'],
    timeMin: '2019-09-03T10:00:00-07:00',
    timeMax: '2021-06-03T10:00:00-07:00'
});