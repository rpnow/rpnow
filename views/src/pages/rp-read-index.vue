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
          <span>
            {{ rp.title }}
          </span>
        </div>

        <div id="messages">
          <div id="archive-advice" v-if="rp.pageCount === 0">
            Nothing has been written yet.
          </div>

          <div id="archive-advice" v-if="rp.pageCount > 0">
            Select a page to start reading!
          </div>

          <div id="archive-index">
            <template v-for="n of rp.pageCount">
              <a class="page-number-link" :href="'/read/'+readCode+'/page/'+n" :key="n">
                {{ n }}
              </a>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
  import axios from 'axios';

  export default {
    data: function() {
      return {
        readCode: null,
        rp: null,
        loadError: null,
      };
    },
    beforeMount: function() {
      // get rpCode from URL
      this.readCode = location.pathname.match(/\/read\/([^/]+)/)[1];
    },
    methods: {
      changePage: function(pageNumber) {
        location.href = './'+pageNumber;
      }
    },
    mounted: function() {
      axios.get('/api/rp/' + this.readCode + '/pages')
        .then((function(res) {
          this.rp = res.data;
          document.title = this.rp.title;
        }).bind(this))
        .catch((function() {
          this.loadError = 'Check the URL and try again.'
        }).bind(this));
    },
  };
</script>

