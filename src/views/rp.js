module.exports = {
  components: {
    // rp message component: 
    'rp-message': require('./components/rp-message.vue'),
    // adapt jquery colorpicker component for vue
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

  data: function() {
    return {
      // rp data
      rpCode: null,
      rp: null,
      loadError: null,
      // rp ui
      isNewRp: false,
      isScrolledToBottom: true,
      unreadMessagesIndicator: false,
      // connection status
      consecutiveNetworkFailures: 0,
      // options
      overridePressEnterToSend: null,
      nightMode: false,
      showMessageDetails: true,
      browserAlerts: false,
      // message box
      msgBoxText: '',
      currentMsgType: 'narrator',
      currentCharaId: null,
      isMsgBoxSending: false,
      // main menu
      showMainMenu: false,
      // chara selector
      showCharacterMenu: false,
      // chara dialog
      showCharacterDialog: false,
      charaDialogId: null,
      charaDialogName: '',
      charaDialogColor: '#dddddd',
      // download dialog
      showDownloadDialog: false,
      downloadOOC: false,
      // image post dialog
      showImageDialog: false,
      imageDialogId: null,
      imageDialogUrl: '',
      imageDialogIsChecking: false,
      imageDialogIsValid: false,
      // if any dialog is in the process of sending
      isDialogSending: false,
    }
  },

  // localStorage reactivity
  beforeMount: function() {
    // get rpCode from URL
    this.rpCode = location.pathname.match(/\/rp\/([^\/]+)/)[1];

    // store and retrieve json as objects in localStorage
    // (or memory if localStorage doesn't work)
    var fakeStorage = {};

    function getJson(key) {
      var str;
      try {
        str = localStorage.getItem(key);
      } catch (ex) {
        str = fakeStorage[key];
      }
      if (str == null) return null;
      return JSON.parse(str);
    }
    function saveJsonFn(key) {
      return function setter(obj) {
        var str = JSON.stringify(obj);
        try {
          localStorage.setItem(key, str);
        } catch (ex) {
          fakeStorage[key] = str;
        }
      }
    }

    // now, initialize these props from localStorage, and watch them
    var watchProps = {
      overridePressEnterToSend: 'rpnow.global.pressEnterToSend',
      nightMode: 'rpnow.global.nightMode',
      showMessageDetails: 'rpnow.global.showMessageDetails',
      browserAlerts: 'rpnow.global.browserAlerts',
      msgBoxText: 'rpnow.'+this.rpCode+'.msgBoxContent',
      currentMsgType: 'rpnow.'+this.rpCode+'.msgBoxType',
      currentCharaId: 'rpnow.'+this.rpCode+'.msgBoxCharaId',
      downloadOOC: 'rpnow.global.downloadOOC',
    };

    for (var prop in watchProps) {
      var key = watchProps[prop];

      var savedValue = getJson(key);
      if (savedValue != null) this[prop] = savedValue;

      this.$watch(prop, saveJsonFn(key));
    }
  },

  // when the page is loaded, load the rp
  mounted: function() {
    axios.get('/api/rp/' + this.rpCode)
      .then((function(res) {
        this.rp = res.data;

        document.title = this.rp.title + ' | RPNow';
        this.isNewRp = this.rp.msgs.length === 0;

        this.fetchUpdates();
      }).bind(this))
      .catch((function(err) {
        if (!err.response) {
          this.loadError = 'Failed to connect.';
        } else if (err.response.status === 403) {
          this.loadError = 'This code can only be used to view an RP, not to write one.'
        } else {
          this.loadError = 'Check the URL and try again.';
        }
      }).bind(this));

    // also initialize the localStorage stuff
  },

  computed: {
    linkToHere: function() {
      return location.href;
    },
    // rp charas grouped by id
    charasById: function() {
      return this.rp.charas.reduce(function(map, chara) {
        map[chara._id] = chara;
        return map;
      }, {});
    },
    // message box computed properties
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
    msgBoxValid: function() {
      return this.msgBoxText.trim().length > 0;
    },
    // image dialog computed properties
    imageDialogIsWellFormed: function() {
      var urlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;
      return !!this.imageDialogUrl.match(urlRegex);
    },
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
          if (!err.response) {
            this.consecutiveNetworkFailures++;
            scheduleNextUpdate();
          } else {
            this.rp = null;
            this.loadError = err.response;
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
        }).bind(this))
        .catch((function(err) {
          alert('Post failed! ' + err)
          throw err;
        }).bind(this));
    },
    putUpdate: function(_id, type, body) {
      return axios.put('/api/rp/' + this.rpCode + '/' + type + '/' + _id, body)
        .then((function(res) {
          this.updateState({ type: type, data: res.data });
          return res.data;
        }).bind(this))
        .catch((function(err) {
          alert('Edit failed! ' + err)
          throw err;
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
      var wasFocused = (document.activeElement === document.querySelector('#typing-area textarea'));

      var data = {
        content: this.msgBoxText,
        type: this.currentMsgType,
        charaId: this.currentCharaId || undefined,
      };

      data = this.applyShortcutsToMessage(data);

      this.isMsgBoxSending = true;

      this.postUpdate('msgs', data)
        .then((function() {
          this.msgBoxText = '';
        }).bind(this))
        .finally((function() {
          this.isMsgBoxSending = false;
          if (wasFocused) this.$nextTick(function() { document.querySelector('#typing-area textarea').focus() });
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

      this.showCharacterDialog = false;
      this.isDialogSending = true;

      if (this.charaDialogId == null) {
        this.postUpdate('charas', data)
          .then((function(data) {
            this.selectCharacter('chara', data._id);
          }).bind(this))
          .finally((function() {
            this.isDialogSending = false;
          }).bind(this));
      } else {
        this.putUpdate(this.charaDialogId, 'charas', data)
          .finally((function() {
            this.isDialogSending = false;
          }).bind(this));
      }
    },
    sendImage: function() {
      if (!this.imageDialogIsValid) return;

      var data = {
        type: 'image',
        url: this.imageDialogUrl,
      }

      this.showImageDialog = false;
      this.isDialogSending = true;

      if (this.imageDialogId == null) {
        this.postUpdate('msgs', data)
          .finally((function() {
            this.isDialogSending = false;
          }).bind(this));
      } else {
        this.putUpdate(this.imageDialogId, 'msgs', data)
          .finally((function() {
            this.isDialogSending = false;
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
      return this.isProbablyDesktopKeyboard();
    },
    isProbablyDesktopKeyboard: (function() {
      /**
       * Tries to determine if this is a desktop keyboard by measuring
       * the average length of time between keydown and keyup events on
       * the page. If it's greater than 25 ms, it's probably desktop.
       */
      return function() { return true };
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
  },

  watch: {
    // checks to make sure notifications are supported
    'browserAlerts': function(on) {
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
    },
    // actions for when a new message comes in
    'rp.msgs': function(msgs, oldMsgs) {
      if (msgs == null || oldMsgs == null) return;

      if (msgs.length > oldMsgs.length) {
        // if we're scrolled up, show an indicator
        if (!this.isScrolledToBottom) {
          this.unreadMessagesIndicator = true;
        }
        // alerts
        if (document.visibilityState !== 'visible') {
          this.doMessageAlert(msgs[msgs.length - 1]);
        }
      }
    },
    // validate the image dialog to see if an image can actually be loaded
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
};
