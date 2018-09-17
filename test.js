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
    test('Thu, March 3, 6:30pm – 10pm', _allFormats, '2017-03-03T18:30') // fails!?
    test('Fri, 30 December 2016, 7:30pm – 9:00pm', _allFormats, '2016-12-30T19:30')
    test('Fri, 30 December 2016, 7:30am – 9:00am', _allFormats, '2016-12-30T07:30')
}

var test = function(a, f, b) {
    var result = parseDate(a, f);

    var bDate = moment(b, 'YYYY-MM-DD hh:mma', false);
    if (result.success && result.date.format('YYYYMMDDHHMM') === bDate.format('YYYYMMDDHHMM')) {
        console.debug('ok', a)
    } else {
        console.warn('failed', a, b, JSON.stringify(result))
    }
}