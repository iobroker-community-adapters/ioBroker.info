/* global socket, systemLang, io, systemInformationData, ignoredNews */

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
        if (smaller === undefined || bigger === undefined) {
            return false;
        }
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
        return inst === vers1 || inst === vers2 || (newsPopup.checkVersion(vers1, inst) && newsPopup.checkVersion(inst, vers2));
    },
    showPopup: async function (obj, id, dummy) {
        let messages;
        if (window.top.gMain) {
            messages = await newsPopup.checkMessages(obj);
            if (messages.length > 0) {
                await asyncForEach(messages, async function (message) {
                    newsPopup.showDiv(message.id, message.title, message.content, message.class, message.icon, id, message.id + message.created);
                });
            }
        } else {
            messages = await newsPopup.getAdaptersAndcheckMessages(obj, id, dummy);
        }
    },
    checkConditions: function (condition, installedVersion) {
        if (condition.startsWith("equals")) {
            const vers = condition.substring(7, condition.length - 1).trim();
            return (installedVersion === vers);
        } else if (condition.startsWith("bigger")) {
            const vers = condition.substring(7, condition.length - 1).trim();
            return newsPopup.checkVersion(vers, installedVersion);
        } else if (condition.startsWith("smaller")) {
            const vers = condition.substring(8, condition.length - 1).trim();
            return newsPopup.checkVersion(installedVersion, vers);
        } else if (condition.startsWith("between")) {
            const vers1 = condition.substring(8, condition.indexOf(',')).trim();
            const vers2 = condition.substring(condition.indexOf(',') + 1, condition.length - 1).trim();
            return newsPopup.checkVersionBetween(installedVersion, vers1, vers2);
        } else {
            return true;
        }
    },
    checkActive: function (adapterName) {
        const instances = window.top.gMain.instances;
        if (!instances) {
            return false;
        }
        const instCreated = instances.filter(function (str) {
            return str.includes("." + adapterName + ".");
        });
        if (instCreated.length === 0) {
            return false;
        }
        let i;
        for (i = 0; i < instCreated.length; i++) {
            if (window.top.gMain.objects[instCreated[i]].common.enabled) {
                return true;
            }
        }
        return false;
    },
    checkMessages: async function (obj, instAdapters) {
        const messagesToShow = [];
        try {
            const messages = JSON.parse(obj);
            const today = new Date().getTime();
            if (messages.length > 0) {
                await asyncForEach(messages, async function (message) {
                    let showIt = true;
                    const uniqueId = message.id + message.created;
                    if (Array.isArray(ignoredNews)) {
                        showIt = !ignoredNews.includes(uniqueId);
                    }

                    if (showIt && message['date-start'] && new Date(message['date-start']).getTime() > today) {
                        showIt = false;
                    } else if (showIt && message['date-end'] && new Date(message['date-end']).getTime() < today) {
                        showIt = false;
                    } else if (showIt && message.conditions && Object.keys(message.conditions).length > 0) {
                        let adapters;
                        if (instAdapters) {
                            adapters = instAdapters;
                        } else {
                            adapters = window.top.gMain.tabs.adapters.curInstalled;
                        }
                        await asyncForEach(Object.keys(message.conditions), function (key) {
                            if (showIt) {
                                const adapter = adapters[key];
                                const condition = message.conditions[key];

                                if (!adapter && condition !== "!installed") {
                                    showIt = false;
                                } else if (adapter && condition === "!installed") {
                                    showIt = false;
                                } else if (adapter && condition === "active") {
                                    showIt = newsPopup.checkActive(key);
                                } else if (adapter && condition === "!active") {
                                    showIt = !newsPopup.checkActive(key);
                                } else if (adapter) {
                                    showIt = newsPopup.checkConditions(condition, adapter.version);
                                }
                            }
                        });
                    }

                    if (showIt && message['node-version']) {
                        showIt = systemInformationData.node && newsPopup.checkConditions(message['node-version'], systemInformationData.node);
                    }
                    if (showIt && message['npm-version']) {
                        showIt = systemInformationData.npm && newsPopup.checkConditions(message['npm-version'], systemInformationData.npm);
                    }
                    if (showIt && message['os']) {
                        showIt = systemInformationData.os && systemInformationData.os === message['os'];
                    }
                    if (showIt && message['repo'] && window.top.gMain) {
                        showIt = window.top.gMain.systemConfig.common.activeRepo === message['repo'];
                    }
                    if (showIt && message['uuid']) {
                        if (Array.isArray(message['uuid'])) {
                            let oneMustBe = false;
                            if(systemInformationData.uuid){
                                await asyncForEach(message['uuid'], function(uuid){
                                    if (!oneMustBe) {
                                        oneMustBe = systemInformationData.uuid === uuid;
                                    }
                                });
                            }
                            showIt = oneMustBe;
                        } else {
                            showIt = systemInformationData.uuid && systemInformationData.uuid === message['uuid'];
                        }
                    }

                    if (showIt) {
                        messagesToShow.push({"id": message.id, "title": message.title[systemLang], "content": message.content[systemLang], "class": message.class, "icon": message['fa-icon'], "created": message.created});
                    }
                });
            }

            socket.emit('setState', 'info.0.newsfeed_filtered', {val: JSON.stringify(messagesToShow), ack: true});

        } catch (err) {
        }

        return messagesToShow;
    },
    showDiv: function (id, title, content, type, icon, appendId, uniqueId) {
        const types = ["info", "success", "warning", "danger"];
        let ignored = false;
        if (Array.isArray(ignoredNews)) {
            ignored = ignoredNews.includes(uniqueId);
        }
        if (id && $("#popupnewsid_" + id).length === 0 && !ignored) {
            const $item = $('#popupNewsTemplate').children().clone(true, true);
            $item.find('.popupnews_title').text(title).attr('id', "popupnewsid_" + id);
            $item.find('.popupnews_content').html(content);
            if (type && type !== 'info' && types.indexOf(type) > -1) {
                $item.find('.alert').removeClass('alert-info').addClass('alert-' + type);
            }
            if (icon && icon !== 'exclamation-triangle') {
                $item.find('.fa').removeClass('fa-exclamation-triangle').addClass('fa-' + icon);
            }
            if (uniqueId) {
                $item.find('.popupnewsneveragain').attr('data-id', uniqueId);
            } else {
                $item.find('.popupnewsneveragain').remove();
            }
            $('#' + (appendId ? appendId : "popupnews")).append($item);
        }
    },
    getAdaptersAndcheckMessages: function (obj, toSetId, dummy) {
        socket.emit('getObjectView', 'system', 'host', {startkey: 'system.host.', endkey: 'system.host.\u9999'}, function (err, res) {
            if (!err && res) {
                const hosts = [];
                for (let i = 0; i < res.rows.length; i++) {
                    hosts.push(res.rows[i].id.substring('system.host.'.length));
                }
                const mainHost = res.rows[0].id.substring('system.host.'.length);
                socket.emit('sendToHost', mainHost, 'getInstalled', null, async function (_installed) {
                    if (_installed === 'permissionError') {
                        console.error('May not read "getInstalled"');
                        _installed = {};
                    }

                    const curInstalled = _installed || {};
                    const messages = await newsPopup.checkMessages(obj, curInstalled);
                    if (messages.length > 0) {
                        await asyncForEach(messages, async function (message) {
                            newsPopup.showDiv(message.id, message.title, message.content, message.class, 'exclamation-triangle', toSetId, message.id + message.created);
                        });
                    } else if (dummy) {
                        newsPopup.showDiv("TestID", "Nothing to show (DUMMY)", "<p>These are the voyages of the Starship Enterprise. Its continuing mission, to explore strange new worlds, to seek out new life and new civilizations, to boldly go where no one has gone before. We need to neutralize the homing signal. Each unit has total environmental control, gravity, temperature, atmosphere, light, in a protective field. Sensors show energy readings in your area. We had a forced chamber explosion in the resonator coil. Field strength has increased by 3,000 percent.</p>", "danger", 'exclamation-triangle', toSetId);
                        newsPopup.showDiv("TestID2", "Nothing to show (DUMMY 2)", "<p>We're acquainted with the wormhole phenomenon, but this... Is a remarkable piece of bio-electronic engineering by which I see much of the EM spectrum ranging from heat and infrared through radio waves, et cetera, and forgive me if I've said and listened to this a thousand times. This planet's interior heat provides an abundance of geothermal energy. We need to neutralize the homing signal.</p>", "success", 'exclamation-triangle', toSetId);
                    }
                });
            }
        });
    }
};