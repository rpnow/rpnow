var rpCode = location.pathname.match(/\/rp\/([^\/]+)/)[1];

var jsonStorage = (function() {
  var fakeStorage = {};

  return {
    get: function(key, defaultValue) {
      var str;
      try {
        str = localStorage.getItem(key);
      } catch (ex) {
        str = fakeStorage[key];
      }
      if (str == null) return defaultValue;
      return JSON.parse(str);
    },
    set: function(key, obj) {
      var str = JSON.stringify(obj);
      try {
        localStorage.setItem(key, str);
      } catch (ex) {
        fakeStorage[key] = str;
      }
    }
  }
})();

// var audioDir = '/client-files/assets/sounds/';
// var noises = [
//   {'name': 'Off', 'audio': null},
//   {'name': 'Typewriter', 'audio': new Audio(audioDir + 'typewriter.mp3')},
//   {'name': 'Page turn', 'audio': new Audio(audioDir + 'pageturn.mp3')},
//   {'name': 'Chimes', 'audio': new Audio(audioDir + 'chimes.mp3')},
//   {'name': 'Woosh', 'audio': new Audio(audioDir + 'woosh.mp3')},
//   {'name': 'Frog block', 'audio': new Audio(audioDir + 'frogblock.mp3')},
//   {'name': 'Classic alert', 'audio': new Audio(audioDir + 'alert.mp3')},
// ];

/**
 * Tries to determine if this is a desktop keyboard by measuring
 * the average length of time between keydown and keyup events on
 * the page. If it's greater than 25 ms, it's probably desktop.
 */
isProbablyDesktopKeyboard = (function() {
  var averageKeypressDuration = 25;

  window.addEventListener('keydown', function() {
    var start = Date.now();

    function removeListenersForThisKey() {
      window.removeEventListener('keydown', pressedAnotherKeyBeforeReleasingThisOne);
      window.removeEventListener('keyup', keyup);
    }

    function pressedAnotherKeyBeforeReleasingThisOne() {
      removeListenersForThisKey();
    }
    
    function keyup() {
      removeListenersForThisKey();

      var myDuration = Date.now() - start;
      averageKeypressDuration = averageKeypressDuration*0.9 + myDuration*0.1
    }

    window.addEventListener('keydown', pressedAnotherKeyBeforeReleasingThisOne);
    window.addEventListener('keyup', keyup);
  });

  return function isProbablyDesktopKeyboard() {
    return averageKeypressDuration >= 25;
  };
})(),

new Vue({
  el: '#rp-chat',
  components: {
    'rp-message': httpVueLoader('/client-files/rp-message.vue'),
    'spectrum-colorpicker': {
      props: ['value'],
      template: '<input ref="el">',
      mounted: function() {
        var vm = this;
        jQuery(this.$refs.el).spectrum({
          color: this.value,
          showInput: true,
          preferredFormat: "hex",
          move: function(color) {
            vm.$emit('input', color.toHexString());
          },
          change: function(color) {
            vm.$emit('input', color.toHexString());
          },
          hide: function(color) {
            vm.$emit('input', color.toHexString());
          },
        });
      },
      watch: {
        value: function(value) {
          jQuery(this.$refs.el).spectrum('set', value);
        }
      }
    }
  },
  data: {
    linkToHere: location.href,
    rpCode: rpCode,
    rp: null,
    loadError: null,
    isNewRp: false,
    msgBoxText: jsonStorage.get('rpnow.'+rpCode+'.msgBoxContent', ''),
    currentMsgType: jsonStorage.get('rpnow.'+rpCode+'.msgBoxType', 'narrator'),
    currentCharaId: jsonStorage.get('rpnow.'+rpCode+'.msgBoxCharaId', null),
    charaDialogId: null,
    charaDialogName: '',
    charaDialogColor: '#dddddd',
    showCharacterMenu: false,
    showCharacterDialog: false,
    overridePressEnterToSend: jsonStorage.get('rpnow.global.pressEnterToSend', null),
    showMainMenu: false,
    nightMode: jsonStorage.get('rpnow.global.nightMode', false),
    showMessageDetails: jsonStorage.get('rpnow.global.showMessageDetails', true),
    isScrolledToBottom: true,
    browserAlerts: jsonStorage.get('rpnow.global.browserAlerts', false),
    showDownloadDialog: false,
    downloadOOC: jsonStorage.get('rpnow.global.downloadOOC', false),
    showImageDialog: false,
    imageDialogId: null,
    imageDialogUrl: '',
    imageDialogIsChecking: false,
    imageDialogIsValid: false,
    showAudioDialog: false,
    audioDialogId: null,
    audioDialogUrl: '',
    nowPlayingAudio: null,
    consecutiveNetworkFailures: 0,
  },
  computed: {
    charasById: function() {
      return this.rp.charas.reduce(function(map, chara) {
        map[chara._id] = chara;
        return map;
      }, {});
    },
    currentChara: function() {
      if (this.currentMsgType !== 'chara') return undefined;
      return this.charasById[this.currentCharaId]
    },
    currentVoiceName: function() {
      if (this.currentMsgType === 'narrator') return 'Narrator';
      if (this.currentMsgType === 'ooc') return 'Out of Character';
      return this.currentChara.name;
    },
    currentCharaColor: function() {
      if (this.currentMsgType !== 'chara') return undefined;
      return this.currentChara.color;
    },
    messageBoxClass: function() {
      return 'send-box-' + this.currentMsgType;
    },
    messageBoxStyle: function() {
      if (this.currentMsgType !== 'chara') return {};
      else return {
        'background-color': this.currentCharaColor,
        'color': tinycolor(this.currentCharaColor).isLight() ? 'black' : 'white',
      };
    },
    isMsgBoxSending: function() {
      return false;
    },
    msgBoxValid: function() {
      return this.msgBoxText.trim().length > 0;
    },
    imageDialogIsWellFormed: function() {
      var urlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;
      return !!this.imageDialogUrl.match(urlRegex);
    },
    audioDialogUrlTransformed: function() {
      var youtubeRegex = /^https?:\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([-\w]+)/i;
      if (this.audioDialogUrl.match(youtubeRegex)) {
        var id = this.audioDialogUrl.match(youtubeRegex)[1];
        return 'https://www.youtube.com/embed/'+id+'?autoplay=1&loop=1&playlist='+id;
      }
      var youtubePlaylistRegex  = /^https?:\/\/(?:www\.)?youtube\.com\/playlist\?list=([-\w]+)/i;
      if (this.audioDialogUrl.match(youtubePlaylistRegex)) {
        var id = this.audioDialogUrl.match(youtubePlaylistRegex)[1];
        return 'https://www.youtube.com/embed/videoseries?list='+id+'&autoplay=1&loop=1';
      }
      var anyUrlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;
      if (this.audioDialogUrl.match(anyUrlRegex)) {
        return this.audioDialogUrl;
      }
      return null;
    }
  },
  methods: {
    fetchUpdates: function() {
      var scheduleNextUpdate = (function() {
        setTimeout(this.fetchUpdates.bind(this), 5000);
      }).bind(this);

      axios.get('/api/rp/' + this.rpCode + '/updates?since=' + this.rp.lastEventId)
        .then((function(res) {
          this.consecutiveNetworkFailures = 0;
          this.rp.lastEventId = res.data.lastEventId;

          res.data.updates.forEach((function(update) {
            this.updateState(update);
          }).bind(this));

          scheduleNextUpdate();
        }).bind(this))
        .catch((function(err) {
          if (!err.response.status) {
            this.consecutiveNetworkFailures++;
            scheduleNextUpdate();
          } else {
            this.rp = null;
            this.loadError = err;
          }
        }).bind(this))
    },
    updateState: function(update) {
      var arr = this.rp[update.type];

      arr = arr.filter(function(item) { return item._id !== update.data._id });
      arr.push(update.data);
      arr.sort(function(a, b) { return a._id < b._id ? -1 : 1 });

      // keep no more than 60 messages
      if (update.type === 'msgs') {
        arr = arr.slice(-60);
      }

      this.rp[update.type] = arr;
    },
    postUpdate: function(type, body) {
      return axios.post('/api/rp/' + this.rpCode + '/' + type, body)
        .then((function(res) {
          this.updateState({ type: type, data: res.data });
          return res.data;
        }).bind(this));
    },
    putUpdate: function(_id, type, body) {
      return axios.put('/api/rp/' + this.rpCode + '/' + type + '/' + _id, body)
        .then((function(res) {
          this.updateState({ type: type, data: res.data });
          return res.data;
        }).bind(this));
    },
    applyShortcutsToMessage: function(msg) {
      if (msg.type !== 'ooc') {
        var oocShortcuts = [
          /^\({2,}\s*(.*?[^\s])\s*\)*$/g, // (( message text ))
          /^\{+\s*(.*?[^\s])\s*\}*$/g, // { message text }, {{ message text }}, ...
          /^\/\/\s*(.*[^\s])\s*$/g // //message text
        ];
        for (var i = 0; i < oocShortcuts.length; ++i) {
          var regex = oocShortcuts[i];
          var match = regex.exec(msg.content);
          if (match) {
            return { type: 'ooc', content: match[1] };
          }
        }
      }
      return msg;
    },
    sendMessage: function() {
      var data = {
        content: this.msgBoxText,
        type: this.currentMsgType,
        charaId: this.currentCharaId || undefined,
      };

      data = this.applyShortcutsToMessage(data);

      this.postUpdate('msgs', data)
        .then((function() {
          this.msgBoxText = '';
        }).bind(this));
    },
    editMessage: function(_id, body) {
      this.putUpdate(_id, 'msgs', body);
    },
    sendChara: function() {
      var data = {
        name: this.charaDialogName,
        color: this.charaDialogColor,
      };
      if (this.charaDialogId == null) {
        this.postUpdate('charas', data)
          .then((function(data) {
            this.showCharacterDialog = false;
            this.selectCharacter('chara', data._id);
          }).bind(this));
      } else {
        this.putUpdate(this.charaDialogId, 'charas', data)
          .then((function(data) {
            this.showCharacterDialog = false;
          }).bind(this));
      }
    },
    sendImage: function() {
      if (!this.imageDialogIsValid) return;

      var data = {
        type: 'image',
        url: this.imageDialogUrl,
      }
      if (this.imageDialogId == null) {
        this.postUpdate('msgs', data)
      } else {
        this.putUpdate(this.imageDialogId, 'msgs', data)
      }

      this.showImageDialog = false;
    },
    sendAudio: function() {
      if (!this.audioDialogUrlTransformed) return;

      var data = {
        type: 'audio',
        url: this.audioDialogUrlTransformed,
      }
      if (this.audioDialogId == null) {
        this.postUpdate('msgs', data)
      } else {
        this.putUpdate(this.audioDialogId, 'msgs', data)
      }

      this.closeAudioDialog();
    },
    openCharacterMenu: function() {
      this.showCharacterMenu = true;
    },
    openCharacterDialog: function(chara) {
      if (chara != null) {
        this.charaDialogId = chara._id;
        this.charaDialogName = chara.name;
        this.charaDialogColor = chara.color;
      } else {
        this.charaDialogId = null;
        this.charaDialogName = '';
        // leave charaDialogColor as it was
      }
      this.showCharacterDialog = true;
    },
    closeCharacterDialog: function() {
      this.showCharacterDialog = false;
    },
    openImageDialog: function(msg) {
      if (msg != null) {
        this.imageDialogId = msg._id;
        this.imageDialogUrl = msg.url;
      } else {
        this.imageDialogId = null;
        this.imageDialogUrl = '';
      }
      this.showImageDialog = true;
    },
    openAudioDialog: function(msg) {
      if (msg != null) {
        this.audioDialogId = msg._id;
        this.audioDialogUrl = msg.url;
      } else {
        this.audioDialogId = null;
        this.audioDialogUrl = '';
      }
      this.showAudioDialog = true;
    },
    closeAudioDialog: function(msg) {
      this.showAudioDialog = false;
      this.audioDialogUrl = '';
    },
    openDownloadDialog: function() {
      this.showDownloadDialog = true;
    },
    closeDownloadDialog: function() {
      this.showDownloadDialog = false;
    },
    downloadTxt: function() {
      if (this.downloadOOC) {
        window.open('/api/rp/'+this.rp.readCode+'/download.txt?includeOOC=true', '_blank').focus();
      } else {
        window.open('/api/rp/'+this.rp.readCode+'/download.txt', '_blank').focus();
      }
    },
    selectCharacter: function(type, charaId) {
      this.currentMsgType = type;
      this.currentCharaId = (type === 'chara') ? charaId : null;
      if (window.matchMedia("(max-width: 1023px)").matches) {
        this.showCharacterMenu = false;
      }
    },
    showFormatGuide: function() {
      window.open('/format', '_blank').focus();
    },
    openMainMenu: function() {
      this.showMainMenu = true;
    },
    resizeTextareaOnInput: function($event, minRows, maxRows) {
      var el = $event.target;
      while (el.rows > minRows && el.scrollHeight <= el.offsetHeight) {
        el.rows = el.rows - 1;
      }
      while (el.rows < maxRows && el.scrollHeight > el.offsetHeight) {
        el.rows = el.rows + 1;
      }
    },
    onScroll: function() {
      var el = document.querySelector('#messages');
      var bottomDistance = el.scrollHeight - el.scrollTop - el.offsetHeight;
      this.isScrolledToBottom = bottomDistance < 31;
      if (this.isScrolledToBottom && this.unreadMessagesIndicator) {
        this.unreadMessagesIndicator = false;
      }
    },
    rescrollToBottom: function() {
      if (!this.isScrolledToBottom) return;

      this.$nextTick((function() {
        var el = document.querySelector('#messages');
        el.scrollTop = el.scrollHeight - el.offsetHeight;
      }).bind(this));
    },
    doMessageAlert: (function() {
      var oldTitle = null;
      return function(msg) {
        // desktop notifications
        if (this.browserAlerts) {
          try {
            new Notification('New post from "' + this.rp.title + '"', {
              body: msg.content || undefined,
              icon: msg.url || undefined,
              tag: msg._id,
            });
          } catch (ex) {
            // Chrome on Android (at least Android 4-7) throws an error
            // "Failed to construct 'Notification': Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead."
            // No action needed
          }
        }

        // page title
        if (!oldTitle) oldTitle = document.title;
        document.title = '* New post...';
        document.addEventListener('visibilitychange', function resetTitle() {
          document.title = oldTitle;
          document.removeEventListener('visibilitychange', resetTitle);
        });
      }
    })(),
    pressEnterToSend: function() {
      if (this.overridePressEnterToSend != null) return this.overridePressEnterToSend;
      return isProbablyDesktopKeyboard();
    },
    playAudio: function(msg) {
      this.nowPlayingAudio = msg;
    },
  },
  created: function() {
    axios.get('/api/rp/' + this.rpCode)
      .then((function(res) {
        this.rp = res.data;

        document.title = this.rp.title + ' | RPNow';
        this.isNewRp = this.rp.msgs.length === 0;

        this.fetchUpdates();
      }).bind(this))
      .catch((function(err) {
        if (err.response.status === 403) {
          this.loadError = 'This code can only be used to view an RP, not to write one.'
        } else {
          this.loadError = 'Check the URL and try again.';
        }
      }).bind(this));
  },
  watch: {
    'nightMode': jsonStorage.set.bind(null, 'rpnow.global.nightMode'),
    'overridePressEnterToSend': jsonStorage.set.bind(null, 'rpnow.global.pressEnterToSend'),
    'showMessageDetails': jsonStorage.set.bind(null, 'rpnow.global.showMessageDetails'),
    'browserAlerts': [
      jsonStorage.set.bind(null, 'rpnow.global.browserAlerts'),
      function(on) {
        if (!on) return;

        if (!('Notification' in window)) {
          this.browserAlerts = false;
          alert('Notifications are not supported in this browser.');
        } else if (Notification.permission === 'denied') {
          this.browserAlerts = false;
          alert('Could not get notification permissions.')
        } else if (Notification.permission === 'default') {
          this.browserAlerts = false;
          Notification.requestPermission().then((function(result) {
            if (result === 'granted') this.browserAlerts = true;
          }).bind(this));
        }
      }
    ],
    'downloadOOC': jsonStorage.set.bind(null, 'rpnow.global.downloadOOC'),
    'msgBoxText': jsonStorage.set.bind(null, 'rpnow.'+rpCode+'.msgBoxContent'),
    'currentMsgType': jsonStorage.set.bind(null, 'rpnow.'+rpCode+'.msgBoxType'),
    'currentCharaId': jsonStorage.set.bind(null, 'rpnow.'+rpCode+'.msgBoxCharaId'),
    'rp.msgs': function(msgs, oldMsgs) {
      if (msgs == null || oldMsgs == null) return;

      if (msgs.length > oldMsgs.length) {
        if (!this.isScrolledToBottom) {
          this.unreadMessagesIndicator = true;
        }
        if (document.visibilityState !== 'visible') {
          this.doMessageAlert(msgs[msgs.length - 1]);
        }
      }
    },
    'imageDialogUrl': function(url) {
      if (!this.imageDialogIsWellFormed) {
        this.imageDialogIsChecking = false;
        this.imageDialogIsValid = false;
        return;
      }

      this.imageDialogIsChecking = true;
      this.imageDialogIsValid = false;

      new Promise(function(resolve, reject) {
        var img = document.createElement('img');

        img.addEventListener('load', function() { resolve(true) });
        img.addEventListener('error', function() { resolve(false) });
        img.addEventListener('abort', function() { resolve(false) });
        setTimeout(function() { resolve(false) }, 45000);

        img.src = url;
      }).then((function(result) {
        // ignore if another change has happened since this one
        if (this.imageDialogUrl !== url) return;

        this.imageDialogIsChecking = false;
        this.imageDialogIsValid = result;
      }).bind(this));
    },
  }
});
