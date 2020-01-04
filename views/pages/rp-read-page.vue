<template>
  <div id="app" :class="{'dark-theme':nightMode}">
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
          <router-link class="icon-button" to="/pages">
            <i class="material-icons" title="Back to index">arrow_back</i>
          </router-link>
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
  // TODO make this page available again
  const axios = window.axios;
  import RpMessage from '../components/rp-message.vue';
  import { syncToLocalStorage } from '../components/sync-to-localstorage'

  export default {
    components: {
      RpMessage
    },
    data() {
      return {
        rp: null,
        loadError: null,
        nightMode: false,
      };
    },
    beforeMount() {
      // sync certain properties on this component with values in localStorage
      syncToLocalStorage(this, {
        nightMode: 'rpnow.nightMode',
      });
    },
    computed: {
      charasById() {
        return this.rp.charas.reduce((map, chara) => {
          map[chara._id] = chara;
          return map;
        }, {});
      },
      pageNumber() {
        return this.$route.params.page;
      },
      isFirstPage() {
        return this.pageNumber === 1;
      },
      isLastPage() {
        return this.rp.pageCount <= this.pageNumber;
      }
    },
    methods: {
      changePage(pageNumber) {
        this.$router.push('./'+pageNumber);
      }
    },
    mounted() {
      axios.get('/api/rp/pages/' + this.pageNumber)
        .then(res => {
          this.rp = res.data;
          document.title = 'Page ' + this.pageNumber + ' - ' + this.rp.title;
        })
        .catch(err => {
          this.loadError = err.message
        });
    },
  };
</script>

