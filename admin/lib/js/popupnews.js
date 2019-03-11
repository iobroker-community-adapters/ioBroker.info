/* global socket, systemLang */

function startPopupNews() {
    window.top.gMain.subscribeStates('info.0.newsfeed');

    window.top.gMain.socket.on('stateChange', function (id, obj) {
        if (id === "info.0.newsfeed") {

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
                    return inst === vers1 || inst === vers2 || (this.checkVersion(vers1, inst) && this.checkVersion(inst, vers2));
                },
                showPopup: async function (obj) {
                    try {
                        const messages = JSON.parse(obj);
                        const today = new Date();
                        const adapters = window.top.gMain.tabs.adapters.curInstalled;
                        if (messages.length > 0) {
                            await asyncForEach(messages, async function (message) {
                                let showIt = true;
                                if (showIt && message['date-start'] && new Date(message['date-start']) > today) {
                                    showIt = false;
                                } else if (showIt && message['date-end'] && new Date(message['date-end']) < today) {
                                    showIt = false;
                                } else if (showIt && message.conditions && Object.keys(message.conditions).length > 0) {
                                    const adapters = window.top.gMain.tabs.adapters.curInstalled;
                                    await asyncForEach(Object.keys(message.conditions), function (key) {
                                        const adapter = adapters[key];
                                        const condition = message.conditions[key];
                                        if (!adapter && condition === "installed") {
                                            showIt = false;
                                        } else if (adapter && condition === "!installed") {
                                            showIt = false;
                                        } else if (adapter && condition.startsWith("equals")) {
                                            const vers = condition.substring(7, condition.length() - 1).trim();
                                            showIt = (adapter.version === vers);
                                        } else if (adapter && condition.startsWith("bigger")) {
                                            const vers = condition.substring(7, condition.length() - 1).trim();
                                            showIt = this.checkVersion(adapter.version, vers);
                                        } else if (adapter && condition.startsWith("smaller")) {
                                            const vers = condition.substring(8, condition.length() - 1).trim();
                                            showIt = this.checkVersion(vers, adapter.version);
                                        } else if (adapter && condition.startsWith("between")) {
                                            const vers1 = condition.substring(8, condition.indexOf(',')).trim();
                                            const vers2 = condition.substring(condition.indexOf(',') + 1, condition.length() - 1).trim();
                                            showIt = this.checkVersionBetween(adapter.version, vers1, vers2);
                                        }

                                    });
                                }

                                if (showIt) {
                                    window.top.gMain.showMessage(message.title[systemLang], message.content[systemLang], 'info');
                                }
                            });

                            window.top.gMain.socket.emit('setState', 'info.0.popupReaded', {val: true, ack: true});
                        }
                    } catch (err) {

                    }
                }

            };

            newsPopup.showPopup(obj.val);
        }
    });
}