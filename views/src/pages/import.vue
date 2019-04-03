<template>
  <div id="import-page">
    <h1>Import RP</h1>

    <template v-if="!submitted">
      <label for="json-upload">Import from file:</label><br/>
      <input type="file" ref="fileInput" accept="application/json,.json"><br/><br/>
      <button @click="uploadJson">Upload</button>
    </template>

    <div id="loading" v-else-if="importing">
      <i class="material-icons">hourglass_full</i>
      Your import is processing. You will be redirected when it is complete.
    </div>

    <div id="loading" v-else>
      <i class="material-icons">hourglass_full</i>
      Loading...
    </div>
  </div>
</template>

<script>
  import axios from 'axios';

  export default {
    data: function() {
      return {
        submitted: false,
        importing: false,
      };
    },
    methods: {
      initializeAuth: require('../components/user'),
      uploadJson: function() {
        var file = this.$refs.fileInput.files[0];
        this.submitted = true;

        this.initializeAuth()
          .then((function() {
            var data = new FormData();
            data.append('file', file);
            return axios.post('/api/rp/import', data);
          }).bind(this))
          .then((function(res) {
            this.importing = true;
            this.waitForImport(res.data.rpCode)
          }).bind(this))
          .catch((function(err) {
            this.submitted = false;
            alert('Failed to import RP: (' + err + ')');
          }).bind(this));
      },
      waitForImport: function(rpCode) {
        var scheduleNextUpdate = (function() {
          setTimeout(this.waitForImport.bind(this, rpCode), 5000);
        }).bind(this);

        axios.post('/api/rp/import/' + rpCode, {})
          .then((function(res) {
            if (res.data.status === 'pending') {
              scheduleNextUpdate();
            } else if (res.data.status === 'success') {
              window.location.href = '/rp/' + rpCode;
            } else if (res.data.status === 'error') {
              alert('Failed to import RP: (' + res.data.error + ')');
              this.importing = false;
              this.submitted = false;
            }
          }).bind(this))
          .catch((function(err) {
            if (!err.response) {
              scheduleNextUpdate();
            } else {
              alert('Failed to import RP: (' + err + ')');
              this.importing = false;
              this.submitted = false;
            }
          }).bind(this))
      },
    }
  };
</script>

<style>
  #import-page {
    padding: 20px;
  }
  h1 {
    margin: 0 0 20px;
  }
  i.material-icons {
    font-size: 32px;
    height: 32px;
    width: 32px;
  }
</style>

