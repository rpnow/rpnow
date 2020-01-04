import RpMessage from '../components/rp-message.js';
import SendBox from '../components/send-box.js';
import CharaDrawer from '../components/chara-drawer.js';
import { syncToLocalStorage } from '../components/sync-to-localstorage.js'
import * as store from '../store.js';

const sound = new window.Howl({
  src: ['https://cdn.glitch.com/0e12472f-d496-485a-a042-740bef658eb2%2Ftypewriter.mp3?v=1575714187192']
});

export default {
  template: `
    <div id="app" :class="{'dark-theme':nightMode}">
      <div id="main-column">
        <div id="chat-header">
          <button class="icon-button" @click="openMainMenu">
            <i class="material-icons" title="Menu">menu</i>
          </button>
          <span>
            {{ documentTitle }}
          </span>
        </div>

        <div id="connection-indicator" v-if="rp.error">
          <i class="material-icons">error</i>
          Connection lost! {{ rp.error }}
        </div>
        <div id="connection-indicator" v-else-if="!rp.loaded">
          Connecting...
        </div>

        <div id="messages" @scroll="onScroll">
          <p id="archive-advice" v-if="rp.msgs && rp.msgs.length >= 60">
            To view older messages, <router-link to="/pages" target="_blank">visit the archive.</router-link>
          </p>

          <div id="welcome" v-if="rp.msgs && rp.msgs.length === 0">
            <h3>Welcome to your new RP!</h3>
            <p>
              Use this link to invite other participants, or to return to this room later. <strong>Don't lose it!</strong>
            </p>
            <p>
              <code><a :href="linkToHere">{{ linkToHere }}</a></code>
            </p>
          </div>

          <template v-if="rp.msgs" v-for="msg of rp.msgs">
            <rp-message
              v-bind="msg"
              :key="msg._id"
              :chara="charasById[msg.charaId]"
              :press-enter-to-send="pressEnterToSend"
              :send="sendMessage"
              :get-history="() => getMessageHistory(msg._id)"
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

      <transition>
        <div id="main-menu" class="drawer drawer-left" v-show="showMainMenu">
          <div class="overlay overlay-drawer" @click="showMainMenu=false"></div>

          <div class="drawer-header">
            <span>Menu</span>
            <button class="icon-button" @click="showMainMenu=false">
              <i class="material-icons" title="Close">close</i>
            </button>
          </div>
          <div class="drawer-body">
            <router-link class="drawer-item" to="/pages" target="_blank">
              <i class="material-icons">import_contacts</i>
              <span>Browse archive</span>
            </router-link>
            <button class="drawer-item" @click="openDownloadDialog()">
              <i class="material-icons">cloud_download</i>
              <span>Download .TXT</span>
            </button>
            <div class="drawer-divider"></div>
            <button class="drawer-item" @click="changeTitle">
              <i class="material-icons">edit</i>
              <span>Change title</span>
            </button>
            <button class="drawer-item" @click="openWebhookDialog">
              <i class="material-icons">memory</i>
              <span>Set up webhooks</span>
            </button>
            <a class="drawer-item" href="/api/rp/export" target="_blank">
              <i class="material-icons">archive</i>
              <span>Export data</span>
            </a>
            <div class="drawer-divider"></div>
            <button class="drawer-item" @click="nightMode = !nightMode">
              <i class="material-icons">brightness_4</i>
              <span>Night mode</span>
              <i class="material-icons" v-text="nightMode?'check_box':'check_box_outline_blank'"></i>
            </button>
            <button class="drawer-item" @click="browserAlerts = !browserAlerts">
              <i class="material-icons">notifications</i>
              <span>Alerts</span>
              <i class="material-icons" v-text="browserAlerts?'check_box':'check_box_outline_blank'"></i>
            </button>
            <button class="drawer-item" @click="pressEnterToSend = !pressEnterToSend">
              <i class="material-icons">send</i>
              <span>Quick send</span>
              <i class="material-icons" v-text="pressEnterToSend?'check_box':'check_box_outline_blank'"></i>
            </button>
          </div>
        </div>
      </transition>

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

    </div>
  `,

  components: {
    RpMessage,
    SendBox,
    CharaDrawer,
  },

  data() {
    return {
      // rp data
      rp: store.state,
      // rp ui
      isScrolledToBottom: true,
      documentVisible: true,
      unreadMessage: false,
      currentVoice: { type: 'narrator', charaId: null },
      // options
      pressEnterToSend: true,
      nightMode: false,
      browserAlerts: false,
      // main menu
      showMainMenu: false,
      // download dialog
      showDownloadDialog: false,
      downloadOOC: false,
      // cleanup functions
      cleanupFunctions: [],
    }
  },

  created() {
    // listener so we can observe the document's visibility
    const pageVisibilityListener = () => this.documentVisible = document.visibilityState === 'visible';

    document.addEventListener('visibilitychange', pageVisibilityListener)

    this.cleanupFunctions.push(() => {
      document.removeEventListener('visibilitychange', pageVisibilityListener)
    });

    // sync certain properties on this component with values in localStorage
    syncToLocalStorage(this, {
      pressEnterToSend: 'rpnow.pressEnterToSend',
      nightMode: 'rpnow.nightMode',
      browserAlerts: 'rpnow.browserAlerts',
      msgBoxText: 'rpnow.msgBoxText', // TODO sync in sendBox component
      currentVoice: 'rpnow.currentVoice',
      downloadOOC: 'rpnow.downloadOOC',
    });
  },

  destroyed() {
    this.cleanupFunctions.forEach(cb => cb());
  },

  computed: {
    linkToHere() {
      return location.href;
    },
    // rp charas grouped by id
    charasById() {
      if (this.rp.charas == null) return null;

      return this.rp.charas.reduce((map, chara) => {
        map[chara._id] = chara;
        return map;
      }, {});
    },
    documentTitle() {
      if (this.rp.title == null) return 'Loading RP...';

      if (this.unreadMessage) return '* New post...';

      return this.rp.title;
    },
    isReadingChat() {
      return this.isScrolledToBottom && this.documentVisible;
    },
  },

  methods: {
    sendMessage: store.sendMessage,
    sendChara: store.sendChara,
    getMessageHistory: store.getMessageHistory,
    changeTitle: store.changeTitle,
    openWebhookDialog: store.openWebhookDialog,
    openDownloadDialog() {
      this.showDownloadDialog = true;
    },
    closeDownloadDialog() {
      this.showDownloadDialog = false;
    },
    downloadTxt() {
      if (this.downloadOOC) {
        window.open('/api/rp/download.txt?includeOOC=true', '_blank').focus();
      } else {
        window.open('/api/rp/download.txt', '_blank').focus();
      }
    },
    openMainMenu() {
      this.showMainMenu = true;
    },
    onScroll() {
      var el = document.querySelector('#messages');
      var bottomDistance = el.scrollHeight - el.scrollTop - el.offsetHeight;
      this.isScrolledToBottom = bottomDistance < 31;
    },
    rescrollToBottom() {
      if (!this.isScrolledToBottom) return;

      this.$nextTick(() => {
        const el = document.querySelector('#messages');
        el.scrollTop = el.scrollHeight - el.offsetHeight;
      });
    },
  },

  watch: {
    // browser tab title
    'documentTitle': function(title) {
      document.title = title;
    },
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

      if (msgs.length > oldMsgs.length && !this.isReadingChat) {
        this.unreadMessage = msgs[msgs.length - 1];
      }
    },
    // if we come back to the page, mark message as read
    'isReadingChat': function(isReadingChat) {
      if (isReadingChat) {
        this.unreadMessage = null;
      }
    },
    // if there is a new unread message, do notifications
    'unreadMessage': function(msg) {
      if (msg == null || !this.browserAlerts) return;

      // sound notification
      sound.play();

      // desktop notifications
      if (!this.documentVisible) {
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
    },
    // if the current voice's chara is suddenly not
    // present (usually because the RP was reset) then
    // we must reset the currentVoice
    'charasById': function(charasById) {
      if (charasById == null) return;

      if (this.currentVoice.type === 'chara' && charasById[this.currentVoice.charaId] == null) {
        this.currentVoice = { type: 'narrator', charaId: null };
      }
    },
  }
};
