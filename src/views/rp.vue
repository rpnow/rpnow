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
              @prompt-image-edit="openImageDialog(msg)"
              @resize="rescrollToBottom"
            ></rp-message>
          </template>
        </div>

        <div id="send-box" :class="messageBoxClass" :style="messageBoxStyle">

          <div id="voice-bar">
            <div id="click-to-change" title="Change character" @click="openCharacterMenu">
              {{ currentVoiceName }}
            </div>
            <button class="icon-button" @click="openCharacterMenu">
              <i class="material-icons" title="Change character">people</i>
            </button>
            <button class="icon-button" @click="openImageDialog(null)">
              <i class="material-icons" title="Post image">image</i>
            </button>
            <button class="icon-button" @click="showFormatGuide">
              <i class="material-icons" title="Formatting info">text_fields</i>
            </button>
          </div>

          <div id="typing-area">
            <textarea
              rows="3"
              placeholder="Type your message."
              maxlength="10000"
              :disabled="isMsgBoxSending"
              v-model="msgBoxText"
              @keydown.enter.ctrl.exact="($event.preventDefault(), sendMessage())"
              @keydown.enter.exact="pressEnterToSend() ? ($event.preventDefault(), sendMessage()) : null"
              @input="resizeTextareaOnInput($event, 3, 6)"
            ></textarea>
            <template v-if="!isMsgBoxSending">
              <button class="icon-button" :disabled="!msgBoxValid" @click="sendMessage">
                <i class="material-icons" title="Send">send</i>
              </button>
            </template>
            <template v-if="isMsgBoxSending">
              <div id="send-loader-container">
                <i class="material-icons">hourglass_full</i>
              </div>
            </template>
          </div>

        </div>
      </div>

      <div class="overlay overlay-drawer" @click="showMainMenu=false" v-show="showMainMenu"></div>

      <div id="main-menu" class="drawer drawer-left" v-show="showMainMenu">
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

      <div class="overlay overlay-lt-1024 overlay-drawer" @click="showCharacterMenu=false" v-show="showCharacterMenu"></div>

      <div id="character-menu" class="drawer drawer-right drawer-dock-1024" v-show="showCharacterMenu">
        <div class="drawer-header">
          <span>Characters</span>
          <button class="icon-button" @click="showCharacterMenu=false">
            <i class="material-icons" title="Close">close</i>
          </button>
        </div>
        <div class="drawer-body">
          <button :class="['drawer-item', {'drawer-item-selected': currentMsgType==='narrator'}]" @click="selectCharacter('narrator')">
            <i class="material-icons">local_library</i>
            <span>Narrator</span>
          </button>
          <button :class="['drawer-item', {'drawer-item-selected': currentMsgType==='ooc'}]" @click="selectCharacter('ooc')">
            <i class="material-icons">chat</i>
            <span>Out of Character</span>
          </button>
          <div class="drawer-divider"></div>
          <button class="drawer-item" @click="openCharacterDialog(null)">
            <i class="material-icons">person_add</i>
            <span>New Character...</span>
          </button>
          <div class="drawer-divider"></div>
          <template v-for="chara of rp.charas">
            <div :class="['drawer-item', {'drawer-item-selected': currentChara===chara}]" @click="selectCharacter('chara', chara._id)" :key="chara._id">
              <i class="material-icons chara-icon-shadow" :style="{'color':chara.color}">person</i>
              <span>{{ chara.name }}</span>
              <button class="icon-button" @click.prevent.stop="openCharacterDialog(chara)">
                <i class="material-icons" title="Edit character">edit</i>
              </button>
            </div>
          </template>
        </div>
      </div>
    
      <div class="overlay overlay-dialog" @click="showCharacterDialog=false" v-show="showCharacterDialog"></div>

      <div id="character-dialog" class="dialog" v-show="showCharacterDialog">
        <div>
          <input placeholder="Name your character" type="text" maxlength="30" v-model="charaDialogName">
        </div>
        <div>
          <spectrum-colorpicker v-model="charaDialogColor"></spectrum-colorpicker>
        </div>
        <div>
          <button type="button" class="outline-button" @click="sendChara">Save</button>
          <button type="button" class="outline-button" @click="closeCharacterDialog">Cancel</button>
        </div>
      </div>

      <div class="overlay overlay-dialog" @click="showImageDialog=false" v-show="showImageDialog"></div>

      <div id="image-dialog" class="dialog" v-show="showImageDialog">
        <div>
          <input placeholder="Enter a URL" type="text" v-model="imageDialogUrl" @keydown.enter="sendImage">
        </div>

        <div class="preview-container preview-container-busted" v-if="imageDialogIsChecking">
          <i class="material-icons">hourglass_full</i>
          <span>Loading...</span>
        </div>

        <div class="preview-container" v-if="imageDialogIsValid">
          <img :src="imageDialogUrl">
        </div>

        <div class="preview-container preview-container-busted" v-if="!imageDialogIsValid && !imageDialogIsChecking">
          <span v-if="imageDialogUrl.length > 0 && !imageDialogIsWellFormed">RPNow can't read this URL.</span>
          <span v-if="imageDialogIsWellFormed">Can't load this image.</span>
        </div>

        <div>
          <button type="button" class="outline-button" @click="sendImage" :disabled="!imageDialogIsValid">Save</button>
          <button type="button" class="outline-button" @click="showImageDialog=false">Cancel</button>
        </div>
      </div>

      <div class="overlay overlay-dialog" @click="showDownloadDialog=false" v-show="showDownloadDialog"></div>

      <div id="download-dialog" class="dialog" v-show="showDownloadDialog">
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

      <div class="overlay overlay-dialog" v-show="isDialogSending">
        <i class="material-icons">hourglass_full</i>
        <span>Loading...</span>
      </div>

    </template>
  </div>
</template>

<script src="rp.js"></script>

<style src="rp.css"></style>
