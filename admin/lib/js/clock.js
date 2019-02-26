/* global systemLang */

function startClock(key) {
    let secInterval, hourInterval, minInterval, isClockOn = false;

    function start() {
        isClockOn = true;
        secInterval = setInterval(function () {
            const seconds = new Date().getSeconds();
            const sdegree = seconds * 6;
            const srotate = "rotate(" + sdegree + "deg)";

            $("#cssSec").css({"-moz-transform": srotate, "-webkit-transform": srotate});

        }, 1000);


        hourInterval = setInterval(function () {
            const hours = new Date().getHours();
            if (hours === 0) {
                getActualDate();
            }
            const mins = new Date().getMinutes();
            const hdegree = hours * 30 + (mins / 2);
            const hrotate = "rotate(" + hdegree + "deg)";

            $("#cssHour").css({"-moz-transform": hrotate, "-webkit-transform": hrotate});

        }, 1000);


        minInterval = setInterval(function () {
            const mins = new Date().getMinutes();
            const mdegree = mins * 6;
            const mrotate = "rotate(" + mdegree + "deg)";

            $("#cssMin").css({"-moz-transform": mrotate, "-webkit-transform": mrotate});

        }, 1000);

        getActualDate();
    }

    function getActualDate() {
        const date = new Date();
        $('#date_now').text(date.toLocaleString(systemLang, {"year": "numeric", "month": "long", "day": "2-digit"}));
        $('#weekday_now').text(date.toLocaleString(systemLang, {weekday: "long"}));
    }

    function stop() {
        isClockOn = false;
        clearInterval(secInterval);
        clearInterval(hourInterval);
        clearInterval(minInterval);
        $(window).off('resize');
    }

    if ("start" === key) {
        start();
    } else if ("stop" === key) {
        stop();
    }
}