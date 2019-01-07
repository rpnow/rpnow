module.exports = {
  components: {
    'rp-message': require('./components/rp-message.vue'),
    'image-dialog': require('./components/image-dialog.vue'),
    'chara-dialog': require('./components/chara-dialog.vue'),
    'send-box': require('./components/send-box.vue'),
    'chara-drawer': require('./components/chara-drawer.vue'),
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
      // main menu
      showMainMenu: false,
      // download dialog
      showDownloadDialog: false,
      downloadOOC: false,
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
    this.initializeAuth()
      .then((function() {
        return axios.get('/api/rp/' + this.rpCode)
      }).bind(this))
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
  },

  methods: {
    initializeAuth: require('./components/user'),
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
    sendMessage: function() {
      return this.postUpdate('msgs', data);
    },
    editMessage: function(_id, body) {
      return this.putUpdate(_id, 'msgs', body);
    },
    sendChara: function() {
      return (this.charaDialogId == null) ?
        this.postUpdate('charas', data)
          .then((function(data) {
            this.selectCharacter('chara', data._id);
          }).bind(this)) :
        this.putUpdate(this.charaDialogId, 'charas', data)
    },
    sendImage: function(_id, data) {
      return (_id == null) ?
        this.postUpdate('msgs', data) : 
        this.putUpdate(_id, 'msgs', data);
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
    openMainMenu: function() {
      this.showMainMenu = true;
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
  }
};
