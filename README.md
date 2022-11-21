![Logo](admin/info.png)
# ioBroker.info

[![NPM version](http://img.shields.io/npm/v/iobroker.info.svg)](https://www.npmjs.com/package/iobroker.info)
[![Downloads](https://img.shields.io/npm/dm/iobroker.info.svg)](https://www.npmjs.com/package/iobroker.info)
![Number of Installations](http://iobroker.live/badges/info-installed.svg) 
![Current version in stable repository](http://iobroker.live/badges/info-stable.svg)
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
<!-- ### **WORK IN PROGRESS** -->
### **WORK IN PROGRESS**
* (bluefox) Corrected widget

### 1.9.21 (2022-09-19)
* (simatec) Fix Adapter Title

### 1.9.20 (2022-09-17)
* (simatec) Design Fix
* (simatec) Fix Adapter Title
* (simatec) Update dependencies

### 1.9.19 (2022-03-01)
* (ldittmar) Fix audio, USB, bluetooth and printer view
* (ldittmar) Translations fix

### 1.9.18 (2022-02-01)
* (Apollon77) Fix invalid object definition to prevent errors in js-controller 4

### 1.9.17 (2022-01-26)
* (simatec) Design fix
* (simatec) Update dependencies

## License
The MIT License (MIT)

Copyright (c) 2017 - 2022 ldittmar <iobroker@lmdsoft.de>

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
