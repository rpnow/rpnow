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
  </div>
</template>
  
<script>
  module.exports = {
    components: {
      'image-dialog': require('./image-dialog.vue'),
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
        ];
      },
      ipidVisibility: function() {
        // return (this.ipid && !this.editing) ? 'visible' : 'hidden';
        return 'hidden';
      },
      ipidColors: function() {
        // if (!this.ipid) return ['#000','#000','#000'];
        // return this.ipid.match(/[0-9a-f]{6}/gi)
        //   .map(function(hex) { return '#' + hex });
        return ['#000']
      },
      validEdit: function() {
        return this.newContent.trim() && this.newContent !== this.content;
      },
      formattedContent: function() {
        return this.transformRpMessage(this.content, this.charaColor);
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
      },
    },
    methods: {
      beginEdit: function() {
        if (this.isImage) {
          this.$refs.imageDialog.open({ _id: this._id, url: this.url });
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
        this.send(messageData, this._id);
      },
      notifySizeChange: function() {
        this.$emit('resize');
      },
      transformRpMessage: require('./rp-message-format'),
    },
    mounted: function() {
      this.intervalHandle = setInterval((function() {
        this.currentTime = Date.now();
      }).bind(this), 15*1000);

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
  