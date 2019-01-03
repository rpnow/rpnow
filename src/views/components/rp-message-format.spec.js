const test = require('ava');
const formatMessage = require('./rp-message-format');

const tests = {
  'regular strings': [
    ['Hello world!', null, 'Hello world!'],
    ['', null, ''],
  ],

  'escape': [
    ['<b>Escape this</b>', null, '&lt;b&gt;Escape this&lt;/b&gt;'],
  ],

  '/italics/': [
    ['/Test/', null, '<i>Test</i>'],
    ['Time to /Test/ this', null, 'Time to <i>Test</i> this'],
  ],

  '_italics_': [
    ['_Test_', null, '<i>Test</i>'],
    ['Time to _Test_ this', null, 'Time to <i>Test</i> this'],
  ],

  '__bold__': [
    ['__Test__', null, '<b>Test</b>'],
    ['Time to __Test__ this', null, 'Time to <b>Test</b> this'],
  ],

  '___both___': [
    ['___Test___', null, '<b><i>Test</i></b>'],
    ['Time to ___Test___ this', null, 'Time to <b><i>Test</i></b> this'],
  ],

  'bold in italics': [
    ['_italics __bold__ italics_', null, '<i>italics <b>bold</b> italics</i>'],
    ['/italics __bold__ italics/', null, '<i>italics <b>bold</b> italics</i>'],
    // ['_italics __bold___', null, '<i>italics <b>bold</b></i>'], // undefined behavior
  ],

  'italics in bold': [
    ['__bold _italics_ bold__', null, '<b>bold <i>italics</i> bold</b>'],
    ['__bold /italics/ bold__', null, '<b>bold <i>italics</i> bold</b>'],
    // ['__bold _italics___', null, '<i>italics <b>bold</b></i>'], // undefined behavior
  ],

  'newlines': [
    ['Two\nlines', null, 'Two<br>lines'],
    ['One\ntwo\nthree', null, 'One<br>two<br>three'],
    ['Double\n\nnewlines', null, 'Double<br><br>newlines'],
  ],

  'imperfections': [
    ['/not closed', null, '/not closed'],
    ['no opening/', null, 'no opening/'],
    ['/stray bold __marker/', null, '<i>stray bold __marker</i>'],
    ['/__/__/__', null, '<i>__</i><b>/</b>'],
    ['_', null, '_'],
    ['__', null, '__'],
    ['___', null, '___'],
    ['____', null, '____'],
    ['_____', null, '_____'],
    ['______', null, '______'],
    ['/invalid italics_', null, '/invalid italics_'],
    ['_invalid italics/', null, '_invalid italics/'],
    ['_ambiguous formatting__', null, '_ambiguous formatting__'],
    ['__ambiguous formatting_', null, '__ambiguous formatting_'],
    ['¯\_(ツ)_/¯', null, '¯\_(ツ)_/¯'],
    ['idk ¯\_(ツ)_/¯ lol', null, 'idk ¯\_(ツ)_/¯ lol'],
    ['and/or /words/', null, 'and/or <i>words</i>'],
    ['and/or _words_', null, 'and/or <i>words</i>'],
    ['and/or /words/ and/or', null, 'and/or <i>words</i> and/or'],
    ['and/or _words_ and/or', null, 'and/or <i>words</i> and/or'],
  ],

  'links': [
    ['http://rpnow.net', null, '<a href="http://rpnow.net" target="_blank">http://rpnow.net</a>'],
    ['http://rpnow.net?x=1&y=2+_-5', null, '<a href="http://rpnow.net?x=1&y=2+_-5" target="_blank">http://rpnow.net?x=1&y=2+_-5</a>'],
  ],

  'mdash': [
    ['HI-HI', null, 'HI-HI'],
    ['HI--HI', null, 'HI\&mdash;HI'],
  ]
};

for (const [testName, pairs] of Object.entries(tests)) {
  test(testName, t => {
    for (const [input, color, expected] of pairs) {
      const html = formatMessage(input, color);
      t.is(html, expected);
    }
  });
}
