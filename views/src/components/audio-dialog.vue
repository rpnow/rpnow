<template>
  <div class="dialog-container overlay" @click="showDialog=false" v-show="showDialog || isDialogSending">

    <div id="audio-dialog" class="dialog" @click.stop v-show="showDialog">
      <div>
        <input placeholder="Enter a URL" type="text" v-model="url">
      </div>

      <div class="preview-container" v-if="urlTransformed">
        <iframe sandbox="allow-scripts allow-same-origin" allow="autoplay; encrypted-media" :src="urlTransformed"></iframe>
      </div>

      <div class="preview-container preview-container-busted" v-if="!urlTransformed">
        <span v-if="url.length > 0">RPNow can't read this URL.</span>
      </div>

      <div>
        <button type="button" class="outline-button" @click="submit" :disabled="!urlTransformed">Save</button>
        <button type="button" class="outline-button" @click="close">Cancel</button>
      </div>
    </div>

    <template v-if="isDialogSending">
      <i class="material-icons">hourglass_full</i>
      <span>Loading...</span>
    </template>

  </div>
</template>

<script>
  export default {
    props: [
      'send',
    ],
    data() {
      return {
        showDialog: false,
        msgId: null,
        url: '',
        isDialogSending: false,
      };
    },
    computed: {
      urlTransformed() {
        const youtubeRegex = /^https?:\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([-\w]+)/i;
        if (this.url.match(youtubeRegex)) {
          let id = this.url.match(youtubeRegex)[1];
          return 'https://www.youtube.com/embed/'+id+'?autoplay=1&loop=1&playlist='+id;
        }
        const youtubePlaylistRegex  = /^https?:\/\/(?:www\.)?youtube\.com\/playlist\?list=([-\w]+)/i;
        if (this.url.match(youtubePlaylistRegex)) {
          let id = this.url.match(youtubePlaylistRegex)[1];
          return 'https://www.youtube.com/embed/videoseries?list='+id+'&autoplay=1&loop=1';
        }
        const anyUrlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;
        if (this.url.match(anyUrlRegex)) {
          return this.url;
        }
        return null;
      }
    },
    methods: {
      open(msg) {
        if (msg != null) {
          this.msgId = msg._id;
          this.url = msg.url;
        } else {
          this.msgId = null;
          this.url = '';
        }
        this.showDialog = true;
      },
      close() {
        this.showDialog = false;
        this.url = '';
      },
      submit() {
        if (!this.urlTransformed) return;

        const data = {
          type: 'audio',
          url: this.urlTransformed,
        };

        this.close();
        this.isDialogSending = true;

        this.send(data, this.msgId)
          .then(() => {
            this.isDialogSending = false;
          })
          .catch(() => {
            this.isDialogSending = false;
          });
      }
    },
    watch: {
      // validate the image dialog to see if an image can actually be loaded
      url(url) {
        if (!this.imageDialogIsWellFormed) {
          this.imageDialogIsChecking = false;
          this.imageDialogIsValid = false;
          return;
        }

        this.imageDialogIsChecking = true;
        this.imageDialogIsValid = false;

        new Promise((resolve) => {
          const img = document.createElement('img');

          img.addEventListener('load', () => resolve(true));
          img.addEventListener('error', () => resolve(false));
          img.addEventListener('abort', () => resolve(false));
          setTimeout(() => resolve(false), 45000);

          img.src = url;
        }).then((result) => {
          // ignore if another change has happened since this one
          if (this.url !== url) return;

          this.imageDialogIsChecking = false;
          this.imageDialogIsValid = result;
        });
      },
    }
  };
</script>
