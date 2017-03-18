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

  // console.log(JSON.stringify(calendarSettings));
  // calendarSettings = calendarDefaults();
  // console.log(JSON.stringify(calendarSettings));

  //var hash = location.hash;
  //var parts = hash.split(/%7C|,|-/g);

  var config = {
    logDetails: false,
    layout: layout, // parts.length > 1 ? parts[1] : calendarSettings.defaultCalMode,
    daySelector: '',
    dayRegEx: null,
    contextDateSelector: '.date-top',
    // contextDateFormat: '',
    hostSelector: '',
    wrapIn: '',
    showNextDayToo: false,
    inEditPage: false,
    classes: ''
  };

  var el = $(watchedDomElement); // may be null
  let popupType =
    el.hasClass('neb-date') ? 'view1'
      : el.hasClass('period-tile') ? 'new'
        : el.hasClass('datetime-container') ? 'view2'
          : '';

  if (popupType) {
    config.layout = 'popup';

  } else {
    if (config.layout === 'eid' && el.hasClass('mv-event-container')) {
      config.layout = 'month';
    }
  }

  // console.log(config.layout + ', ' + watchedDomElement.className);

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

    case 'day':
      config.daySelector = '.wk-dayname span';
      // config.contextDateFormat = 'dddd MMM D YYYY'; //byFieldOrderInSettings('dddd, MMM D, YYYY', 'dddd, MMM D, YYYY', 'dddd, MMM D, YYYY'); //Tuesday, Sep 6, 2016
      config.dayRegEx = byFieldOrderInSettings(/.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/);// Tuesday 9/13
      config.wrapIn = '<div class="bDayWrap" />';
      break;

    case 'custom': // 5 day
      config.daySelector = '.wk-dayname span';
      // config.contextDateFormat = 'D - - MMM YYYY;MMM D - - YYYY;MMM D - - - YYYY;MMMM YYYY';// byFieldOrderInSettings('MMM D - -, YYYY', 'MMM D - -, YYYY', 'MMM D - -, YYYY'); //Sep 4 – 10, 2016
      config.dayRegEx = byFieldOrderInSettings(/.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/, /.* (\d+)\/(\d+)/);// Tue 9/13
      break;

    case 'list': // agenda
      config.daySelector = '.lv-datecell span';
      // config.contextDateFormat = byFieldOrderInSettings('dddd MMM D YYYY', 'dddd MMM D YYYY', 'dddd MMM D YYYY'); //Tuesday, Sep 6, 2016
      config.dayRegEx = byFieldOrderInSettings(/(\w+[\W]*)\s(\d+)/, /(\w+[\W]*)\s(\d+)/, /(\w+[\W]*)\s(\d+)/);// Tue Sep 14
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
  console.log('commas', numCommas)
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
    arr.useThisYear = s.indexOf('!') !== -1;  // add property to array
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
    console.log(failures)
  }

  return result;
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
    config.logDetails = true;
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

  if (config.daySelector) {

    var lastDate = null;
    var startedMonth = false;
    // var firstDayTested = false;
    // var multiweekOffset = 0;


    var thisDate = moment(firstDate);
    thisDate.hour(12); // move to noon
    thisDate.subtract(1, 'day');

    $(config.daySelector).each(function (i, el) {
      thisDate.add(1, 'day');

      var originalDateSpan = $(el);

      var monthOffset = 0;
      let thisDayNotInMonth = originalDateSpan.closest('td').hasClass('st-dtitle-nonmonth');
      let rawDayNumberText = originalDateSpan.text();
      var matches = rawDayNumberText.match(config.dayRegEx);

      if (!matches) {
        console.log('Error: ' + config.dayRegEx + ' failed to parse "' + rawDayNumberText + '"');
      }
      // console.log(matches);

      switch (config.layout) {
        case 'month':
          // debugger;
          // override thisDate
          var dayNum = +matches[2];
          if (thisDayNotInMonth) {
            if (!startedMonth) {
              // before the month
              monthOffset = -1;
            }
            if (startedMonth) {
              // before the month
              monthOffset = 1;
            }
            thisDate.month(firstDate.month() + monthOffset);
            thisDate.date(dayNum);
          } else {
            startedMonth = true;
          }
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
          },
            {
              day: 2,
              month: 1
            },
            {
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

      // console.log(thisDate.format('YYYY MM DD'));

      var param = {
        cmd: 'getInfo',
        targetDay: thisDate.toDate().getTime(),
        layout: config.layout
      };
      // console.log(param, thisDate.format())
      chrome.runtime.sendMessage(parentExtId, param,
        function (info) {
          if (!info) {
            return; // lost connection?
          }
          // console.log('returned info', info)
          originalDateSpan.addClass('gDay');
          var div;
          switch (config.layout) {
            case 'month':
            case 'multiweek':
            case 'week':
            case 'day':
            case 'custom':
            case 'list':
              div = $('<div/>',
                {
                  html: info.label,
                  'class': 'bDay' + info.classes + config.classes,
                  title: info.title
                });
              if (config.wrapIn) {
                var wrap = $(config.wrapIn);
                wrap.append(div);
                div = wrap;
              }
              toInsert.push([originalDateSpan, div]);
              break;
            default:
              console.log('unexpected layout 2:');
              console.log(config);
          }
        });
    });
  } else {
    // just one date - the context date in the popup
    chrome.runtime.sendMessage(parentExtId, {
      cmd: 'getInfo',
      targetDay: firstDate.toDate().getTime(),
      layout: config.layout
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
              var div = $('<div/>',
                {
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

        var div = $('<div/>',
          {
            html: info.label,
            'class': 'bDay' + info.classes + config.classes,
            title: info.title
          });
        toInsert.push([host, div]);
      });
  }

  addThem(config, toInsert);
}

function addThem(config, toInsert) {
  chrome.runtime.sendMessage(parentExtId, {
    cmd: 'dummy' // just to get in the queue after all the ones above
  },
    function () {
      //      console.log(`insert ${toInsert.length} elements`);
      for (var j = 0; j < toInsert.length; j++) {
        var item = toInsert[j];

        switch (config.layout) {
          case 'month':
          case 'list':
          case 'custom':
          case 'popup':
          case 'multiweek':
          case 'week':
          case 'eid':
          case 'day':
            item[1].insertAfter(item[0]);
            break;
          //          case 'day':
          //            item[1].insertBefore(item[0]);
          //            break;
        }

        // added = true;
      }
    });
}

var refreshCount = 0;
var lastLayout = null;
var lastElement = null;
function calendarUpdated(watchedDomElement, layout) {
  refreshCount++;

  // seems to redraw twice on first load
  var threshold = 1;

  //  if (element.id === 'mvEventContainer') {
  //    threshold = 1; 
  //  }

  if (refreshCount > threshold) {
    layout = layout || lastLayout;
    watchedDomElement = watchedDomElement || lastElement;

    // console.log('threshold okay, filling', layout)
    fillCalendar(watchedDomElement, layout);
  } else {
    // console.log('threshold skipped', layout, refreshCount)
    lastLayout = layout;
    lastElement = watchedDomElement;
  }
}

function calendarDefaults() {
  // window['INITIAL_DATA'][2][0][0].substr(window['INITIAL_DATA'][2][0][0].indexOf('dtFldOrdr')+12,3)

  var master = document.getElementById('calmaster').innerHTML;

  // this is potentially useful information, but if the user changes their settings, the #calmaster HTML is NOT updated
  return {
    dtFldOrdr: master.match(/'dtFldOrdr','(.*?)'/)[1],
    // defaultCalMode: master.match(/'defaultCalMode','(.*?)'/)[1],
    // customCalMode: master.match(/'customCalMode','(.*?)'/)[1],
    locale: master.match(/'locale','(.*?)'/)[1]
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

(function (win) {
  'use strict';

  var listeners = [],
    doc = win.document,
    MutationObserver = win.MutationObserver || win.WebKitMutationObserver,
    observer;

  function ready(selector, fn) {
    // Store the selector and callback to be monitored
    listeners.push({
      selector: selector,
      fn: fn
    });
    if (!observer) {
      // Watch for changes in the document
      observer = new MutationObserver(check);
      observer.observe(doc.documentElement, {
        childList: true,
        subtree: true
      });
    }
    // Check if the element is currently in the DOM
    check();
  }

  function check() {
    // Check the DOM for elements matching a stored selector
    for (var i = 0, len = listeners.length, listener, elements; i < len; i++) {
      listener = listeners[i];
      // Query for elements matching the specified selector
      elements = doc.querySelectorAll(listener.selector);
      for (var j = 0, jLen = elements.length, element; j < jLen; j++) {
        element = elements[j];
        // Make sure the callback isn't invoked with the 
        // same element more than once
        if (!element.ready) {
          element.ready = true;
          // Invoke the callback with the element
          listener.fn.call(element, element);
        }
      }
    }
  }

  // Expose `ready`
  win.ready = ready;

})(this);

function getStarted() {
  // added = false;
  chrome.runtime.sendMessage(parentExtId, {
    cmd: 'getStorage',
    key: 'enableGCal',
    defaultValue: true
  },
    function (info) {
      if (info && info.value) {
        calendarSettings = calendarDefaults();

        // console.log(calendarSettings);

        moment.locale(calendarSettings.locale);

        prepareFormats();
        // runParseTests();

        ready('#mvEventContainer', function (el) {
          var numWeeks = $('#mvEventContainer .month-row').length;
          var numWordsInButton = $('.button-strip .goog-imageless-button-checked').text().split(' ');
          // no easy way to be sure we are in Month view, not a custom view!
          if (numWeeks < 4 || numWordsInButton > 1) {
            calendarUpdated(el, 'multiweek');
          } else {
            calendarUpdated(el, 'month');
          }
        }); // month
        ready('.wk-weektop', function (el) {
          calendarUpdated(el, $(el).hasClass('wk-full-mode') ? 'week' : 'day');
        }); // week, custom
        ready('#lv_listview', function (el) {
          calendarUpdated(el, 'list');
        }); // agenda
        ready('.neb-date', function (el) {
          calendarUpdated(el, 'popup');
        }); // popup
        ready('.datetime-container', function (el) {
          calendarUpdated(el, 'popup');
        }); // popup new event

        // ready('.ep-dpc', calendarUpdated); // edit page
        //
        // -- can't find an event to know when the input has been changed!
        //
        // $('body').on('change', '.dr-date', calendarUpdated); // edit page
        // $('body').on('change', '.dr-time', calendarUpdated); // edit page

        //$(document).on('change', ', .dr-time', function () {
        //  console.log('dr changed');
        //  fillCalendar($('.ep-dpc')[0]);
        //});

        console.log(getMessage('confirmationMsg').filledWith(getMessage('title'))
          + ` (version ${chrome.runtime.getManifest().version})`
          + ` (main extension: ${parentExtId})`);
        calendarUpdated();
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
              getStarted();
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



findParentExtension();



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

function runParseTests() {
  prepareFormats();
  test('Mar 3, 2017', _allFormats, '2017-03-03')
  test('Mar 3 – 17, 2017', _allFormats, '2017-03-03') // 2 week
  test('Mar 3 - Apr 4, 2017', _allFormats, '2017-03-03') // 2 week
  test('23 – 29 Jan 2017', _allFormats, '2017-01-23') // 2 week
  test('23 Jan – 5 Feb 2017', _allFormats, '2017-01-23') // 2 week
  test('Dec 26, 2016 – Jan 4, 2017', _allFormats, '2016-12-26') // 2 week
  test('26 Dec 2016 – 8 Jan 2017', _allFormats, '2016-12-26') // 2 week
  test('3 Mar 2017', _allFormats, '2017-03-03')
  test('March 2017', _allFormats, '2017-03-01') // month
  test('Sunday, Mar 3, 2017', _allFormats, '2017-03-03') // day
  test('Friday, 3 Mar 2017', _allFormats, '2017-03-03') // day
  test('Sun, Mar 3, 2017', _allFormats, '2017-03-03') // agenda
  test('Tue, 28 February, 19:00 – 22:00', _allFormats, '2017-02-28T19:00') // popup
  test('Tue Mar 3', _allFormats, '2017-03-03')
  test('Tue ' + byFieldOrderInSettings('1/12', '12/1'), _allFormats, '2017-01-12')
  test('Thu, March 3, 6pm – 10pm', _allFormats, '2017-03-03T18:00')
  test('Thu, March 3, 8am – 10pm', _allFormats, '2017-03-03T08:00')
  test('Thu, March 3, 18:00 – 20:00', _allFormats, '2017-03-03T18:00')
  test('Thu, March 3, 08:30 – 20:00', _allFormats, '2017-03-03T08:30')
  test('Thu, 29 December 2016, 7pm – 10pm', _allFormats, '2016-12-29T19:00')
  test('Thu, March 3, 6:30pm – 10pm', _allFormats, '2017-03-03T18:30')
  test('Fri, 30 December 2016, 7:30pm – 9:00pm', _allFormats, '2016-12-30T19:30')
  test('Fri, 30 December 2016, 7:30am – 9:00am', _allFormats, '2016-12-30T07:30')
}

var test = function (a, f, b) {
  var result = parseDate(a, f);

  var bDate = moment(b, 'YYYY-MM-DD hh:mma', false);
  if (result.success && result.date.format('YYYYMMDDHHMM') === bDate.format('YYYYMMDDHHMM')) {
    console.debug('ok', a)
  } else {
    console.warn('failed', a, b, JSON.stringify(result))
  }
}

