<template>
  <div :class="elementClasses" :style="{ backgroundColor: charaColor, color: charaColorBw }">

    <div v-if="isChara" class="name">{{ charaName }}</div>

    <div class="message-details" v-if="!editing && showMessageDetails">
      <template v-if="sending">
        <mat-spinner diameter="16"></mat-spinner>
      </template>
      <template v-if="!sending">
        <div class="timestamp" :title="timeAgoTitleText">
          <template v-if="wasEdited">Edited:</template>
          {{ timeAgoText }}
        </div>
        <span class="color-ip-box" title="Anonymous user ID" :style="{visibility:ipidVisibility}">
          <span class="color-ip-box-section" v-for="color of ipidColors" :style="{backgroundColor:color}" :key="color"></span>
        </span>
      </template>
    </div>

    <div v-if="canEdit && !sending" class="action-buttons">
      <template v-if="!editing">
        <button class="icon-button" @click="beginEdit">
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

    <template v-if="!isImage && !editing">
      <div class="content generated-links" v-html="formattedContent"></div>
    </template>

    <template v-if="editing">
      <textarea class="content" v-model="newContent" maxlength="10000" rows="4"
        @keydown.enter.ctrl.exact.prevent="confirmEdit"
        @keydown.enter.exact.prevent="pressEnterToSend() && confirmEdit()"
      ></textarea>
    </template>

    <template v-if="isImage">
      <div class="content">
        <a :href="url" target="_blank">
          <img :src="url" @load="notifySizeChange"/>
        </a>
      </div>
    </template>

  </div>
</template>
  
<script>
  module.exports = {
    props: [
      'type',
      'content',
      'url',
      'timestamp',
      'revision',
      'ipid',

      'chara',

      'canEdit',
      'pressEnterToSend',
      'showMessageDetails',
      
      'darkTheme',
    ],
    data: function() {
      return {
        editing: false,
        newContent: '',
        sending: false,
        currentTime: Date.now(),
        intervalHandle: null,
      }
    },
    computed: {
      isNarrator: function() { return this.type === 'narrator' },
      isOOC: function() { return this.type === 'ooc' },
      isChara: function() { return this.type === 'chara' },
      isImage: function() { return this.type === 'image' },
      charaColor: function() { return this.isChara ? this.chara.color : null },
      charaName: function() { return this.isChara ? this.chara.name : null },
      elementClasses: function() {
        return [
          'message',
          'message-'+this.type,
          {'message-sending':this.sending},
          {'dark-theme':this.darkTheme},
        ];
      },
      ipidVisibility: function() {
        return (this.ipid && !this.editing) ? 'visible' : 'hidden';
      },
      ipidColors: function() {
        if (!this.ipid) return ['#000','#000','#000'];
        return this.ipid.match(/[0-9a-f]{6}/gi)
          .map(function(hex) { return '#' + hex });
      },
      validEdit: function() {
        return this.newContent.trim() && this.newContent !== this.content;
      },
      formattedContent: function() {
        return this.content;
      },
      charaColorBw: function() {
        if (!this.isChara) return null;
        return tinycolor(this.charaColor).isLight() ? 'black' : 'white';
      },
      wasEdited: function() {
        return this.revision > 0;
      },
      timeAgoText: function() {
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
      timeAgoTitleText: function() {
        if (!this.timestamp) return '';
        else return (this.wasEdited) ?
          'Edited ' + new Date(this.timestamp).toLocaleString() :
          'Posted ' + new Date(this.timestamp).toLocaleString();
      }
    },
    methods: {
      beginEdit: function() {
        if (this.isImage) {
          // TODO spawn image dialog
        } else {
          this.editing = true;
          this.newContent = this.content;
        }
      },
      cancelEdit: function() {
        this.editing = false;
      },
      confirmEdit: function() {
        this.editing = false;
        var messageData = {
          type: this.type,
          charaId: this.chara && this.chara._id || undefined,
          content: this.newContent,
        }
        this.$emit('edit', messageData);
      },
      notifySizeChange: function() {
        this.$emit('resize');
      }
    },
    created: function() {
      this.intervalHandle = setInterval((function() {
        this.currentTime = Date.now();
      }).bind(this), 15*1000);
    },
    mounted: function() {
      this.notifySizeChange();
    },
    watch: {
      type: 'notifySizeChange',
      content: 'notifySizeChange',
      url: 'notifySizeChange',
      editing: 'notifySizeChange',
    },
    beforeDestroy: function() {
      clearInterval(this.intervalHandle);
    }
  }
</script>
  
<style scoped>
  .message{
    word-wrap: break-word;
    margin: 20px auto 0;
    box-sizing: border-box;
    width: 100%;
    max-width: 600px;
    position: relative;
    padding: 24px 8px;
  }
  .message-sending {
    opacity: 0.7;
  }
  .message .content {
    line-height: 1.6;
    padding: 8px;
  }
  .message textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    border: solid 1px rgba(0,0,0,0.35);
  }
  .message mat-spinner {
    position: absolute;
    top: 2px;
    right: 22px;
    z-index: 1;
  }
  .message .message-details {
    position: absolute;
    top: 1px;
    right: 48px;
    display: flex;
    align-items: center;
  }
  .message .message-details * {
    z-index: 1;
  }
  .message .timestamp {
    margin-right: 4px;
    opacity: 0.66;
  }
  .message .action-buttons {
    position: absolute;
    display: flex;
    top: 0;
    right: 8px;
    z-index: 1;
  }
  .message .icon-button {
    margin: -9px 0 0 -8px;
  }
  .message .icon-button i.material-icons {
    opacity: 0.66;
  }


  .message-narrator {
    background-color: white;
    border: 1px solid #999;
    border-radius: 8px;
  }
  .dark-theme.message-narrator {
    background-color:#444;
  }
  .message-ooc {
    border-left: 3px solid rgba(128,128,128,0.3);
    padding: 0 8px 0 14px;
  }
  .message-ooc + .message-ooc {
    margin-top: 10px;
  }
  .message-ooc .message-details {
    position: initial;
    float: right;
    border-bottom: 1px dotted rgba(128,128,128,0.3);
    padding-bottom: 3px;
    padding-right: 36px;
    margin: 0 7px 12px 20px;
  }
  .message-ooc .content {
    opacity: 0.66;
  }
  .message-ooc .content:not(textarea) {
    display: inline;
    padding: 0;
  }
  .message-ooc textarea.content {
    margin-top: 24px;
  }
  .message-chara {
    margin-top: 30px;
    border: 1px solid rgba(0,0,0,0.2);
    border-radius: 16px 16px 16px 0;
    padding-bottom: 12px;
  }
  .message-chara .name{
    display: inline-block;
    position: absolute;
    left: 25px;
    top: -13px;
    z-index: 1;
    background-color: inherit;
    border: 1px solid rgba(0,0,0,0.2);
    border-radius: 6px;
    padding: 4px 14px;
    font-size: 95%;
    letter-spacing: 1px;
    word-spacing: 1px;
    box-shadow: 2px 2px 4px rgba(0,0,0,0.03);
  }
  .dark-theme.message-chara {
    border-color: rgba(255,255,255,0.3);
  }
  .message-chara .content {
    background-color: white;
    color: black;
    opacity: 0.8;
    border-radius: 12px 12px 12px 0;
  }
  .dark-theme.message-chara .content {
    background-color: black;
    color: white;
    opacity: 0.6;
  }
  .message-image {
    padding-bottom: 10px;
  }
  .message-image .message-details {
    border-bottom: 1px dotted rgba(128,128,128,0.3);
    padding-bottom: 3px;
  }
  .message-image .content {
    text-align: center;
    padding: 0;
  }
  .message-image .content a {
    display: block;
    width: 100%;
  }
  .message-image .content img {
    display: block;
    margin: auto;
    max-width: 100%;
    max-height: 50vh;
  }
  .color-ip-box {
    display: inline-flex;
    height: 8px;
    width: 18px;
    border: solid 1px rgba(0,0,0,0.7);
    position: relative;
  }
  .color-ip-box-section {
    flex-grow: 1;
  }
  .dark-theme .color-ip-box {
    border-color: rgba(255,255,255,0.7);
  }
</style>