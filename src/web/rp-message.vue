<template>
  <div :class="elementClasses" :style="{ backgroundColor: charaColor, color: charaColorBw }">

    <div v-if="isChara" class="name">{{ charaName }}</div>

    <div class="message-details" v-if="!editing && showMessageDetails">
      <template v-if="sending">
        <mat-spinner diameter="16"></mat-spinner>
      </template>
      <template v-if="!sending">
        <rpn-timestamp class="timestamp" :timestamp="timestamp" :revision="revision"></rpn-timestamp>
        <rpn-ipid :style="{visibility:ipidVisibility}" :ipid="ipid"></rpn-ipid>
      </template>
    </div>

    <div v-if="canEdit && !sending" class="action-buttons">
      <template v-if="!editing">
        <button mat-icon-button @click="beginEdit">
          <mat-icon aria-label="Edit post" matTooltip="Edit post">edit</mat-icon>
        </button>
      </template>
      <template v-if="editing">
        <button mat-icon-button :disabled="!validEdit" @click="confirmEdit">
          <mat-icon aria-label="Save edits" matTooltip="Save edits">save</mat-icon>
        </button>
        <button mat-icon-button @click="cancelEdit">
          <mat-icon aria-label="Discard edits" matTooltip="Discard edits">cancel</mat-icon>
        </button>
      </template>
    </div>

    <template v-if="!isImage && !editing">
      <div class="content generated-links" v-html="formattedContent"></div>
    </template>

    <template v-if="editing">
      <textarea class="content" v-model="newContent" maxlength="10000" rows="4"
        @keydown.enter.ctrl.exact.prevent="confirmEdit"
        @keydown.enter.exact.prevent="pressEnterToSend && confirmEdit()"
      ></textarea>
    </template>

    <template v-if="isImage">
      <div class="content">
        <a :href="url" target="_blank">
          <img :src="url" @load="onImageLoaded"/>
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
      // 'ipid',

      // 'charaName',
      // 'charaColor',

      // 'canEdit',
      // 'pressEnterToSend',
      // 'showMessageDetails'
    ],
    data: function() {
      return {
        editing: false,
        newContent: '',
        sending: false,

        ipid: '',

        charaName: 'Bro',
        charaColor: '#aceb0b',

        canEdit: true,
        pressEnterToSend: true,
        showMessageDetails: true
      }
    },
    computed: {
      isNarrator: function() { return this.type === 'narrator' },
      isOOC: function() { return this.type === 'ooc' },
      isChara: function() { return this.type === 'chara' },
      isImage: function() { return this.type === 'image' },
      elementClasses: function() {
        return [
          'message',
          'message-'+this.type,
          {'message-sending':this.sending}
        ];
      },
      ipidVisibility: function() {
        if (this.ipid && !this.canEdit) {
          return 'visible';
        } else {
          return 'hidden';
        }
      },
      validEdit: function() {
        return this.newContent.trim() && this.newContent !== this.content;
      },
      formattedContent: function() {
        return this.content;
      },
      charaColorBw: function() {
        return 'black';
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
        this.$emit('editContent', this.newContent);
      },
      onImageLoaded: function() {
        this.$emit('imageLoaded');
      }
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
    right: 14px;
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
    top: 0;
    right: 8px;
    z-index: 1;
  }
  .message .action-buttons button {
    margin: -9px 0 0 -8px;
  }
  .message mat-icon {
    color: inherit !important;
    opacity: 0.66;
  }


  .message-narrator {
    background-color: white;
    border: 1px solid #999;
    border-radius: 8px;
  }
  /* :host-context(.dark-theme) .message-narrator {
    background-color:#444;
  } */
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
  /* :host-context(.dark-theme) .message-chara {
    border-color: rgba(255,255,255,0.3);
  } */
  .message-chara .content {
    background-color: white;
    color: black;
    opacity: 0.8;
    border-radius: 12px 12px 12px 0;
  }
  /* :host-context(.dark-theme) .message-chara .content {
    background-color: black;
    color: white;
    opacity: 0.6;
  } */
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
</style>