export default {
  template: `
    <div class="dialog-container overlay" @click="showImageDialog=false" v-show="showImageDialog || isDialogSending">

      <div id="image-dialog" class="dialog" @click.stop v-show="showImageDialog">
        <div>
          <input type="url" ref="urlbox"
            required
            placeholder="Enter a URL"
            v-model="imageDialogUrl"
            @keydown.enter="sendImage"
          >
        </div>

        <div class="preview-container preview-container-busted" v-if="imageDialogIsChecking">
          <i class="material-icons">hourglass_full</i>
          <span>Loading...</span>
        </div>

        <div class="preview-container" v-if="imageDialogIsValid">
          <img :src="imageDialogUrl">
        </div>

        <div class="preview-container preview-container-busted" v-if="!imageDialogIsValid && !imageDialogIsChecking">
          <span v-if="imageDialogUrl.length === 0"></span>
          <span v-else-if="!$refs.urlbox.checkValidity()">Can't read this URL.</span>
          <span v-else>Can't load this image.</span>
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
  `,
  props: [
    'send',
  ],
  data() {
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
  methods: {
    open(msg) {
      if (msg != null) {
        this.imageDialogId = msg._id;
        this.imageDialogUrl = msg.url;
      } else {
        this.imageDialogId = null;
        this.imageDialogUrl = '';
      }
      this.showImageDialog = true;
    },
    submit() {
      if (!this.imageDialogIsValid) return;

      const data = {
        type: 'image',
        url: this.imageDialogUrl,
      };

      this.showImageDialog = false;
      this.isDialogSending = true;

      this.send(data, this.imageDialogId)
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
    imageDialogUrl(url) {
      if (!this.$refs.urlbox.checkValidity()) {
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
        if (this.imageDialogUrl !== url) return;

        this.imageDialogIsChecking = false;
        this.imageDialogIsValid = result;
      });
    },
  },
};
  