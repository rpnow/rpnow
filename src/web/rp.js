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

var audioDir = '/client-files/assets/sounds/';
var noises = [
  {'name': 'Off', 'audio': null},
  {'name': 'Typewriter', 'audio': new Audio(audioDir + 'typewriter.mp3')},
  {'name': 'Page turn', 'audio': new Audio(audioDir + 'pageturn.mp3')},
  {'name': 'Chimes', 'audio': new Audio(audioDir + 'chimes.mp3')},
  {'name': 'Woosh', 'audio': new Audio(audioDir + 'woosh.mp3')},
  {'name': 'Frog block', 'audio': new Audio(audioDir + 'frogblock.mp3')},
  {'name': 'Classic alert', 'audio': new Audio(audioDir + 'alert.mp3')},
];

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
    demo: false,
    linkToHere: location.href,
    rpCode: rpCode,
    rp: null,
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
    notificationNoise: jsonStorage.get('rpnow.global.notificationNoise', 1),
    showDownloadDialog: false,
    downloadOOC: jsonStorage.get('rpnow.global.downloadOOC', false),
    showImageDialog: false,
    imageDialogId: null,
    imageDialogUrl: '',
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
    }
  },
  methods: {
    fetchUpdates: function() {
      var scheduleNextUpdate = (function() {
        setTimeout(this.fetchUpdates.bind(this), 5000);
      }).bind(this);

      axios.get('/api/rp/' + this.rpCode + '/updates?since=' + this.rp.lastEventId)
        .then((function(res) {
          this.rp.lastEventId = res.data.lastEventId;

          res.data.updates.forEach((function(update) {
            this.updateState(update);
          }).bind(this));

          scheduleNextUpdate();
        }).bind(this))
        .catch((function(err) {
          console.error(err);
          scheduleNextUpdate();
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
      var data = {
        type: 'image',
        url: this.imageDialogUrl,
      }
      if (this.imageDialogId == null) {
        this.postUpdate('msgs', data)
          .then((function(data) {
            this.showImageDialog = false;
          }).bind(this));
      } else {
        this.putUpdate(this.imageDialogId, 'msgs', data)
          .then((function(data) {
            this.showImageDialog = false;
          }).bind(this));
      }
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
    openDownloadDialog: function() {
      this.showDownloadDialog = true;
    },
    closeDownloadDialog: function() {
      this.showDownloadDialog = false;
    },
    downloadTxt: function() {
      if (this.downloadOOC) {
        window.open('/api/rp/'+this.rpCode+'/download.txt?includeOOC=true', '_blank').focus();
      } else {
        window.open('/api/rp/'+this.rpCode+'/download.txt', '_blank').focus();
      }
    },
    selectCharacter: function(type, charaId) {
      this.currentMsgType = type;
      this.currentCharaId = (type === 'chara') ? charaId : null;
      this.showCharacterMenu = false;
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
        if ('Notification' in window && Notification.permission === 'granted') {
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

        // attempt to play noise
        var audio = noises[this.notificationNoise].audio;
        if (audio) {
          var audioPromise = audio.play();
          if (audioPromise !== undefined) {
            audioPromise.catch(function(error) {
              // TODO handle audio play failure
              console.log('Could not play an audio alert')
            });
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
  },
  created: function() {
    axios.get('/api/rp/' + this.rpCode)
      .then((function(res) {
        this.rp = res.data;

        document.title = this.rp.title + ' | RPNow';
        this.isNewRp = this.rp.msgs.length === 0;

        this.fetchUpdates();
      }).bind(this));
  },
  watch: {
    'nightMode': jsonStorage.set.bind(null, 'rpnow.global.nightMode'),
    'overridePressEnterToSend': jsonStorage.set.bind(null, 'rpnow.global.pressEnterToSend'),
    'showMessageDetails': jsonStorage.set.bind(null, 'rpnow.global.showMessageDetails'),
    'notificationNoise': jsonStorage.set.bind(null, 'rpnow.global.notificationNoise'),
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
    }
  }
});
