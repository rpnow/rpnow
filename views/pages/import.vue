<template>
  <div id="import-page">
    <h1>Import RP</h1>

    <template v-if="!submitted">
      <label for="json-upload">Import from file:</label><br/>
      <input type="file" ref="fileInput" accept="application/json,.json"><br/><br/>
      <button @click="uploadJson">Upload</button>

      <p>
        Or, <router-link to="/">go back home</router-link>
      </p>
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
  const axios = window.axios;

  export default {
    data() {
      return {
        submitted: false,
        importing: false,
      };
    },
    mounted() {
      document.title = 'Import RP';
    },
    methods: {
      uploadJson() {
        var file = this.$refs.fileInput.files[0];
        this.submitted = true;

        var data = new FormData();
        data.append('file', file);

        axios.post('/api/rp/import', data)
          .then(res => {
            this.$router.push('/rp/' + res.data.rpCode);
          })
          .catch(err => {
            this.submitted = false;
            alert('Failed to import RP: (' + err + ')');
          });
      },
    }
  };
</script>
