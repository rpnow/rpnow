const jQuery = window.jQuery

export default {
  template: `
    <div class="dialog-container overlay" @click="close" v-show="showing || isDialogSending">

      <div id="character-dialog" class="dialog" @click.stop v-show="showing">
        <div>
          <input placeholder="Name your character" type="text" maxlength="30" v-model="charaDialogName">
        </div>
        <div>
          <spectrum-colorpicker v-model="charaDialogColor"></spectrum-colorpicker>
        </div>
        <div>
          <button type="button" class="outline-button" @click="submit">Save</button>
          <button type="button" class="outline-button" @click="close">Cancel</button>
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
      showing: false,
      charaDialogId: null,
      charaDialogName: '',
      charaDialogColor: '#dddddd',
      isDialogSending: false,
    };
  },
  computed: {
    isValid() {
      return this.charaDialogName.trim().length > 0;
    },
  },
  methods: {
    open(chara) {
      if (chara != null) {
        this.charaDialogId = chara._id;
        this.charaDialogName = chara.name;
        this.charaDialogColor = chara.color;
      } else {
        this.charaDialogId = null;
        this.charaDialogName = '';
        // leave charaDialogColor as it was
      }
      this.showing = true;
    },
    close() {
      if (!this.isDialogSending) {
        this.showing = false;
      }
    },
    submit() {
      if (!this.isValid) return;

      const data = {
        name: this.charaDialogName,
        color: this.charaDialogColor,
      };

      this.showing = false;
      this.isDialogSending = true;

      this.send(data, this.charaDialogId)
        .then(res => {
          if (this.charaDialogId) {
            this.$emit('edited', res);
          } else {
            this.$emit('created', res);
          }
          this.isDialogSending = false;
        })
        .catch(() => {
          this.isDialogSending = false;
        });
    }
  },
  components: {
    'spectrum-colorpicker': {
      props: ['value'],
      render: h => h('input', { ref: 'colorpicker' }),
      mounted() {
        const emitInput = (color) => this.$emit('input', color.toHexString());
        jQuery(this.$refs.colorpicker).spectrum({
          color: this.value,
          showInput: true,
          preferredFormat: "hex",
          move: emitInput,
          change: emitInput,
          hide: emitInput,
        });
      },
      watch: {
        value(value) {
          jQuery(this.$refs.colorpicker).spectrum('set', value);
        }
      }
    }
  }
};
