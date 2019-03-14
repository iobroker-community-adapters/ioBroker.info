/* global socket, systemLang */

function startPopupNews() {
    socket.emit('subscribe', 'info.0.newsfeed');

    socket.on('stateChange', function (id, obj) {
        if (id === "info.0.newsfeed") {
            newsPopup.showPopup(obj.val);
        }
    });

    function loadPopup() {
        socket.emit('getState', 'info.0.newsfeed', function (err, data) {
            if (!err && data) {
                newsPopup.showPopup(data.val);
            }
        });
    }

    loadPopup();
}

const newsPopup = {
    checkVersion: function (smaller, bigger) {
        smaller = smaller.split('.');
        bigger = bigger.split('.');
        smaller[0] = parseInt(smaller[0], 10);
        bigger[0] = parseInt(bigger[0], 10);

        if (smaller[0] > bigger[0]) {
            return false;
        } else if (smaller[0] === bigger[0]) {
            smaller[1] = parseInt(smaller[1], 10);
            bigger[1] = parseInt(bigger[1], 10);
            if (smaller[1] > bigger[1]) {
                return false;
            } else if (smaller[1] === bigger[1]) {
                smaller[2] = parseInt(smaller[2], 10);
                bigger[2] = parseInt(bigger[2], 10);
                return (smaller[2] < bigger[2]);
            } else {
                return true;
            }
        } else {
            return true;
        }
    },
    checkVersionBetween: function (inst, vers1, vers2) {
        return inst === vers1 || inst === vers2 || (newsPopup.checkVersion(inst, vers1) && newsPopup.checkVersion(vers2, inst));
    },
    showPopup: async function (obj) {
        const messages = await newsPopup.checkMessages(obj);
        if (messages.length > 0) {
            await asyncForEach(messages, async function (message) {
                if (parent.window.location.hash === "#tab-info") {
                    newsPopup.showDiv(message.id, message.title, message.content, message.class, message.icon);
                }
            });
        }
    },
    checkMessages: async function (obj) {
        const messagesToShow = [];
        try {
            const messages = JSON.parse(obj);
            const today = new Date().getTime();
            const adapters = window.top.gMain.tabs.adapters.curInstalled;
            if (messages.length > 0) {
                await asyncForEach(messages, async function (message) {
                    let showIt = true;
                    if (showIt && message['date-start'] && new Date(message['date-start']).getTime() > today) {
                        showIt = false;
                    } else if (showIt && message['date-end'] && new Date(message['date-end']).getTime() < today) {
                        showIt = false;
                    } else if (showIt && message.conditions && Object.keys(message.conditions).length > 0) {
                        const adapters = window.top.gMain.tabs.adapters.curInstalled;
                        await asyncForEach(Object.keys(message.conditions), function (key) {
                            const adapter = adapters[key];
                            const condition = message.conditions[key];
                            if (!adapter && condition !== "!installed") {
                                showIt = false;
                            } else if (adapter && condition === "!installed") {
                                showIt = false;
                            } else if (adapter && condition.startsWith("equals")) {
                                const vers = condition.substring(7, condition.length - 1).trim();
                                showIt = (adapter.version === vers);
                            } else if (adapter && condition.startsWith("bigger")) {
                                const vers = condition.substring(7, condition.length - 1).trim();
                                showIt = newsPopup.checkVersion(vers, adapter.version);
                            } else if (adapter && condition.startsWith("smaller")) {
                                const vers = condition.substring(8, condition.length - 1).trim();
                                showIt = newsPopup.checkVersion(adapter.version, vers);
                            } else if (adapter && condition.startsWith("between")) {
                                const vers1 = condition.substring(8, condition.indexOf(',')).trim();
                                const vers2 = condition.substring(condition.indexOf(',') + 1, condition.length() - 1).trim();
                                showIt = newsPopup.checkVersionBetween(adapter.version, vers1, vers2);
                            }
                        });
                    }

                    if (showIt) {
                        messagesToShow.push({"id": message.id, "title": message.title[systemLang], "content": message.content[systemLang], "class": message.class, "icon": message['fa-icon']});
                    }
                });
            }
        } catch (err) {

        }
        return messagesToShow;
    },
    showDiv: function (id, title, content, type, icon, appendId) {
        const types = ["info", "success", "warning", "danger"];
        if (id && $("#popupnewsid_" + id).length === 0) {
            const $item = $('#popupNewsTemplate').children().clone(true, true);
            $item.find('.popupnews_title').text(title).attr('id', "popupnewsid_" + id);
            $item.find('.popupnews_content').html(content);
            if (type && type !== 'info' && types.indexOf(type) > -1) {
                $item.find('.alert').removeClass('alert-info').addClass('alert-' + type);
            }
            if (icon && icon !== 'fa-exclamation-triangle') {
                $item.find('.fa').removeClass('fa-exclamation-triangle').addClass('fa-' + icon);
            }
            $('#' + (appendId ? appendId : "popupnews")).append($item);
        }
    },
    showVisPopup: async function (obj, id) {
        const messages = await newsPopup.checkMessages(obj);
        if (messages.length > 0) {
            await asyncForEach(messages, async function (message) {
                newsPopup.showDiv(message.id, message.title, message.content, message.class, message.icon, id);
            });
        }
    }
};