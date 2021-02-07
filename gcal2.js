///<reference path='shared.js'/>
/* global chrome */
var pendingFormat = '';
// var added = false;
var calendarSettings = {};
var _allFormats;

var possibleParents = [
    'mbihjpcmockmpboapkcbppjkmjfajlfl', // Glen dev 1
    'egekinjjpolponbbfjimifpgfdmphomp', // published
    'oaehhoopdplfmlpeiedkiobifpchilef' // Glen dev 2
];
var parentExtId = '';

var badiTriggers = [];

var startBadiTimer = null;
var refreshCount = 0;
var lastLayout = null;
var lastElement = null;

// v2 classes - manually determined. Could dynamically update if needed.
var calClass = {
    week: '.QIadxc',
    monthDay: '.t8qpF',
    monthTitle: '.rSoRzd',
    triggerElement: '.rSoRzd',
    pageTitle: '.KaL5Wc',
    monthDayTarget: '.zYZlv', //'.cKWEWe', // 'empty' element for us to fill
    // notInMonth: 'YK7obe' // no . at front
};

/*
 * Warning...
 * 
 * This code is very specific to the 'normal' English Google calendar layout and formats!
 * It has to read the screen and try to determine which dates are being displayed.
 * 
 */

function fillCalendar(watchedDomElement, layout) {
    if (!watchedDomElement) {
        return;
    }
    console.log('adding Badi info', layout, watchedDomElement);
    // debugger;

    // console.log(JSON.stringify(calendarSettings));
    // calendarSettings = calendarDefaults();
    // console.log(JSON.stringify(calendarSettings));

    //var hash = location.hash;
    //var parts = hash.split(/%7C|,|-/g);
    var calVersion = 'V2'; //  layout.slice(-2) === 'V2' ? 'V2' : 'V1';

    var config = {
        logDetails: false,
        layout: layout, // parts.length > 1 ? parts[1] : calendarSettings.defaultCalMode,
        daySelector: '',
        dayRegEx: null,
        contextDateSelector: calVersion === 'V2' ? calClass.pageTitle : '.date-top',
        // contextDateFormat: '',
        hostSelector: '',
        wrapIn: '',
        showNextDayToo: false,
        inEditPage: false,
        calVersion: calVersion,
        classes: ''
    };

    var el = $(watchedDomElement); // may be null
    let popupType =
        el.hasClass('neb-date') ? 'view1' :
        el.hasClass('period-tile') ? 'new' :
        el.hasClass('datetime-container') ? 'view2' :
        '';

    if (popupType) {
        config.layout = 'popup';

    } else {
        if (config.layout === 'eid' && el.hasClass('mv-event-container')) {
            config.layout = 'month';
            // } else if(el.hasClass('tNDBE')){
            //   config.layout = 'monthV2'; // V2
        }
    }

    // console.log(config.layout + ', ' + watchedDomElement.className);
    // debugger;

    switch (config.layout) {
        case 'week':
            config.daySelector = '.wk-dayname span';
            // config.contextDateFormat = 'D - - MMM YYYY;MMM D - - YYYY'; // byFieldOrderInSettings('MMM D - -, YYYY', 'D - - MMM YYYY;MMM D - - YYYY', 'MMM D - -, YYYY'); //Sep 4 – 10, 2016
            config.dayRegEx = byFieldOrderInSettings(/.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/); // Tue 9/13
            break;

        case 'month':
        case 'multiweek':
            config.daySelector = '.st-dtitle span';
            // config.contextDateFormat = 'D - - MMM YYYY;MMM D - - YYYY;MMM D - - - YYYY;MMMM YYYY';// byFieldOrderInSettings('MMM D - - YYYY;MMM D - - - YYYY;D - - MMM YYYY;MMMM YYYY', 'D - - MMM YYYY;MMM D - - YYYY;MMM D - - - YYYY;MMMM YYYY', 'MMM D - - YYYY;MMM D - - - YYYY;D - - MMM YYYY;MMMM YYYY');
            config.dayRegEx = byFieldOrderInSettings(/(\w+ )?(\d+)/, /(\w+ )?(\d+)/, /(\w+ )?(\d+)/); // Sep 1  or  5
            break;

        case 'monthV2':
            config.daySelector = calClass.monthDay;
            config.targetSelector = calClass.monthDayTarget;
            config.dayRegEx = byFieldOrderInSettings(/(\w+ )?(\d+)/, /(\w+ )?(\d+)/, /(\w+ )?(\d+)/);
            break;

        case 'multiweekV2':
            config.daySelector = '.RKLVef';
            config.targetSelector = null; // calClass.monthDayTarget;
            config.dayRegEx = byFieldOrderInSettings(/(\w+ )?(\d+)/, /(\w+ )?(\d+)/, /(\w+ )?(\d+)/);
            break;

        case 'dayV2':
            config.daySelector = '.R2tnIf';
            config.dayRegEx = byFieldOrderInSettings(/(\w+ )?(\d+)/, /(\w+ )?(\d+)/, /(\w+ )?(\d+)/);
            break;

        case 'day':
            config.daySelector = '.wk-dayname span';
            // config.contextDateFormat = 'dddd MMM D YYYY'; //byFieldOrderInSettings('dddd, MMM D, YYYY', 'dddd, MMM D, YYYY', 'dddd, MMM D, YYYY'); //Tuesday, Sep 6, 2016
            config.dayRegEx = byFieldOrderInSettings(/.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/); // Tuesday 9/13
            config.wrapIn = '<div class="bDayWrap" />';
            break;

        case 'custom': // 5 day
            config.daySelector = '.wk-dayname span';
            // config.contextDateFormat = 'D - - MMM YYYY;MMM D - - YYYY;MMM D - - - YYYY;MMMM YYYY';// byFieldOrderInSettings('MMM D - -, YYYY', 'MMM D - -, YYYY', 'MMM D - -, YYYY'); //Sep 4 – 10, 2016
            config.dayRegEx = byFieldOrderInSettings(/.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/); // Tue 9/13
            break;

        case 'list': // agenda
            config.daySelector = '.lv-datecell span';
            // config.contextDateFormat = byFieldOrderInSettings('dddd MMM D YYYY', 'dddd MMM D YYYY', 'dddd MMM D YYYY'); //Tuesday, Sep 6, 2016
            config.dayRegEx = byFieldOrderInSettings(/(\w+[\W]*)\s(\d+)/, /(\w+[\W]*)\s(\d+)/, /(\w+[\W]*)\s(\d+)/); // Tue Sep 14
            break;

        case 'popup':
            config = parsePopupInfo(popupType, config);
            break;

        case 'eid':
            config = parseEditInfo(config);
            break;

        default:
            console.log('unexpected layout: ' + config.layout);
            console.log(el.attr('id'));
            console.log(el.className);
            return;
    }

    addToAllDays(config);
}

function addToAllDays(config) {
    let contextDateSpan = $(config.contextDateSelector);
    let contextDateText;

    if (config.inEditPage) {
        contextDateText = contextDateSpan.val() + ' ' + $(config.contextTimeSelector).val();
    } else {
        contextDateText = contextDateSpan.text();
    }

    var firstDate;
    var formatUsed;
    var parseFailed = true;

    // try various possible formats
    var result = parseDate(contextDateText, _allFormats);
    if (result.success) {
        formatUsed = result.format;
        firstDate = result.date;
        parseFailed = false;
    }

    if (parseFailed) {
        // config.logDetails = true;
        console.log('unable to determine date from current display')
    }

    if (config.logDetails) {
        console.log('context layout: ' + config.layout);
        console.log('field order: ' + byFieldOrderInSettings(1, 2, 3));
        // console.log('formats: ' + config.contextDateFormat);
        console.log('format used: ' + formatUsed);
        console.log('context text: ' + contextDateText);
        console.log('context date: ' + (firstDate ? firstDate.format('YYYY MMM D') : 'no date'));
        console.log(config.daySelector);
    }

    if (parseFailed) {
        return;
    }

    $('.editBDay').remove();

    var toInsert = [];

    // debugger;

    if (config.daySelector) {

        var lastDate = null;
        var startedMonth = false;
        // var firstDayTested = false;
        // var multiweekOffset = 0;

        // console.log('First Date', firstDate.format('YYYY MMM D'), config.daySelector);
        var thisDate = moment(firstDate);
        thisDate.hour(12); // move to noon
        thisDate.subtract(1, 'day');

        // debugger;

        $(config.daySelector + ':visible').each(function(i, el) {

                    // debugger;
                    // console.log(el.innerHTML);
                    var dayHolder = $(el);
                    var target = config.targetSelector ? dayHolder.find(config.targetSelector) : dayHolder;
                    if (!target.length) {
                        console.log('missing', config.targetSelector, dayHolder);
                        return;
                    }

                    // let thisDayNotInMonth = dayHolder.hasClass(calClass.notInMonth);
                    let rawDayNumberText = config.targetSelector ? dayHolder.find('h2').text() : dayHolder.text();
                    var matches = rawDayNumberText.match(config.dayRegEx);

                    if (!matches) {
                        console.log('Error: ' + config.dayRegEx + ' failed to parse "' + rawDayNumberText + '"');
                    }
                    // console.log(matches);
                    thisDate.add(1, 'day');

                    switch (config.layout) {
                        case 'month':
                        case 'monthV2':
                            // override thisDate
                            var dayNum = +matches[2];
                            if (dayNum === 1) {
                                if (startedMonth) {
                                    // first day of next month
                                    thisDate.month(firstDate.month() + 1);
                                    thisDate.date(dayNum);
                                }
                                startedMonth = true;
                            } else {
                                if (!startedMonth) {
                                    // before the month
                                    thisDate.month(firstDate.month() - 1);
                                    thisDate.date(dayNum);
                                }
                            }
                            break;

                        case 'multiweekV2':
                            dayNum = +matches[2];
                            if (!startedMonth) {
                                thisDate.month(firstDate.month());
                                thisDate.date(dayNum);
                                startedMonth = true;
                            }
                            if (dayNum === 1) {
                                if (startedMonth) {
                                    // first day of next month
                                    thisDate.month(firstDate.month() + 1);
                                    thisDate.date(dayNum);
                                }
                            }
                            break;

                        case 'dayV2':
                            dayNum = +matches[2];
                            thisDate.date(dayNum);
                            break;

                            //   case 'multiweek':
                            //     var dayNum = +matches[2];
                            //     if (!firstDayTested) {
                            //       multiweekOffset = thisDayNotInMonth ? 0 : 1;
                            //       firstDayTested = true;
                            //     }
                            //     if (thisDayNotInMonth) {
                            //       if (!startedMonth) {
                            //         // for multi-week, first day and first month match
                            //         monthOffset = multiweekOffset;
                            //       }
                            //       if (startedMonth) {
                            //         // before the month
                            //         monthOffset = multiweekOffset + 1;
                            //       }
                            //     } else {
                            //       startedMonth = true;
                            //       monthOffset = multiweekOffset;
                            //     }
                            //     thisDate.month(thisDate.month() + monthOffset);
                            //     thisDate.date(dayNum);
                            //     break;

                        case 'list':
                            thisDate.date(+matches[byFieldOrderInSettings({
                                month: 1,
                                day: 2
                            }, {
                                day: 2,
                                month: 1
                            }, {
                                month: 1,
                                day: 2
                            }).day]);
                            if (lastDate) {
                                if (thisDate.isBefore(lastDate)) {
                                    thisDate.month(thisDate.month() + 1);
                                }
                            }
                            break;

                            //   default:
                            //     let regExPositions = byFieldOrderInSettings({
                            //       month: 1,
                            //       day: 2
                            //     },
                            //       {
                            //         day: 1,
                            //         month: 2
                            //       },
                            //       {
                            //         month: 1,
                            //         day: 2
                            //       });
                            //     thisDate.month(+matches[regExPositions.month] - 1);
                            //     thisDate.date(+matches[regExPositions.day]);
                            //     break;
                    }

                    if (lastDate) {
                        if (thisDate.isBefore(lastDate)) {
                            thisDate.year(thisDate.year() + 1);
                        }

                        //   if (lastDate === thisDate) {
                        //     // parsing has failed
                        //     console.log('failed parse', thisDate)
                        //   }
                    }

                    lastDate = thisDate;

                    // console.log('Adding', thisDate.format('YYYY MM DD'));

                    var param = null;

                    switch (config.layout) {
                        case 'dayV2':
                            param = {
                                cmd: 'getInfo',
                                targetDay: thisDate.toDate().getTime(),
                                layout: config.layout,
                                target: target,
                                labelFormat: '{bDay} {bMonthNamePri}<span>Until {endingSunsetDesc}</span><span>{bMonth} - {bYear}</span>', //|',
                                titleFormat: '{element}' // ⇨ 
                            };
                            break;
                        case 'monthV2':
                        case 'multiweekV2':
                            param = {
                                cmd: 'getInfo',
                                targetDay: thisDate.toDate().getTime(),
                                layout: config.layout,
                                target: target,
                                labelFormat: '{bDay} {bMonthNamePri}', //|',
                                titleFormat: 'Until {endingSunsetDesc}\n{bMonth} - {bYear}\n{element}' // ⇨ 
                            };
                            break;
                    }

                    // console.log(param, thisDate.format())
                    // console.log('target pre', target.length);
                    chrome.runtime.sendMessage(parentExtId, param,
                            function(info) {
                                if (!info) {
                                    return; // lost connection?
                                }
                                // console.log('returned info', info, param)
                                // console.log('param day', new Date(param.targetDay));
                                // console.log('result', config.layout, info.di.currentDateString, info.di.element);
                                var div;
                                switch (config.layout) {
                                    case 'dayV2':
                                        var star = info.hd ? '<img src="{0}">'.filledWith(chrome.extension.getURL('star.png')) : '';
                                        div = $('<div/>', {
                                            html: star + (info.hd ? ' ' + info.hd + '<br>' : '') + info.label,
                                            'class': 'bDay' + info.classes + config.classes,
                                            title: (info.hd ? info.hd + '\n' : '') + info.title
                                        });
                                        if (config.wrapIn) {
                                            var wrap = $(config.wrapIn);
                                            wrap.append(div);
                                            div = wrap;
                                        }

                                        toInsert.push([target, div]);
                                        break;
                                    case 'monthV2':
                                    case 'multiweekV2':
                                    case 'month':
                                    case 'multiweek':
                                    case 'week':
                                    case 'day':
                                    case 'custom':
                                    case 'list':
                                        var star = info.hd ? '<img src="{0}">'.filledWith(chrome.extension.getURL('star.png')) : '';
                                        div = $(`<div title="${(info.hd 
                                                ? info.hd + '\n' : '') + info.title}" class="${'bDay' 
                                                + info.classes + config.classes}">${star + info.label}</div>${info.hd ? `<div class="${'bDayHD' 
                                                + info.classes + config.classes}">${info.hd}</div>` : ''}`);
                            // console.log(div[0].outerHTML);
                            if (config.wrapIn) {
                                var wrap = $(config.wrapIn);
                                wrap.append(div);
                                div = wrap;
                            }
                            toInsert.push([target, div]);
                            break;
                        default:
                            console.log('unexpected layout 2:');
                            console.log(config);
                    }
                });
        });

        // console.log('done');
        chrome.runtime.sendMessage(parentExtId, {
                cmd: 'connect',
            },
            function (info) {
                if (!info) {
                    return; // lost connection?
                }
                // console.log(2, toInsert);
                addThem(config, toInsert);
            });


    } else {
        // just one date - the context date in the popup
        // console.log('single date');
        chrome.runtime.sendMessage(parentExtId, {
                cmd: 'getInfo',
                targetDay: firstDate.toDate().getTime(),
                layout: config.layout,
                labelFormat: '{bDay} {bMonthNamePri}', //|',
                titleFormat: 'Until {endingSunsetDesc}\n{bMonth} - {bYear}\n{element}' // ⇨ 
            },
            function (info) {
                contextDateSpan.addClass('gDay');
                var host = contextDateSpan.closest(config.hostSelector);

                if (config.showNextDayToo) {
                    firstDate.add(1, 'd');
                    chrome.runtime.sendMessage(parentExtId, {
                            cmd: 'getInfo',
                            targetDay: firstDate.toDate().getTime(),
                            layout: config.layout
                        },
                        function (info2) {
                            var div = $('<div/>', {
                                html: info.label + ' / ' + info2.label,
                                'class': 'bDay' + info.classes + config.classes,
                                title: info.title
                            });
                            toInsert.push([host, div]);

                            //            console.log('to insert double');
                            addThem(config, toInsert);
                        });
                    return;
                }

                var div = $('<div/>', {
                    html: info.label,
                    'class': 'bDay' + info.classes + config.classes,
                    title: info.title
                });
                toInsert.push([host, div]);
            });
    }

    // console.log(1, toInsert);
    // addThem(config, toInsert);
}

function addThem(config, toInsert) {
    chrome.runtime.sendMessage(parentExtId, {
            cmd: 'dummy' // just to get in the queue after all the ones above
        },
        function () {
            // console.log(`insert ${toInsert.length} elements`);
            // console.log('---- adding ----');
            // debugger;
            for (var j = 0; j < toInsert.length; j++) {
                var item = toInsert[j];

                switch (config.layout) {
                    case 'monthV2':
                    case 'multiweekV2':
                    case 'dayV2':
                    case 'month':
                    case 'list':
                    case 'custom':
                    case 'popup':
                    case 'multiweek':
                    case 'week':
                    case 'eid':
                    case 'day':
                        // item[1].insertAfter(item[0]);
                        // replace all content
                        item[0].find('.bDay').remove();
                        item[0].append(item[1]);
                        break;
                }

                // added = true;
            }
            // console.log('---- inserted ----');
        });
}


function addBadiInfo(watchedDomElement, layout) {
    refreshCount++;
    // console.log('change detected', watchedDomElement, layout);
    // debugger
    // V1 seems to redraw twice on first load
    var threshold = 0;

    //  if (element.id === 'mvEventContainer') {
    //    threshold = 1; 
    //  }

    if (refreshCount > threshold) {
        layout = layout || lastLayout;
        watchedDomElement = watchedDomElement || lastElement;

        lastLayout = layout;
        lastElement = watchedDomElement;

        fillCalendar(watchedDomElement, layout);
    } else {
        lastLayout = layout;
        lastElement = watchedDomElement;
    }
}


function parsePopupInfo(popupType, config) {
    config.daySelector = '';
    var textDate;

    //  console.log('popup-' + popupType);

    switch (popupType) {
        case 'view1':
            config.contextDateSelector = '.neb-date div';
            config.hostSelector = '.neb-date';
            break;
        case 'new':
            config.contextDateSelector = '.period-tile .tile-content div';
            config.hostSelector = '.tile-content';
            config.showNextDayToo = true;
            break;
        case 'view2':
            // 9/18 at 8:00am
            // 18/9 at 8:00am DMT
            config.contextDateSelector = '.datetime-container';
            config.hostSelector = '.datetime-container';
            break;
    }

    //1 Mon, September 5

    //2 Thu, January 5, 2017
    //2 Tue, September 13, 1:30pm
    //2 Tue, September 20, 8am – 9am
    //2 Tue, September 20, 8:15pm – 9:15pm

    //3 Tue, May 9, 2017, 5:00pm – 5:01pm

    //4 Mon, August 29, 9am – Fri, September 2, 5pm

    //6 Sat, July 8, 2017, 9:51pm – Sun, July 9, 2017, 9:51pm

    textDate = $(config.contextDateSelector).text();
    let textParts = textDate.split(',');
    var numCommas = textParts.length - 1;

    // VERY SPECIFIC to English layout!
    // console.log('commas', numCommas)
    switch (numCommas) {
        case 0:
            // config.contextDateFormat = byFieldOrderInSettings('M/DD - h:mma !', 'DD/M - h:mma !', 'M/DD - h:mma !');
            break;
        case 1:
            // config.contextDateFormat = '- MMMM DD !';// byFieldOrderInSettings('-, MMMM DD', '-, MMMM DD', '-, MMMM DD');
            break;
        case 2:
            if (!isNaN(textParts[2])) {
                // config.contextDateFormat = '- MMMM DD YYYY'; // byFieldOrderInSettings('-, MMMM DD, YYYY', '-, MMMM DD, YYYY', '-, MMMM DD, YYYY');
            } else {
                // config.contextDateFormat = '- MMMM D h:mma - - !;- MMMM D YYYY h:mma -;- MMMM D ha - - !;- MMMM D YYYY ha -';// byFieldOrderInSettings('- MMMM D hh:mma -', '-, MMMM DD, hh:mma -', '-, MMMM DD, hh:mma -');
            }
            break;
        case 3:
            // config.contextDateFormat = '- MMMM DD YYYY h:mma - -;- MMMM DD YYYY -';// byFieldOrderInSettings('-, MMMM DD, YYYY, -', '-, MMMM DD, YYYY, -', '-, MMMM DD, YYYY, -');
            break;
        case 4:
            // config.contextDateFormat = '- MMMM DD - !'; // byFieldOrderInSettings('-, MMMM DD, -', '-, MMMM DD, -', '-, MMMM DD, -');
            break;
        case 6:
            // config.contextDateFormat = '- MMMM DD YYYY -'; // byFieldOrderInSettings('-, MMMM DD, YYYY, -', '-, MMMM DD, YYYY, -', '-, MMMM DD, YYYY, -');
            break;
        default:
            break;
    }


    //  config.logDetails = true;

    return config;
}


function parseEditInfo(config) {
    config.inEditPage = true;
    config.classes = ' editBDay';

    config.hostSelector = '.ep-edr-first-line';

    config.contextDateSelector = '.dr-date';
    config.contextTimeSelector = '.dr-time';

    // config.contextDateFormat = byFieldOrderInSettings('YYYY-MM-DD hh:mma', 'YYYY-MM-DD hh:mma', 'YYYY-MM-DD hh:mma');

    //  config.logDetails = true;

    return config;
}

// split format and text by space, drop any -
function parseDate(text, formatList) {
    var formats = formatList.map(function (s) {
        var arr = s.split(/[ !]+/);
        arr.useThisYear = s.indexOf('!') !== -1; // add property to array
        arr.original = s;
        return arr;
    })
    var result = {
        success: false
    };

    var t = $.trim(text.replace(/ \(.*\)/g, '').replace(/[^\x00-\x7A–]/g, '')).split(/[ ,\/]+/);
    var failures = [text, t.join(' ')];

    formats.every(function (f, attempt) {
        // console.log(format, useThisYear)
        var newT = [];
        var newF = [];
        for (var i = 0; i < f.length; i++) {
            if (f[i] === '-') {
                continue;
            }
            if (i >= t.length) {
                break;
            }
            newT.push(t[i]);
            newF.push(f[i]);
        }
        if (!newT.length) {
            return false;
        }
        var partsMismatch = i != t.length;

        result = {
            attempt: 1 + attempt,
            success: false,
            originalFormat: f.original,
            newF: newF,
            newT: newT,
            format: newF.join(' '),
            text: newT.join(' '),
            failReason: partsMismatch ? 'mismatch ' + i + '=' + t.length : '',
            useThisYear: f.useThisYear,
        };

        if (!partsMismatch) {
            // console.log('test', result.text, 'x', result.format)
            result.date = moment(result.text, result.format, true);

            var isValid = result.date.isValid();
            var inThisYear = isValid && result.useThisYear && result.date.year() == moment().year();
            var yearMatches = isValid && text.indexOf(result.date.year()) !== -1;

            result.success = isValid && (inThisYear || yearMatches);

            if (!result.success) {
                result.failReason = !isValid ? 'not valid' : !inThisYear ? 'not this year' : 'year mismatch';
            }
        }

        if (!result.success) {
            failures.push(JSON.stringify(result));
        }

        return !result.success; // stop if we got one
    });

    if (!result.success) {
        // console.log(failures)
    }

    return result;
}

function calendarDefaults() {
    // this info is needed, but if the user changes their settings, the #calmaster HTML is NOT updated until they reload the page
    var v1Content = document.getElementById('calmaster');
    var masterHtml = v1Content ? v1Content.innerHTML : document.body.innerHTML;

    // attempt Nov 2019
    try {
        // debugger;
        // window['INITIAL_DATA'][2][0][0].substr(window['INITIAL_DATA'][2][0][0].indexOf('dtFldOrdr')+12,3)
        var allSettings = JSON.parse(document.getElementById('initialdata').firstChild.data);
        let settings = allSettings[39][1][1][1];
        let defaultAnswer = {
            dtFldOrdr: 'YMD',
            locale: 'en'
        };
        let found = 0;
        settings.forEach(function (a) {
            // console.log(a[0][0]);
            if (a[0][0] === 'dateFieldOrder') {
                defaultAnswer.dtFldOrdr = a[0][1];
                found++;
            } else if (a[0][0] === 'locale') {
                defaultAnswer.locale = a[0][1];
                found++;
            }
        });
        if (found === 2) {
            return {
                dtFldOrdr: fieldOrder,
                locale: locale
            }
        }
    } catch (error) {
        console.log('attempt 1', error)
    }

    // attempt
    try {

        return {
            dtFldOrdr: masterHtml.match(/\\"dtFldOrdr\\",\\"(.*?)\\"/)[1],
            locale: masterHtml.match(/\\"locale\\",\\"(.*?)\\"/)[1]
        }
    } catch (error) {
        console.log('attempt 2', error)
    }

    // attempt
    try {

        // this is potentially useful information, but if the user changes their settings, the #calmaster HTML is NOT updated
        return {
            dtFldOrdr: masterHtml.match(/'dtFldOrdr','(.*?)'/)[1],
            locale: masterHtml.match(/'locale','(.*?)'/)[1]
        }
    } catch (error) {
        console.log('attempt 3', error)
    }

    // attempt
    try {
        // debugger;
        // window['INITIAL_DATA'][2][0][0].substr(window['INITIAL_DATA'][2][0][0].indexOf('dtFldOrdr')+12,3)
        var settingsRaw = window['INITIAL_DATA'][2][0][0];
        var settingsGroup = JSON.parse(settingsRaw);
        var settings = settingsGroup[1];

        var fieldOrder = settings.find(function (a) {
            return a[0] === 'dtFldOrdr'
        })[1];
        var locale = settings.find(function (a) {
            return a[0] === 'locale'
        })[1];

        return {
            dtFldOrdr: fieldOrder,
            locale: locale
        }
    } catch (error) {
        console.log('attempt 4', error)
    }



    console.warn('Cannot read Google Calendar settings. Using default field order and locale.')

    // give up and return a set of default values. If this guess is wrong, the dates won't show correctly
    return {
        dtFldOrdr: 'YMD',
        locale: 'en'
    }

    // other settings: 
    // 'dtFldOrdr','DMY'
    // 'firstDay','1'
    // 'defaultCalMode','week'
    // 'locale','en'

    // 0 MDY 12/31/2016
    // 1 DMY 31/12/2016
    // 2 YMD 2016-12-31
}

function byFieldOrderInSettings(mdy, dmy, ymd) {
    // last param is optional - default to mdy format
    switch (calendarSettings.dtFldOrdr) {
        case 'MDY':
            return mdy;
        case 'DMY':
            return dmy;
        case 'YMD':
        default:
            return ymd || mdy;
    }
}


function startAddingBadiInfo() {
    // added = false;
    chrome.runtime.sendMessage(parentExtId, {
            cmd: 'getStorage',
            key: 'enableGCal',
            defaultValue: true
        },
        function (info) {
            if (info && info.value) {
                // console.log('parent extension found');
                calendarSettings = calendarDefaults();

                // console.log(calendarSettings);

                moment.locale(calendarSettings.locale);

                prepareFormats();
                // runParseTests();

                // month
                // PRE OCT 2017
                addBadiTrigger('#mvEventContainer', function (el) {
                    var numWeeks = $('#mvEventContainer .month-row').length;
                    var numWordsInButton = $('.button-strip .goog-imageless-button-checked').text().split(' ');
                    // no easy way to be sure we are in Month view, not a custom view!
                    if (numWeeks < 4 || numWordsInButton > 1) {
                        addBadiInfo(el, 'multiweek');
                    } else {
                        addBadiInfo(el, 'month');
                    }
                });

                // OCT 2017 - V2
                addBadiTrigger(calClass.triggerElement, function (el) {

                    // console.log(`Sorry: Wondrous Calendar dates are not no longer available in the "New Design" (Oct 2017) of Google Calendar.`);
                    // return;
                    // console.log('badi triggered');

                    // debugger;
                    var numWeeks = $(calClass.week).length;
                    var numWordsInButton = $('.NlWrkb').text().split(' ').length;
                    if (numWeeks < 4 || numWordsInButton > 1) {
                        addBadiInfo(el, 'multiweekV2');
                    } else {
                        addBadiInfo(el, 'monthV2');
                    }
                });

                addBadiTrigger('.Uit9Se', function (el) {
                    addBadiInfo(el, 'multiweekV2');
                }); // week, custom

                // addBadiTrigger('.Uit9Se', function(el) {
                //     addBadiInfo(el, 'dayV2');
                // }); // week, custom


                addBadiTrigger('.wk-weektop', function (el) {
                    addBadiInfo(el, $(el).hasClass('wk-full-mode') ? 'week' : 'day');
                }); // week, custom
                addBadiTrigger('#lv_listview', function (el) {
                    addBadiInfo(el, 'list');
                }); // agenda
                addBadiTrigger('.neb-date', function (el) {
                    addBadiInfo(el, 'popup');
                }); // popup
                // addBadiTrigger('.datetime-container', function(el) {
                //     addBadiInfo(el, 'popup');
                // }); // popup new event






                // addBadiTrigger('.ep-dpc', addBadiInfo); // edit page
                //
                // -- can't find an event to know when the input has been changed!
                //
                // $('body').on('change', '.dr-date', addBadiInfo); // edit page
                // $('body').on('change', '.dr-time', addBadiInfo); // edit page

                //$(document).on('change', ', .dr-time', function () {
                //  console.log('dr changed');
                //  fillCalendar($('.ep-dpc')[0]);
                //});

                console.log(getMessage('confirmationMsg').filledWith(getMessage('title')) +
                    ` (version ${chrome.runtime.getManifest().version})` +
                    ` (main extension: ${parentExtId})`);


                observer.observe(window.document.documentElement, {
                    childList: true,
                    subtree: true
                });

                checkBadiTriggers();
            }
        });
}

$(document).on('change', '#dtFldOrdr', function () {
    pendingFormat = $(this).val();
    // tried to only apply when Save is clicked, but my handler is called too late, after the change is applied
    // need to set it when format is changed. Will be wrong if person clicks Cancel.
    calendarSettings.dtFldOrdr = pendingFormat;
    //  console.log(calendarSettings + ' ' + byFormat(0, 1, 2));
});
//$(document).on('click', 'input[id=settings_save_btn]', function () {
//  if (pendingFormat) {
//    calendarSettings = pendingFormat;
//    pendingFormat = '';
//  }
//  console.log(calendarSettings + ' ' + byFormat(0, 1, 2));
//});



function prepareFormats() {
    _allFormats = [
        'MMM D YYYY',
        'MMMM YYYY',
        'MMM D - - - YYYY',
        'MMM D YYYY - - - -',
        'D MMM YYYY - - - -',
        'D - - MMM YYYY',
        'MMM D - - YYYY',
        'D MMM - - - YYYY',
        'D MMM YYYY',
        '- MMM D YYYY',
        '- D MMM YYYY',
        'MMM - - YYYY',
        // ! means add the current year
        '- MMM D !',
        '- MMM D ha - !',
        '- MMM D ha - - !',
        '- MMMM D ha - - !',
        '- MMM D h:mma - - !',
        '- MMMM D h:mma - - !',
        '- MMM D HH:mm - - !',
        '- MMMM D HH:mm - - !',
        '- D MMMM ha - - !',
        '- D MMMM h:mma - - !',
        '- D MMMM HH:mm - - !',
        '- D MMMM YYYY ha - -',
        '- D MMMM YYYY h:mma - -',
        '- D MMMM YYYY HH:mm - -',
        byFieldOrderInSettings('- M D !', '- D M !'),
    ];
}

function findParentExtension() {
    // console.log('looking for parent extension - ' + possibleParents.length);
    var found = 0;
    var failed = 0;
    var tested = 0;
    // console.log(`Connecting to Badí Calendar Extension...`);
    for (var i = 0; i < possibleParents.length; i++) {
        var testId = possibleParents[i];
        tested++;

        chrome.runtime.sendMessage(testId, {
                cmd: 'connect'
            },
            function (info) {
                var msg = chrome.runtime.lastError;
                if (msg) {
                    failed++;
                    // console.log(tested, found, failed)
                } else {
                    found++;
                    // console.log(tested, found, failed)
                    if (found > 1) {
                        // ! already found one... this is a second copy?
                    } else {
                        if (info && info.value === 'Wondrous Calendar!') {
                            parentExtId = info.id;
                            startAddingBadiInfo();
                        }
                    }
                }
                if (tested === (found + failed)) {
                    if (!found) {
                        console.log(`Tested ${possibleParents.length} extension ids. Did not find the Badí' Calendar extension (version 3+).`)
                        console.log(tested, found, failed)
                    }
                }
            });
    }
}

function showErrors() {
    var msg = chrome.runtime.lastError;
    if (msg) {
        console.log(msg);
    }
}


function checkBadiTriggers(mutationsList, observer, doNow, a, b) {
    clearTimeout(startBadiTimer);

    // console.log('checking badi triggers', badiTriggers.length, doNow, a, b);

    if (mutationsList) {
        for (var mutation of mutationsList) {
            // console.log(mutation.type,
            //     mutation.target.tagName,
            //     mutation.target.childElementCount,
            //     mutation.target.classList.value,
            //     mutation.target.innerHTML.substring(0, 20)
            // );
            if (mutation.target.childElementCount === 0 && ',zYZlv,cKWEWe'.indexOf(mutation.target.classList.value) > 0) {
                // debugger;
                console.log('trigger again 1')
                clearTimeout(startBadiTimer);
                startBadiTimer = setTimeout(function () {
                    addBadiInfo();
                }, 100);
            }
            if (mutation.target.childElementCount === 0 && mutation.target.classList.value.indexOf('RKLVef') !== -1) {
                // debugger;
                console.log('trigger again 2')
                clearTimeout(startBadiTimer);
                startBadiTimer = setTimeout(function () {
                    addBadiInfo();
                }, 100);
            }
            if (mutation.target.childElementCount === 1 && ',zYZlv,SU7tYb,'.indexOf(mutation.target.classList.value.split(' ')[0]) > 0) {
                // debugger;
                // console.log('trigger again 3')
                clearTimeout(startBadiTimer);
                startBadiTimer = setTimeout(function () {
                    addBadiInfo();
                }, 100);
            }
        }
    }

    if (doNow) {
        // console.log('checking badi triggers now', badiTriggers.length);
        // Check the DOM for elements matching a stored selector
        for (var i = 0, len = badiTriggers.length, badiTrigger, elements; i < len; i++) {
            badiTrigger = badiTriggers[i];
            // Query for elements matching the specified selector
            elements = window.document.querySelectorAll(badiTrigger.selector);
            for (var j = 0, jLen = elements.length, element; j < jLen; j++) {
                element = elements[j];
                // Make sure the callback isn't invoked with the 
                // same element more than once
                if (!element.badiLoaded) {
                    // console.log('BADI update', badiTrigger.selector);
                    element.badiLoaded = true;
                    // Invoke the callback with the element
                    badiTrigger.fn.call(element, element);
                }
            }
        }
    } else {
        startBadiTimer = setTimeout(function () {
            checkBadiTriggers(null, null, true);
        }, 500); // wait screen to settle first
    }
}

function addBadiTrigger(selector, fn) {
    // Store the selector and callback to be monitored
    badiTriggers.push({
        selector: selector,
        fn: fn
    });
}



var MutationObserver = window.MutationObserver || win.WebKitMutationObserver;
var observer = new MutationObserver(checkBadiTriggers);

findParentExtension();