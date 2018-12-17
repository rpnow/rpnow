var jsonStorage = (function() {
  var fakeStorage = {};

  return {
    get: function(key, defaultValue) {
      var str;
      try {
        str = localStorage.getItem(key);
      } catch (ex) {
        str = fakeStorage[key];
      }
      if (str == null) return defaultValue;
      return JSON.parse(str);
    },
    set: function(key, obj) {
      var str = JSON.stringify(obj);
      try {
        localStorage.setItem(key, str);
      } catch (ex) {
        fakeStorage[key] = str;
      }
    }
  }
})();

new Vue({
  el: '#rp-chat',
  components: {
    'rp-message': httpVueLoader('/client-files/rp-message.vue'),
  },
  data: {
    demo: false,
    linkToHere: location.href,
    rpCode: location.pathname.match(/\/rp\/([^\/]+)/)[1],
    rp: null,
    isNewRp: false,
    msgBoxText: '',
    currentMsgType: 'narrator',
    currentCharaId: null,
    charaDialogName: '',
    charaDialogColor: '#dddddd',
    showCharacterMenu: false,
    showCharacterDialog: false,
    pressEnterToSend: jsonStorage.get('rpnow.global.pressEnterToSend', false),
    showMainMenu: false,
    nightMode: jsonStorage.get('rpnow.global.nightMode', true),
    showMessageDetails: jsonStorage.get('rpnow.global.showMessageDetails', true),
    isScrolledToBottom: true,
  },
  computed: {
    charasById: function() {
      return this.rp.charas.reduce(function(map, chara) {
        map[chara._id] = chara;
        return map;
      }, {});
    },
    currentChara: function() {
      if (this.currentMsgType !== 'chara') return undefined;
      return this.charasById[this.currentCharaId]
    },
    currentVoiceName: function() {
      if (this.currentMsgType === 'narrator') return 'Narrator';
      if (this.currentMsgType === 'ooc') return 'Out of Character';
      return this.currentChara.name;
    },
    currentCharaColor: function() {
      if (this.currentMsgType !== 'chara') return undefined;
      return this.currentChara.color;
    },
    messageBoxClass: function() {
      return 'send-box-' + this.currentMsgType;
    },
    messageBoxStyle: function() {
      if (this.currentMsgType !== 'chara') return {};
      else return { 'background-color': this.currentCharaColor };
    },
    showOverlay: function() {
      return this.showCharacterMenu || this.showCharacterDialog || this.showMainMenu;
    },
    isMsgBoxSending: function() {
      return false;
    },
    msgBoxValid: function() {
      return this.msgBoxText.trim().length > 0;
    }
  },
  methods: {
    fetchUpdates: function() {
      var scheduleNextUpdate = (function() {
        setTimeout(this.fetchUpdates.bind(this), 5000);
      }).bind(this);

      axios.get('/api/rp/' + this.rpCode + '/updates?since=' + this.rp.lastEventId)
        .then((function(res) {
          this.rp.lastEventId = res.data.lastEventId;

          res.data.updates.forEach((function(update) {
            this.updateState(update);
          }).bind(this));

          scheduleNextUpdate();
        }).bind(this))
        .catch((function(err) {
          console.error(err);
          scheduleNextUpdate();
        }).bind(this))
    },
    updateState: function(update) {
      var arr = this.rp[update.type];

      arr = arr.filter(function(item) { return item._id !== update.data._id });
      arr.push(update.data);
      arr.sort(function(a, b) { return a._id < b._id ? -1 : 1 });

      // keep no more than 60 messages
      if (update.type === 'msgs') {
        arr = arr.slice(-60);
      }

      this.rp[update.type] = arr;
    },
    postUpdate: function(type, body) {
      return axios.post('/api/rp/' + this.rpCode + '/' + type, body)
        .then((function(res) {
          this.updateState({ type: type, data: res.data });
          return res.data;
        }).bind(this));
    },
    sendMessage: function() {
      var data = {
        content: this.msgBoxText,
        type: this.currentMsgType,
        charaId: this.currentCharaId || undefined,
      };
      this.postUpdate('msgs', data)
        .then((function() {
          this.msgBoxText = '';
        }).bind(this));
    },
    sendChara: function() {
      var data = {
        name: this.charaDialogName,
        color: this.charaDialogColor,
      };
      this.postUpdate('charas', data)
        .then((function(data) {
          this.charaDialogName = '';
          this.showCharacterDialog = false;
          this.selectCharacter('chara', data._id);
        }).bind(this));
    },
    putUpdate: function(_id, type, body) {
      return axios.put('/api/rp/' + this.rpCode + '/' + type + '/' + _id, body)
        .then((function(res) {
          this.updateState({ type: type, data: res.data });
          return res.data;
        }).bind(this));
    },
    editMessage: function(_id, body) {
      this.putUpdate(_id, 'msgs', body);
    },
    editChara: function(chara) {
      // TODO use actual chara dialog
      var name = prompt('Rename this character (actual dialog with color input coming later)', chara.name);
      if (name == null) return;
      this.putUpdate(chara._id, 'charas', { name: name, color: chara.color });
    },
    openCharacterMenu: function() {
      this.showCharacterMenu = true;
    },
    openCharacterDialog: function() {
      this.showCharacterDialog = true;
    },
    closeCharacterDialog: function() {
      this.showCharacterDialog = false;
    },
    selectCharacter: function(type, charaId) {
      this.currentMsgType = type;
      this.currentCharaId = (type === 'chara') ? charaId : null;
      this.showCharacterMenu = false;
    },
    showImageDialog: function() {
      // TODO
    },
    showFormatGuide: function() {
      window.open('/format', '_blank').focus();
    },
    clickOverlay: function() {
      if (this.showCharacterDialog) {
        this.showCharacterDialog = false;
      } else if (this.showCharacterMenu) {
        this.showCharacterMenu = false;
      } else if (this.showMainMenu) {
        this.showMainMenu = false;
      }
    },
    openMainMenu: function() {
      this.showMainMenu = true;
    },
    resizeTextareaOnInput: function($event, minRows, maxRows) {
      var el = $event.target;
      while (el.rows > minRows && el.scrollHeight <= el.offsetHeight) {
        el.rows = el.rows - 1;
      }
      while (el.rows < maxRows && el.scrollHeight > el.offsetHeight) {
        el.rows = el.rows + 1;
      }
    },
    onScroll: function() {
      var el = document.querySelector('#messages');
      var bottomDistance = el.scrollHeight - el.scrollTop - el.offsetHeight;
      this.isScrolledToBottom = bottomDistance < 31;
    },
    rescrollToBottom: function() {
      if (!this.isScrolledToBottom) return;

      this.$nextTick((function() {
        var el = document.querySelector('#messages');
        el.scrollTop = el.scrollHeight - el.offsetHeight;
      }).bind(this));
    }
  },
  created: function() {
    axios.get('/api/rp/' + this.rpCode)
      .then((function(res) {
        this.rp = res.data;

        document.title = this.rp.title + ' | RPNow';
        this.isNewRp = this.rp.msgs.length === 0;

        this.fetchUpdates();
      }).bind(this));
  },
  watch: {
    'nightMode': jsonStorage.set.bind(null, 'rpnow.global.nightMode'),
    'pressEnterToSend': jsonStorage.set.bind(null, 'rpnow.global.pressEnterToSend'),
    'showMessageDetails': jsonStorage.set.bind(null, 'rpnow.global.showMessageDetails'),
  }
});
