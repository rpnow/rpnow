<template>
  <div id="app" :class="{'dark-theme':nightMode}">
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
        <div id="connection-indicator" v-if="isDisconnected" :style="{backgroundColor:disconnectedColor}">
          <i class="material-icons">{{disconnectedIcon}}</i>
          {{disconnectedMessage}}
        </div>

        <div id="chat-header">
          <button class="icon-button" @click="openMainMenu">
            <i class="material-icons" title="Site Menu">menu</i>
          </button>
          <span>
            {{ rp.title }}
          </span>
        </div>

        <div id="messages" @scroll="onScroll">
          <p id="archive-advice" v-if="rp.msgs.length >= 60">
            To view older messages, <a @click="openArchive" :href="'/read/'+rp.readCode" target="_blank">visit the archive.</a>
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
              :getHistory="getMessageHistory(msg._id)"
              :can-edit="true"
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
          <span>Site Menu</span>
          <button class="icon-button" @click="showMainMenu=false">
            <i class="material-icons" title="Close">close</i>
          </button>
        </div>
        <div class="drawer-body">
          <a class="drawer-item" @click="openArchive" :href="'/read/'+rp.readCode" target="_blank">
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
        </div>
      </div>

      <chara-drawer ref="charaDrawer"
        :current-voice="currentVoice"
        :charas="rp.charas"
        :send="sendChara"
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
  import axios from 'axios';
  import RpMessage from '../components/rp-message.vue';
  import SendBox from '../components/send-box.vue';
  import CharaDrawer from '../components/chara-drawer.vue';
  import initializeAuth from '../components/user.js';

  export default {
    components: {
      RpMessage,
      SendBox,
      CharaDrawer
    },

    data() {
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
        websocket: null,
        connection: 'connecting',
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
        // global list of recently visited rooms
        recentRooms: [],
      }
    },

    // localStorage reactivity
    beforeMount() {
      // get rpCode from URL
      this.rpCode = location.pathname.match(/\/rp\/([^/]+)/)[1];

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
        recentRooms: 'rpnow.global.recentRooms',
      };

      for (var prop in watchProps) {
        var key = watchProps[prop];

        var savedValue = getJson(key);
        if (savedValue != null) this[prop] = savedValue;

        this.$watch(prop, saveJsonFn(key));
      }
    },

    mounted() {
      this.initializeAuth()
        .then(data => {
          this.user = data;
          this.fetchUpdates();
        })
    },
    unmounted() {
      if (this.websocket) {
        this.websocket.close(1000, 'SPA navigation');
      }
    },

    computed: {
      linkToHere() {
        return location.href;
      },
      // rp charas grouped by id
      charasById() {
        return this.rp.charas.reduce((map, chara) => {
          map[chara._id] = chara;
          return map;
        }, {});
      },
      isDisconnected() {
        return this.connection !== 'connected'
      },
      disconnectedMessage() {
        if (this.connection === 'offline') return 'Connection lost. Retrying in 5 seconds.';
        if (this.connection === 'reconnecting') return 'Attempting to reconnect...';
        if (this.connection === 'reloading') return 'Synchronizing...';

        return this.connection;
      },
      disconnectedIcon() {
        if (this.connection === 'reconnecting') return 'loop';
        if (this.connection === 'reloading') return 'loop';

        return 'error';
      },
      disconnectedColor() {
        if (this.connection === 'offline') return 'red';
        if (this.connection === 'reconnecting') return 'orange';
        if (this.connection === 'reloading') return 'orange';

        return 'black';
      }
    },

    methods: {
      initializeAuth: initializeAuth,
      fetchUpdates() {
        const createWs = () => {
          const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:13000/api/rp/${this.rpCode}/chat`
          const ws = new WebSocket(url);
          ws.addEventListener('open', () => {
            this.connection = (this.connection === 'connecting') ? 'loading' : 'reloading';
          });
          ws.addEventListener('message', (evt) => {
            this.connection = 'connected';
            this.updateState(JSON.parse(evt.data));
          });
          ws.addEventListener('close', ({ code, wasClean, reason }) => {
            if (code === 1000) {
              this.connection = 'done';
            } else if (code === 1006) {
              this.connection = 'offline';
              setTimeout(() => {
                createWs();
                this.connection = 'reconnecting';
              }, 5000);
            } else if (reason === 'RP_NOT_FOUND') {
              this.connection = 'done';
              this.loadError = { code, reason };
            } else {
              this.connection = 'done';
              this.loadError = { code, wasClean, reason };
            }
          });
          this.websocket = ws;
        }
        createWs();
      },
      updateState(update) {
        console.log(update);
        if (update.type === 'init') {
          this.rp = update.data;

          document.title = this.rp.title;
          this.isNewRp = this.rp.msgs.length === 0 || this.isNewRp;

          if (this.currentVoice.type === 'chara' && this.charasById[this.currentVoice.charaId] == null) {
            this.currentVoice = { type: 'narrator', charaId: null };
          }

    //       if (this.recentRooms.filter(x => x.rpCode === this.rpCode).length === 0) {
    //         this.recentRooms.push({ rpCode: this.rpCode, title: this.rp.title });
    //       }
        } else {
          var arr = this.rp[update.type];

          arr = arr.filter(item => item._id !== update.data._id);
          arr.push(update.data);
          arr.sort((a, b) => a._id < b._id ? -1 : 1);

          // keep no more than 60 messages
          if (update.type === 'msgs') {
            arr = arr.slice(-60);
          }

          this.rp[update.type] = arr;
        }
      },
      sendUpdate(type, body, _id) {
        return axios.request({
          method: (_id ? 'put' : 'post'),
          url: '/api/rp/' + this.rpCode + '/' + type + (_id ? ('/' + _id) : ''),
          data: body
        })
          .catch(err => {
            alert('Error! ' + err)
            throw err;
          });
      },
      sendMessage(data, _id) {
        return this.sendUpdate('msgs', data, _id);
      },
      sendChara(data, _id) {
        return this.sendUpdate('charas', data, _id);
      },
      getHistory(type, _id) {
        return axios.get('/api/rp/' + this.rpCode + '/' + type + '/' + _id + '/history')
          .then(res => res.data)
          .catch(err => {
            alert('Error! ' + err)
            throw err;
          });
      },
      getMessageHistory(_id) {
        return this.getHistory.bind(this, 'msgs', _id);
      },
      openDownloadDialog() {
        this.showDownloadDialog = true;
      },
      closeDownloadDialog() {
        this.showDownloadDialog = false;
      },
      downloadTxt() {
        if (this.downloadOOC) {
          window.open('/api/rp/'+this.rp.readCode+'/download.txt?includeOOC=true', '_blank').focus();
        } else {
          window.open('/api/rp/'+this.rp.readCode+'/download.txt', '_blank').focus();
        }
      },
      openMainMenu() {
        this.showMainMenu = true;
      },
      openArchive(evt) {
        evt.preventDefault();
        if (this.rp.readCode == null) {
          alert('No reader URL; the admin must fix this.');
          return;
        }
        window.open('/read/'+this.rp.readCode, '_blank').focus();
      },
      onScroll() {
        var el = document.querySelector('#messages');
        var bottomDistance = el.scrollHeight - el.scrollTop - el.offsetHeight;
        this.isScrolledToBottom = bottomDistance < 31;
        if (this.isScrolledToBottom && this.unreadMessagesIndicator) {
          this.unreadMessagesIndicator = false;
        }
      },
      rescrollToBottom() {
        if (!this.isScrolledToBottom) return;

        this.$nextTick(() => {
          const el = document.querySelector('#messages');
          el.scrollTop = el.scrollHeight - el.offsetHeight;
        });
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
          Notification.requestPermission().then(result => {
            if (result === 'granted') this.browserAlerts = true;
          });
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

