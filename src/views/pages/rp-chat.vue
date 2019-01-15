<template>
  <div id="rp-chat" :class="{'dark-theme':nightMode}">
    <div id="loading" v-if="rp == null && loadError == null">
      <i class="material-icons">hourglass_full</i>
      <span>Loading...</span>
    </div>

    <div id="loading" v-if="loadError != null">
      <i class="material-icons">error</i>
      <span>Failed to load RP! {{ loadError }}</span>
    </div>

    <template v-if="rp != null">
      <div id="main-column">
        <div id="connection-indicator" v-if="consecutiveNetworkFailures > 0">
          <i class="material-icons">error</i>
          Connection lost!
          <template v-if="consecutiveNetworkFailures > 1">
            (Failed to reconnect {{ consecutiveNetworkFailures }} times.)
          </template>
        </div>

        <div id="chat-header">
          <button class="icon-button" @click="openMainMenu">
            <i class="material-icons" title="RPNow menu">menu</i>
          </button>
          <span>
            {{ rp.title }}
          </span>
        </div>

        <div id="messages" @scroll="onScroll">
          <p id="archive-advice" v-if="rp.msgs.length >= 60">
            To view older messages, <a :href="'/read/'+rp.readCode" target="_blank">visit the archive.</a>
          </p>

          <div id="welcome" v-if="isNewRp">
            <h3>Welcome to your new RP!</h3>
            <p>
              Use this link to invite other participants, or to return to this room later. <strong>Don't lose it!</strong>
            </p>
            <p>
              <code><a :href="linkToHere">{{ linkToHere }}</a></code>
            </p>
          </div>

          <template v-for="msg of rp.msgs">
            <rp-message
              v-bind="msg"
              :key="msg._id"
              :chara="charasById[msg.charaId]"
              :press-enter-to-send="pressEnterToSend"
              :show-message-details="showMessageDetails"
              :send="sendMessage"
              :can-edit="canEdit(msg)"
              @resize="rescrollToBottom"
            ></rp-message>
          </template>
        </div>

        <send-box
          :voice="currentVoice"
          :charas-by-id="charasById"
          :press-enter-to-send="pressEnterToSend"
          :send="sendMessage"
          @open-character-menu="$refs.charaDrawer.open()"
        ></send-box>
      </div>

      <div id="main-menu" class="drawer drawer-left" v-show="showMainMenu">
        <div class="overlay overlay-drawer" @click="showMainMenu=false"></div>

        <div class="drawer-header">
          <span>RPNow</span>
          <button class="icon-button" @click="showMainMenu=false">
            <i class="material-icons" title="Close">close</i>
          </button>
        </div>
        <div class="drawer-body">
          <a class="drawer-item" :href="'/read/'+rp.readCode" target="_blank">
            <i class="material-icons">import_contacts</i>
            <span>Browse archive</span>
          </a>
          <button class="drawer-item" @click="openDownloadDialog()">
            <i class="material-icons">cloud_download</i>
            <span>Download .TXT</span>
          </button>
          <a class="drawer-item" :href="'/api/rp/'+rpCode+'/export'" target="_blank">
            <i class="material-icons">archive</i>
            <span>Export data</span>
          </a>
          <div class="drawer-divider"></div>
          <button class="drawer-item" @click="nightMode = !nightMode">
            <i class="material-icons">brightness_4</i>
            <span>Night mode</span>
            <i class="material-icons" v-html="nightMode?'check_box':'check_box_outline_blank'"></i>
          </button>
          <button class="drawer-item" @click="browserAlerts = !browserAlerts">
            <i class="material-icons">notifications</i>
            <span>Alerts</span>
            <i class="material-icons" v-html="browserAlerts?'check_box':'check_box_outline_blank'"></i>
          </button>
          <button class="drawer-item" @click="pressEnterToSend = !pressEnterToSend">
            <i class="material-icons">send</i>
            <span>Quick send</span>
            <i class="material-icons" v-html="pressEnterToSend?'check_box':'check_box_outline_blank'"></i>
          </button>
          <button class="drawer-item" @click="showMessageDetails = !showMessageDetails">
            <i class="material-icons">account_box</i>
            <span>Message details</span>
            <i class="material-icons" v-html="showMessageDetails?'check_box':'check_box_outline_blank'"></i>
          </button>
          <div class="drawer-divider"></div>
          <a class="drawer-item" href="/" target="_blank">
            <i class="material-icons">meeting_room</i>
            <span>Return home</span>
          </a>
          <a class="drawer-item" href="/terms" target="_blank">
            <i class="material-icons">account_balance</i>
            <span>Terms of use</span>
          </a>
        </div>
      </div>

      <chara-drawer ref="charaDrawer"
        :current-voice="currentVoice"
        :charas="rp.charas"
        :send="sendChara"
        :can-edit="canEdit"
        @select-voice="currentVoice = $event"
      ></chara-drawer>

      <div class="dialog-container overlay" @click="showDownloadDialog=false" v-show="showDownloadDialog">
        <div id="download-dialog" class="dialog" @click.stop>
          <h4>Download RP</h4>
          <p>
            <label>
              <input type="checkbox" v-model="downloadOOC">
              Include OOC messages
            </label>
          </p>
          <div>
            <button type="button" class="outline-button" @click="downloadTxt">Download</button>
            <button type="button" class="outline-button" @click="closeDownloadDialog">Cancel</button>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script>
  module.exports = {
    components: {
      'rp-message': require('../components/rp-message.vue'),
      'send-box': require('../components/send-box.vue'),
      'chara-drawer': require('../components/chara-drawer.vue'),
    },

    data: function() {
      return {
        // rp data
        rpCode: null,
        rp: null,
        loadError: null,
        user: {},
        // rp ui
        isNewRp: false,
        isScrolledToBottom: true,
        unreadMessagesIndicator: false,
        currentVoice: { type: 'narrator', charaId: null },
        // connection status
        consecutiveNetworkFailures: 0,
        // options
        pressEnterToSend: true,
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
        pressEnterToSend: 'rpnow.global.pressEnterToSend',
        nightMode: 'rpnow.global.nightMode',
        showMessageDetails: 'rpnow.global.showMessageDetails',
        browserAlerts: 'rpnow.global.browserAlerts',
        msgBoxText: 'rpnow.'+this.rpCode+'.msgBoxContent',
        currentVoice: 'rpnow.'+this.rpCode+'.currentVoice',
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
        .then((function(data) {
          this.user = data;
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
      initializeAuth: require('../components/user'),
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
      sendUpdate: function(type, body, _id) {
        return axios.request({
          method: (_id ? 'put' : 'post'),
          url: '/api/rp/' + this.rpCode + '/' + type + (_id ? ('/' + _id) : ''),
          data: body
        })
          .then((function(res) {
            this.updateState({ type: type, data: res.data });
            return res.data;
          }).bind(this))
          .catch((function(err) {
            alert('Error! ' + err)
            throw err;
          }).bind(this));
      },
      sendMessage: function(data, _id) {
        return this.sendUpdate('msgs', data, _id);
      },
      sendChara: function(data, _id) {
        return this.sendUpdate('charas', data, _id);
      },
      canEdit: function(thing) {
        return thing.userid === this.user.userid;
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
</script>

<style src="rp.css"></style>
