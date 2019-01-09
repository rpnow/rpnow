<template>
  <div id="character-menu" class="drawer drawer-right drawer-dock-1024" v-show="showCharacterMenu">
    <div class="overlay overlay-drawer" @click="showCharacterMenu=false"></div>

    <div class="drawer-header">
      <span>Characters</span>
      <button class="icon-button" @click="showCharacterMenu=false">
        <i class="material-icons" title="Close">close</i>
      </button>
    </div>
    <div class="drawer-body">
      <button :class="['drawer-item', {'drawer-item-selected': currentVoice.type==='narrator'}]" @click="selectCharacter('narrator')">
        <i class="material-icons">local_library</i>
        <span>Narrator</span>
      </button>
      <button :class="['drawer-item', {'drawer-item-selected': currentVoice.type==='ooc'}]" @click="selectCharacter('ooc')">
        <i class="material-icons">chat</i>
        <span>Out of Character</span>
      </button>
      <div class="drawer-divider"></div>
      <button class="drawer-item" @click="$refs.charaDialog.open(null)">
        <i class="material-icons">person_add</i>
        <span>New Character...</span>
      </button>
      <div class="drawer-divider"></div>
      <template v-for="chara of charas">
        <div :class="['drawer-item', {'drawer-item-selected': currentVoice.charaId===chara._id}]" @click="selectCharacter('chara', chara._id)" :key="chara._id">
          <i class="material-icons chara-icon-shadow" :style="{'color':chara.color}">person</i>
          <span>{{ chara.name }}</span>
          <button class="icon-button" @click.prevent.stop="$refs.charaDialog.open(chara)" v-if="canEdit(chara)">
            <i class="material-icons" title="Edit character">edit</i>
          </button>
        </div>
      </template>
    </div>

    <chara-dialog ref="charaDialog"
      :send="send"
      @created="selectCharacter('chara', $event._id)"
    ></chara-dialog>
  </div>
</template>

<script>
  module.exports = {
    components: {
      'chara-dialog': require('./chara-dialog.vue'),
    },
    props: [
      'charas',
      'currentVoice',
      'send',
      'canEdit',
    ],
    data: function() {
      return {
        showCharacterMenu: false,
      }
    },
    methods: {
      open: function() {
        this.showCharacterMenu = true;
      },
      selectCharacter: function(type, charaId) {
        this.$emit('select-voice', { type: type, charaId: charaId || null });
        if (window.matchMedia("(max-width: 1023px)").matches) {
          this.showCharacterMenu = false;
        }
      },
    }
  };
</script>
