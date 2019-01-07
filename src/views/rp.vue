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
              :key="msg._id"
              :type="msg.type"
              :content="msg.content"
              :url="msg.url"
              :timestamp="msg.timestamp"
              :revision="msg.revision"
              :ipid="msg.ip"
              :chara="charasById[msg.charaId]"
              :can-edit="true"
              :press-enter-to-send="pressEnterToSend"
              :show-message-details="showMessageDetails"
              :dark-theme="nightMode"
              @edit="editMessage(msg._id, $event)"
              @prompt-image-edit="$refs.imageDialog.open(msg)"
              @resize="rescrollToBottom"
            ></rp-message>
          </template>
        </div>

        <send-box
          :charas-by-id="charasById"
          :press-enter-to-send="pressEnterToSend"
          :send="sendMessage"
          @open-character-menu="$refs.charaDrawer.open()"
        ></send-box>
      </div>

      <div id="main-menu" class="drawer drawer-left" v-show="showMainMenu">
        <div class="overlay" @click="showMainMenu=false"></div>

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
            <span>Download</span>
          </button>
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
          <button class="drawer-item" @click="overridePressEnterToSend = !pressEnterToSend()">
            <i class="material-icons">send</i>
            <span>Quick send</span>
            <i class="material-icons" v-if="overridePressEnterToSend===true">check_box</i>
            <i class="material-icons" v-if="overridePressEnterToSend===false">check_box_outline_blank</i>
            <i class="material-icons" v-if="overridePressEnterToSend===null">indeterminate_check_box</i>
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
        :charas="rp.charas"
        @create-chara="$refs.charaDialog.open(null)"
        @edit-chara="$refs.charaDialog.open($event)"
      ></chara-drawer>

      <chara-dialog ref="charaDialog" :send="sendChara"></chara-dialog>

      <image-dialog ref="imageDialog" :send="sendImage"></image-dialog>

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

<script src="rp.js"></script>

<style src="rp.css"></style>
