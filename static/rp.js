/* global $ moment io */
var rp = (function() {
  var rp = {};
  
  var serverRootPath = (function() {
    var scripts = document.getElementsByTagName("script"),
      src = scripts[scripts.length-1].src;
    return src.substring(0, src.lastIndexOf('/'));
  })();
  
  // ajax requests
  // pieced together from: http://stackoverflow.com/questions/8567114/
  function ajax(url, method /*, data, callback */) {
    // get optional args
    var callback = null;
    var data = null;
    if(typeof(arguments[arguments.length-1]) === 'function')
      callback = arguments[arguments.length-1];
    if(arguments.length >= 3 && typeof(arguments[2]) === 'object')
      data = arguments[2];
    // request URL
    var reqUrl = serverRootPath + '/api/v1/rps/' + url;
    data = data || {};
    var req = new XMLHttpRequest();
    req.overrideMimeType('application/json');
    // callback function on success
    if(callback) req.onreadystatechange = function() {
      if(req.readyState === XMLHttpRequest.DONE && (''+req.status).startsWith('20')) {
        callback(req.responseText ? JSON.parse(req.responseText): '', req);
      }
    };
    // generate query string from data
    var queryString = null;
    if(data) {
      var query = [];
      for (var key in data) {
        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
      }
      queryString = query.join('&');
    }
    // apply things to request
    if(method === 'GET' && queryString) reqUrl += '?' + queryString;
    req.open(method, reqUrl, true);
    if(method === 'POST') req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    // send
    if(method === 'GET' || !queryString) req.send();
    else req.send(queryString);
  }

  // load a single page
  rp.fetchPage = function(url, pageNum, callback) {
    ajax(url + '/page/' + pageNum + '.json', 'GET', { page: pageNum }, function(data) {
      var charas = data.charas
        .map(function(chara) { return new Chara(chara); })
        .reduce(function(arr, chara) { arr[chara.id] = chara; return arr; }, []);
      var msgs = data.msgs.map(function(msg) {
        msg.chara = charas[msg.charaId];
        return new Message(msg);
      });
      // callback
      callback({ title: data.title, desc: data.desc, msgs: msgs, charas: charas, numPages: data.numPages });
    });
  };

  // load a chat object
  rp.chat = function(url, onLoad) {
    var chat = {};
    // chat variables
    var title, desc;
    var msgs = [];
    var charas = [];
    var updateCounter;
    var maxMsgs;
    var stopped = false;
    // events
    var onMessage, onChara; /* onUpdateMessage, onUpdateChara, onUnloadMessage; */
    chat.onMessage = function(callback) { onMessage = callback; };
    chat.onChara = function(callback) { onChara = callback; };
    // properties
    Object.defineProperties(chat, {
      'url': {value: url},
      'title': {get: function() { return title; }},
      'desc': {get: function() { return desc; }},
      'charas': {get: function() { return charas; }},
      'msgs': {get: function() { return msgs; }},
      'maxMsgs': {get: function() { return maxMsgs; }}
    });
    
    var socket = io();
    socket.emit('join rp', url, function(data) {
      // set variables
      title = data.title;
      desc = data.desc;
      charas = data.charas.map(function(chara){ return new Chara(chara); });
      msgs = data.msgs.map(function(msg){
        msg.chara = charas[msg.charaId];
        return new Message(msg);
      });
      updateCounter = data.updateCounter;
      maxMsgs = data.postsPerPage;
      // callback
      if(onLoad) onLoad(chat);
    });
    socket.on('add message', function(msg) {
      msg.chara = charas[msg.charaId];
      msg = new Message(msg);
      msgs.push(msg);
      onMessage.call(this, msg);
    });
    socket.on('add character', function(chara) {
      chara = new Chara(chara);
      charas[chara.id] = chara;
      onChara.call(this, chara);
    });
    
    // send message
    chat.sendMessage = function(content, voice, callback) {
      var msg = { content: content };
      if(voice instanceof Chara) {
        msg['type'] = 'chara';
        msg.charaId = voice.id;
      }
      else {
        msg['type'] = voice;
      }
      socket.emit('add message', msg, function(receivedMsg) {
        if (!stopped) callback(receivedMsg);
      });
    };
    // send character
    chat.sendChara = function(name, color, callback) {
      var chara = { name: name, color: color };
      socket.emit('add character', chara, function(recievedChara) {
        if (!stopped) callback(recievedChara);
      });
    };
    chat.stop = function() {
      stopped = true;
    };
  };

  // classes
  function Message(data) {
    Object.defineProperties(this, {
      'id': {value: data.id},
      'content': {value: data.content},
      'timestamp': {value: data.timestamp},
      'user': {value: new User(data.ipid)},
      'type': {value: data.type},
      'chara': {value: data.chara},
      'createElement': {value: function(timeFormat) {
        // outer element with the appropriate class
        var el = $('<div/>', {
          'class': ({
            'narrator':'message message-narrator',
            'chara':'message message-chara',
            'ooc':'message message-ooc'
          })[this.type]
        });
        // character-specific
        if(this.type === 'chara') {
          // style
          el.css({'background-color':this.chara.color, 'color':this.chara.textColor});
          // nametag
          el.append($('<div/>', {
            'class': 'name',
            text: this.chara.name
          }));
        }
        // post details
        var ts = moment.unix(this.timestamp);
        if(!timeFormat || timeFormat === 'absolute') ts = ts.format('lll');
        else if(timeFormat === 'relative') ts = ts.calendar();
        else throw new Error('unknown time format');
        el.append(
          $('<div/>', {'class': 'message-details'})
          // color ip box
          .append(this.user.createIcon())
          // timestamp
          .append($('<span/>', {
            'class': 'timestamp',
            text: ts
          }))
        );
        // message body
        el.append($('<div/>', {
          'class': 'content',
          html: Message.formatContentReceived(this.content, this.chara)
        }));
        return el;
      }}
    });
    if(this.type==='chara') Object.defineProperties(this, {
      'charaId': {value: +data.charaId},
      'chara': {value: data.chara}
    });

  }
  function contrastColor(color) {
    //YIQ algorithm modified from:
    // http://24ways.org/2010/calculating-color-contrast/
    var components = [1,3,5].map(i => parseInt(color.substr(i, 2), 16));
    var yiq = components[0]*0.299 + components[1]*0.597 + components[2]*0.114;
    return (yiq >= 128) ? 'black' : 'white';
  }
  function Chara(data) {
    Object.defineProperties(this, {
      'id': {value: data.id},
      'name': {value: data.name},
      'color': {value: data.color},
      'textColor': {value: contrastColor(data.color)},
      'user': {value: new User(data.ipid)},
      'createButton': {value: function(callback) {
        return $('<button/>', {
          text: this.name,
          'type': 'button',
          'style': 'background-color:' + this.color + ';' + 'color:' + this.textColor
        }).click(callback);
      }}
    });
  }
  function User(ipid) {
    Object.defineProperties(this, {
      'colors': {value: [
        '#'+ipid.substr(0,6),
        '#'+ipid.substr(6,6),
        '#'+ipid.substr(12,6)
      ]},
      'createIcon': {value: function(){
        return $('<span/>', { 'class': 'color-ip-box' })
          .append($('<span/>', { 'style': 'background-color: ' + this.colors[0] }))
          .append($('<span/>', { 'style': 'background-color: ' + this.colors[1] }))
          .append($('<span/>', { 'style': 'background-color: ' + this.colors[2] }));
      }}
    });
  }

  // format message content
  Message.formatContentReceived = function(text, chara) {
    // escape special characters
    var str = escapeHtml(text);
    // urls
    // http://stackoverflow.com/a/3890175
    str = str.replace(
      /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim,
      '<a href="$1" target="_blank">$1</a>'
    );
    // actions
    if(chara) {
      str = str.replace(/\*([^\r\n\*_]+)\*/g, '<span class="action" style="background-color:' + chara.color + ';' + 'color:' + chara.textColor + '">*$1*</span>');
    }
    // bold
    str = str.replace(/(^|\s|(?:&quot;))__([^\r\n_]+)__([\s,\.\?!]|(?:&quot;)|$)/g, '$1<b>$2</b>$3');
    // italix
    str = str.replace(/(^|\s|(?:&quot;))_([^\r\n_]+)_([\s,\.\?!]|(?:&quot;)|$)/g, '$1<i>$2</i>$3');
    str = str.replace(/(^|\s|(?:&quot;))\/([^\r\n\/>]+)\/([\s,\.\?!]|(?:&quot;)|$)/g, '$1<i>$2</i>$3');
    // both!
    str = str.replace(/(^|\s|(?:&quot;))___([^\r\n_]+)___([\s,\.\?!]|(?:&quot;)|$)/g, '$1<b><i>$2</i></b>$3');
    // line breaks
    // http://stackoverflow.com/questions/2919337/jquery-convert-line-breaks-to-br-nl2br-equivalent
    str = str.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
    // mdash
    str = str.replace(/--/g, '&mdash;');

    // done.
    return str;
  };

  // escape html special chars from AJAX updates
  //  http://stackoverflow.com/questions/1787322/
  function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }
  
  return rp;
})();

