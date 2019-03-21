<template>
  <div id="app">
    <div id="loading" v-if="rp == null && loadError == null">
      <i class="material-icons">hourglass_full</i>
      <span>Loading...</span>
    </div>

    <div id="loading" v-if="loadError != null">
      <i class="material-icons">error</i>
      <span>Failed to load RP! {{ loadError }}</span>
    </div>

    <template v-if="rp != null">
      <div id="main-column">
        <div id="chat-header">
          <a class="icon-button" :href="'/read/'+readCode">
            <i class="material-icons" title="Back to index">arrow_back</i>
          </a>
          <span>
            {{ rp.title }}
          </span>
        </div>

        <div id="pager">
          <button class="icon-button" :disabled="isFirstPage" @click="changePage(1)">
            <i class="material-icons" title="First page">first_page</i>
          </button>
          <button class="icon-button" :disabled="isFirstPage" @click="changePage(pageNumber-1)">
            <i class="material-icons" title="Previous page">navigate_before</i>
          </button>

          Page {{ pageNumber }}

          <button class="icon-button" :disabled="isLastPage" @click="changePage(pageNumber+1)">
            <i class="material-icons" title="Next page">navigate_next</i>
          </button>
          <button class="icon-button" :disabled="isLastPage" @click="changePage(rp.pageCount)">
            <i class="material-icons" title="Last page">last_page</i>
          </button>
        </div>

        <div id="messages">
          <div id="archive-advice" v-if="rp.msgs.length === 0">
            Nothing on this page yet.
          </div>

          <template v-for="msg of rp.msgs">
            <rp-message
              v-bind="msg"
              :key="msg._id"
              :chara="charasById[msg.charaId]"
              :press-enter-to-send="false"
              :show-message-details="false"
              :can-edit="false"
            ></rp-message>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
  module.exports = {
    components: {
      'rp-message': require('../components/rp-message.vue'),
    },
    data: function() {
      return {
        pageNumber: null,
        readCode: null,
        rp: null,
        loadError: null,
      };
    },
    beforeMount: function() {
      // get rpCode from URL
      this.pageNumber = +(location.pathname.match(/\/page\/(\d+)/))[1];
      this.readCode = location.pathname.match(/\/read\/([^\/]+)/)[1];
    },
    computed: {
      charasById: function() {
        return this.rp.charas.reduce(function(map, chara) {
          map[chara._id] = chara;
          return map;
        }, {});
      },
      isFirstPage: function() {
        return this.pageNumber === 1;
      },
      isLastPage: function() {
        return this.rp.pageCount <= this.pageNumber;
      }
    },
    methods: {
      changePage: function(pageNumber) {
        location.href = './'+pageNumber;
      }
    },
    mounted: function() {
      axios.get('/api/rp/' + this.readCode + '/pages/' + this.pageNumber)
        .then((function(res) {
          this.rp = res.data;
          document.title = 'Page ' + this.pageNumber + ' - ' + this.rp.title;
        }).bind(this))
        .catch((function(err) {
          this.loadError = 'Check the URL and try again.'
        }).bind(this));
    },
  };
</script>

