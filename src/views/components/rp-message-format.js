module.exports = function transformRpMessage(str, color) {
  // how to render a specific type of tag
  var renderTag = {
    'ACTION': {
      open: function(color) {
        var contrast = color ? (tinycolor(color).isLight() ? 'black' : 'white') : 'auto';
        return '<span class="message-star-tag" style="background-color:'+color+'; color:'+contrast+'">*';
      },
      close: '*</span>'
    },
    'BOLD': { open: function() { return '<b>' }, close: '</b>' },
    'ITC': { open: function() { return '<i>' }, close: '</i>' },
    'BOLDITC': { open: function() { return '<b><i>' }, close: '</i></b>' },
    'STRIKE': { open: function() { return '<del>' }, close: '</del>' },
  };

  function escape(str) {
    return str.replace(/[&<>"']/g, function (char) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[char];
    });
  }

  // tokens that create tags
  var tagLexers = [
    { r: /^(https?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i, replace: function(link) { return '<a href="'+link+'" target="_blank">'+link+'</a>'; } },
    { r: /^(____+)/ }, // if there's a lot of _, don't treat it as anything
    { r: /^(\/\/+)/ }, // same with lots of /
    { r: /^(___)/, tag: 'BOLDITC' },
    { r: /^(__)/, tag: 'BOLD' },
    { r: /^(_)/, tag: 'ITC' },
    { r: /^(\/)/, tag: 'ITC' },
    { r: /^(~~)/, tag: 'STRIKE' },
    { r: /^(\*)/, tag: 'ACTION' },
    { r: /^(\r\n|\n\r|\r|\n)/, replaceWith: '<br>' },
    { r: /^(--)/, replaceWith: '&mdash;' },
    { r: /^(\s)/ },
    { r: /^(\S[^\s-]*[^\s_\/~\*-,.?!"])(?:\s|$)/, replace: escape }, // attempt to ignore symbols like /, _, etc inside of words
    { r: /^(.)/, replace: escape },
  ];

  // processed tokens
  var tokens = [];
  // currently open tags on a stack
  var tagTokenStack = [];

  // iterate through the string...
  while (str.length > 0) {
    var match;
    var tag;
    var replace;
    var replaceWith;

    // see if the front of the string matches any token types
    for (var i = 0; i < tagLexers.length; ++i) {
      var tagLexer = tagLexers[i];
      var result = tagLexer.r.exec(str);
      if (result) {
        match = result[1];
        replace = tagLexer.replace;
        replaceWith = tagLexer.replaceWith;
        tag = tagLexer.tag;
        break;
      }
    }

    // determine what to do with what we got from the front of the string
    if (tag) {
      // if it's an open/close tag, do some stack logic with it
      var opener = tagTokenStack.filter(function(t) { return t.match === match; })[0];
      var openerStackIdx = tagTokenStack.indexOf(opener);
      if (openerStackIdx >= 0) {
        // closing tag found!
        // discard all tags atop this one
        tagTokenStack.slice(openerStackIdx + 1).forEach(function(t) {
          var idx = tokens.indexOf(t);
          tokens[idx] = t.match;
        });
        // apply both tags
        tokens[tokens.indexOf(opener)] = renderTag[tag].open(color);
        tokens.push(renderTag[tag].close);
        // pop stack
        tagTokenStack = tagTokenStack.slice(0, openerStackIdx);
      } else if (tagTokenStack.filter(function(t) { return t.tag === tag })[0]) {
        // same tag, but different syntax? = ignore it
        // example: "this should /not_ be italics"
        tokens.push(match);
      } else {
        // opening tags
        var token = { tag: tag, match: match };
        tokens.push(token);
        tagTokenStack.push(token);
      }
    } else if (replace) {
      // replace text using a function
      tokens.push(replace(match));
    } else if (replaceWith) {
      // replace text with a string
      tokens.push(replaceWith);
    } else if (match) {
      // just add it as is
      tokens.push(match);
    } else {
      throw new Error('Could not match ' + str[0]);
    }

    // cut off the processed part of the string
    str = str.substr(match.length);
  }

  // discard remaining open tags
  tagTokenStack.forEach(function(t) {
    var idx = tokens.indexOf(t);
    tokens[idx] = t.match;
  });

  return tokens.join('');
};
