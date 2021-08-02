![Logo](admin/info.png)
# ioBroker.info

[![NPM version](http://img.shields.io/npm/v/iobroker.info.svg)](https://www.npmjs.com/package/iobroker.info)
[![Downloads](https://img.shields.io/npm/dm/iobroker.info.svg)](https://www.npmjs.com/package/iobroker.info)
![Number of Installations](http://iobroker.live/badges/info-installed.svg) 
![Number of Installations](http://iobroker.live/badges/info-stable.svg)
[![Dependency Status](https://img.shields.io/david/iobroker-community-adapters/iobroker.info.svg)](https://david-dm.org/iobroker-community-adapters/iobroker.info)

[![NPM](https://nodei.co/npm/iobroker.info.png?downloads=true)](https://nodei.co/npm/iobroker.info/)

**Tests:** ![Test and Release](https://github.com/iobroker-community-adapters/ioBroker.info/workflows/Test%20and%20Release/badge.svg)

## Information adapter for ioBroker
This is an ioBroker adapter to get information about your system and some news about ioBroker.

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** 
For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

## Information

### Forum and News
If you reach your admin window over a hostname (for example, http://myhouseiscontrolledbyioBroker:8081), 
the news and forum entries will not be automatically displayed. 
To do this, you must first register your host name [here](https://toolkit.sekando.com/docs/en/setup/hostnames).
After that just enter the API Key in the configuration of the adapter.

### Popup Messages (VIS Widget)
There is a new widget to display important messages in VIS. 
These messages are displayed ONLY if certain conditions are met. 
Either from date x to date y or even if you have a specific adapter installed.
If nothing is displayed then everything is ok.

### System information
Many thanks to `sebhildebrandt` for the great work on the package [systeminformation](https://github.com/sebhildebrandt/systeminformation), 
because without his work, we would not have all the great information about the system.

### Detailed information

* [Click here for the detailed documentation (en)](docs/en/info.md)
* [Klicken Sie hier für die ausführliche Dokumentation (de)](docs/de/info.md)
* [Нажмите здесь для подробной документации (ru)](docs/ru/info.md)
* [Clique aqui para a documentação detalhada (pt)](docs/pt/info.md)
* [Klik hier voor de gedetailleerde documentatie (nl)](docs/nl/info.md)
* [Cliquez ici pour la documentation détaillée (fr)](docs/fr/info.md)
* [Clicca qui per la documentazione dettagliata (it)](docs/it/info.md)
* [Haga clic aquí para la documentación detallada (es)](docs/es/info.md)
* [Kliknij tutaj, aby uzyskać szczegółową dokumentację (pl)](docs/pl/info.md)
* [单击此处获取详细文档 (zh-cn)](docs/zh-cn/info.md)

## Changelog
<!-- ### __WORK IN PROGRESS__ -->

### 1.9.8 (2021-08-02)
* Adjust object types to prevent js-controller 3.3 warnings

### 1.9.7 (2021-07-27)
* (bluefox) updated the clock background 

### 1.9.6 (2021-07-26)
* (simatec) Design fix

### 1.9.5 (2021-07-25)
* (simatec) Design Fix

### 1.9.4 (2021-07-24)
* Ready for Admin 5

### 1.9.2 (2021-07-22)
* Fix too high load because of wrong parsing of settings

### 1.9.1 (2021-07-21)
* Adjust object types to prevent js-controller 3.3 warnings
* Disable all data collection by default  -  users can activate whatever they really need

### 1.9.0 (2021-07-20)
* Breaking changes: Some systemdata objects have new names and corrected types and content! You might need to adjust scripts and visualizations!
* (ldittmar81) Added Wifi, Docker, USB, Printer, Bluetooth and Audio infos
* (Apollon77) Optimize for js-controller 3.3

### 1.7.15 (2021-01-13)
* (Apollon77) fix crash case (Sentry IOBROKER-INFO-1X)

### 1.7.14 (2020-12-27)
* (Apollon77) fix crash case (Sentry IOBROKER-INFO-1R)

### 1.7.13 (2020-12-24)
* (Apollon77) fix crash case (Sentry IOBROKER-INFO-A)

### 1.7.12 (2020-12-02)
* (Apollon77) fix crash case (Sentry IOBROKER-INFO-1G)

### 1.7.11 (2020-11-30)
* (Apollon77) fix crash case (Sentry IOBROKER-INFO-1F)
* Add Weblate translations

### 1.7.10 (2020-11-09)
* (Apollon77) fix crash case (Sentry IOBROKER-INFO-13)

### 1.7.9 (2020-11-01)
* (bluefox) Corrected socket.io in widget

### 1.7.8 (2020-09-17)
* (bluefox) Fixed words.js in widget

### 1.7.7 (2020-07-25)
* (Apollon77) Prevented a crash case (Sentry IOBROKER-INFO-K)

### 1.7.6 (2020-07-14)
* (Apollon77) Update systeminformation and other deps
* (Apollon77) Check for axios existance and exit adapter if not existing to prevent crashes (Sentry IOBROKER-INFO-C)
* (ldittmar) UUID Hash with SHA256

### 1.7.5 (2020-06-08)
* (ldittmar) Check UUID for messages
* (ldittmar) New field for test messages

### 1.7.4 (2020-06-01)
* (Apollon77) Update systeminformation and other deps
* (ldittmar) Added full S.M.A.R.T data. To be able to detect S.M.A.R.T. status on Linux you need to install smartmontools >= 7.0

### 1.7.2 (2020-05-07)
* (ldittmar) Update systeminformation library
* (ldittmar) Messages can be hidden
* (ldittmar) Show subnet mask for ip4 and ip6 

### 1.7.1 (2020-04-29)
* (ldittmar) Update systeminformation library
* (ldittmar) Check instance active for messages

### 1.7.0 (2020-04-16)
* (Apollon77) IMPORTANT: Supported version minimum nodejs 10
* (Apollon77) add Sentry error reporting and update dependencies
* (Apollon77) remove usage of objects directly to prevent js-controller 3.0 warnings
* (Apollon77) update dependencies
* (Apollon77) fix some crashes
* (Apollon77) fix compact mode

### 1.6.0 (2020-04-08)
* (SchumyHa) update Chinese bbs rss url
* (ldittmar) Tabs were added to config
* (ldittmar) Update translations
* (bluefox) Widget corrected in edit mode

### 1.5.7 (2019-11-12)
* (ldittmar) add event vis widget

### 1.5.6 (2019-11-05)
* (ldittmar) Add Repo check for popup
* (ldittmar) Fix dp type

### 1.5.5 (2019-10-12)
* (ldittmar) Add NPM and OS check for popup

### 1.5.4 (2019-09-25)
* (ldittmar) add event calendar

### 1.5.2 (2019-09-24)
* (ldittmar) show comments for adapter requests
* (ldittmar) show closed adapter requests
* (ldittmar) check node version for messages

### 1.4.3 (2019-09-09)
* (ldittmar) change systeminformation call interval
* (ThomasBahn) News problem fixed
* (ldittmar) Update systeminformation library
* (badenbaden) Fixed russian spelling 

### 1.4.1 (2019-08-01)
* (bluefox) Removed default socket.io

### 1.3.7 (2019-04-17)
* (ldittmar) better integration to admin adapter

### 1.3.5 (2019-04-12)
* (ldittmar) add likes for Adapters
* (ldittmar) show comments for issues

### 1.3.4 (2019-04-10)
* (ldittmar) my issues and my repos
* (ldittmar) change Github API V3 to API V4
* (ldittmar) vote for adapter requests

### 1.3.2 (2019-04-06)
* (SchumyHao) Update Chinese translation
* (ldittmar) create Github issues
* (ldittmar) create new adapter requests

### 1.3.1 (2019-04-03)
* (ldittmar) charts for cpu and memory
* (ldittmar) filtered news object added

### 1.3.0 (2019-03-29)
* (ldittmar) better system information
* (ldittmar) documentation in all languages
* (ldittmar) some fixes

### 1.2.7 (2019-03-17)
* (ldittmar) little fixes
* (ldittmar) unknown adapters search new design
* (ldittmar) better design for PC monitor
* (ldittmar) unknown adapters show more information
* (ldittmar) stable version

### 1.2.5 (2019-03-14)
* (ldittmar) show adapter requests
* (ldittmar) show bugs and issues
* (ldittmar) display important links
* (ldittmar) show important popup news
* (ldittmar) vis widget for popup news

### 1.1.3 (2019-01-03)
* (ldittmar) compact mode compatibility added
* (ldittmar) add chinese support
* (ldittmar) add new forum support
* (ldittmar) add chinese forum support
* (ldittmar) move to iobroker-community-adapters

### 1.0.2 (2018-11-30)
* (ldittmar) fixed problems with Node version info in multi-host system

### 1.0.1 (2018-11-27)
* (ldittmar) search for new adapters on Github
* (ldittmar) check for Node.js update
* (ldittmar) https problems with news and forum data solved
* (ldittmar) polish added as language

### 1.0.0 (2018-11-25)
* (ldittmar) full compatibility to Admin 3.x
* (ldittmar) clock can be disabled

### 0.1.0 (2018-01-02)
* (ldittmar) compatibility to Admin 3.x / beta release

### 0.0.6 (2017-12-11)
* (ldittmar) some fixes / install and update implemented

### 0.0.4 (2017-12-08)
* (ldittmar) some fixes and design correction
* (ldittmar) show information about adapters (update/new)
* (ldittmar) show system information

### 0.0.1 (2017-11-23)
* (ldittmar) initial commit

## License
The MIT License (MIT)

Copyright (c) 2017 - 2021 ldittmar <iobroker@lmdsoft.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
