<template>
  <div class="overlay overlay-dialog" @click="showImageDialog=false" v-show="showImageDialog || isDialogSending">

    <div id="image-dialog" class="dialog" @click.stop v-show="showImageDialog">
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
        <button type="button" class="outline-button" @click="submit" :disabled="!imageDialogIsValid">Save</button>
        <button type="button" class="outline-button" @click="showImageDialog=false">Cancel</button>
      </div>
    </div>

    <template v-if="isDialogSending">
      <i class="material-icons">hourglass_full</i>
      <span>Loading...</span>
    </template>

  </div>
</template>

<script>
  module.exports = {
    props: [
      'send',
    ],
    data: function() {
      return {
        // image post dialog
        showImageDialog: false,
        imageDialogId: null,
        imageDialogUrl: '',
        imageDialogIsChecking: false,
        imageDialogIsValid: false,
        isDialogSending: false,
      };
    },
    computed: {
      imageDialogIsWellFormed: function() {
        var urlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;
        return !!this.imageDialogUrl.match(urlRegex);
      },
    },
    methods: {
      open: function(msg) {
        if (msg != null) {
          this.imageDialogId = msg._id;
          this.imageDialogUrl = msg.url;
        } else {
          this.imageDialogId = null;
          this.imageDialogUrl = '';
        }
        this.showImageDialog = true;
      },
      submit: function() {
        if (!this.imageDialogIsValid) return;

        var data = {
          type: 'image',
          url: this.imageDialogUrl,
        };

        this.showImageDialog = false;
        this.isDialogSending = true;

        this.send(this.imageDialogId, data)
          .finally((function() {
            this.isDialogSending = false;
          }).bind(this));
      }
    },
    watch: {
      // validate the image dialog to see if an image can actually be loaded
      'imageDialogUrl': function(url) {
        if (!this.imageDialogIsWellFormed) {
          this.imageDialogIsChecking = false;
          this.imageDialogIsValid = false;
          return;
        }

        this.imageDialogIsChecking = true;
        this.imageDialogIsValid = false;

        new Promise(function(resolve, reject) {
          var img = document.createElement('img');

          img.addEventListener('load', function() { resolve(true) });
          img.addEventListener('error', function() { resolve(false) });
          img.addEventListener('abort', function() { resolve(false) });
          setTimeout(function() { resolve(false) }, 45000);

          img.src = url;
        }).then((function(result) {
          // ignore if another change has happened since this one
          if (this.imageDialogUrl !== url) return;

          this.imageDialogIsChecking = false;
          this.imageDialogIsValid = result;
        }).bind(this));
      },
    }
  };
</script>
