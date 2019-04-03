<template>
  <div :class="elementClasses" :style="{ backgroundColor: charaColor, color: charaColorBw }">

    <div v-if="isChara" class="name">{{ charaName }}</div>

    <div class="message-details" v-if="!editing && showMessageDetails">
      <template v-if="sending">
        <mat-spinner diameter="16"></mat-spinner>
      </template>
      <template v-if="!sending">
        <div class="timestamp" :title="timeAgoTitleText">
          <template v-if="wasEdited">
            <a href="javascript:;" @click="showHistory">edited</a>
          </template>
          {{ timeAgoText }}
        </div>
        <span class="color-ip-box" title="Anonymous user ID" :style="{visibility:useridVisibility}">
          <span class="color-ip-box-section" v-for="color of useridColors" :style="{backgroundColor:color}" :key="color"></span>
        </span>
      </template>
    </div>

    <div v-if="!sending" class="action-buttons">
      <template v-if="!editing">
        <button v-if="canEdit" class="icon-button" @click="beginEdit">
          <i class="material-icons" title="Edit">edit</i>
        </button>
      </template>
      <template v-if="editing">
        <button class="icon-button" :disabled="!validEdit" @click="confirmEdit">
          <i class="material-icons" title="Save edits">save</i>
        </button>
        <button class="icon-button" @click="cancelEdit">
          <i class="material-icons" title="Discard edits">cancel</i>
        </button>
      </template>
    </div>

    <template v-if="(isNarrator || isOOC || isChara) && !editing">
      <div class="content generated-links" v-html="formattedContent"></div>
    </template>

    <template v-if="editing">
      <textarea class="content" v-model="newContent" maxlength="10000" rows="4"
        @keydown.enter.ctrl.exact="($event.preventDefault(), confirmEdit())"
        @keydown.enter.exact="pressEnterToSend ? ($event.preventDefault(), confirmEdit()) : null"
      ></textarea>
    </template>

    <template v-if="isImage">
      <div class="content">
        <a :href="url" target="_blank">
          <img :src="url" @load="notifySizeChange"/>
        </a>
      </div>
    </template>

    <image-dialog ref="imageDialog" :send="send"></image-dialog>

    <div class="dialog-container overlay" @click="historyOpen=false" v-if="historyOpen">
      <div id="history-dialog" class="dialog" @click.stop v-if="history">
        <div id="history-dialog-messages">
          <div v-for="(msg, i) in history" :key="'history'+i">
            <p>{{ msg.content || msg.url || '' }}</p>
            <hr />
          </div>
        </div>
        <div>
          <button type="button" class="outline-button" @click="historyOpen=false">Close</button>
        </div>
      </div>
      <template v-else>
        <i class="material-icons">hourglass_full</i>
        <span>Loading...</span>
      </template>
    </div>

  </div>
</template>
<script>
  import tinycolor from 'tinycolor2';
  import ImageDialog from './image-dialog.vue';
  import transformRpMessage from './rp-message-format';
  export default {
    components: {
      ImageDialog
    },
    props: [
      '_id',
      'type',
      'content',
      'url',
      'timestamp',
      'revision',
      'userid',

      'chara',

      'canEdit',
      'pressEnterToSend',
      'showMessageDetails',

      'send',
      'getHistory',
    ],
    data() {
      return {
        editing: false,
        newContent: '',
        sending: false,
        currentTime: Date.now(),
        intervalHandle: null,
        historyOpen: false,
        history: null,
      }
    },
    computed: {
      isNarrator() { return this.type === 'narrator' },
      isOOC() { return this.type === 'ooc' },
      isChara() { return this.type === 'chara' },
      isImage() { return this.type === 'image' },
      charaColor() { return this.isChara ? this.chara.color : null },
      charaName() { return this.isChara ? this.chara.name : null },
      elementClasses() {
        return [
          'message',
          'message-'+this.type,
          {'message-sending':this.sending},
        ];
      },
      useridColors() {
        // get the last 6 digits of the userid and turn it into colors
        // because these are the last 6 digits of a cuid, which are pseudorandom values,
        // they're good to use for a random color string
        return [-1, -3, -5]
          .map(n => this.userid.substr(n, 2))
          .map(str => parseInt(str, 36))
          .map(n => {
            return '#'+[n, (n / 6 | 0), (n / 36 | 0)]
              .map(n => ('0'+(n % 6 * 51).toString(16)).substr(-2))
              .join('')
          });
      },
      useridVisibility() {
        return (this.userid && !this.editing) ? 'visible' : 'hidden';
      },
      validEdit() {
        return this.newContent.trim() && this.newContent !== this.content;
      },
      formattedContent() {
        return this.transformRpMessage(this.content, this.charaColor);
      },
      charaColorBw() {
        if (!this.isChara) return null;
        return tinycolor(this.charaColor).isLight() ? 'black' : 'white';
      },
      wasEdited() {
        return this.revision > 0;
      },
      timeAgoText() {
        // close enough
        var periods = [
          {label: 's', div: 60},
          {label: 'm', div: 60},
          {label: 'h', div: 24},
          {label: 'd', div: 30},
          {label: 'mo', div: 12},
          {label: 'y', div: Infinity},
        ];

        var t = (this.currentTime - new Date(this.timestamp).getTime()) / 1000;

        while (Math.round(t) >= periods[0].div) t /= periods.shift().div;

        var label = periods[0].label;

        if (Math.round(t) <= 0) return 'now';
        else return Math.round(t) + label;
      },
      timeAgoTitleText() {
        if (!this.timestamp) return '';
        else return (this.wasEdited) ?
          'Edited ' + new Date(this.timestamp).toLocaleString() :
          'Posted ' + new Date(this.timestamp).toLocaleString();
      },
    },
    methods: {
      beginEdit() {
        if (this.isImage) {
          this.$refs.imageDialog.open({ _id: this._id, url: this.url });
        } else {
          this.editing = true;
          this.newContent = this.content;
        }
      },
      cancelEdit() {
        this.editing = false;
      },
      confirmEdit() {
        this.editing = false;
        var messageData = {
          type: this.type,
          charaId: this.chara && this.chara._id || undefined,
          content: this.newContent,
        }
        this.send(messageData, this._id);
      },
      notifySizeChange() {
        this.$emit('resize');
      },
      showHistory() {
        this.historyOpen = true;
        this.getHistory().then(data => this.history = data);
      },
      transformRpMessage: transformRpMessage,
    },
    mounted() {
      this.intervalHandle = setInterval(() => this.currentTime = Date.now(), 15*1000);

      this.notifySizeChange();
    },
    watch: {
      type: 'notifySizeChange',
      content: 'notifySizeChange',
      url: 'notifySizeChange',
      editing: 'notifySizeChange',
    },
    beforeDestroy() {
      clearInterval(this.intervalHandle);
    }
  }
</script>
  