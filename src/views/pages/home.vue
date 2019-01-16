<template>
  <div id="homepage">
    <header title="Let's RPNow">
      <aside>Let's</aside>
      <h1>RPNow</h1>
    </header>

    <p id="subheader">
      Free,&nbsp;private, no-registration
      roleplay&nbsp;chatrooms.
    </p>

    <template v-if="!submitted">
      <div id="title-entry">
        <input type="text" maxlength="30" placeholder="Name your story" v-model="title">
        <button id="random-button" v-on:click="spinTitle" title="Random title!">
          <i class="material-icons">casino</i>
        </button>
        <button id="go-button" v-on:click="submitRp" v-bind:disabled="!(title.trim())">
          <i class="material-icons">arrow_forward</i>
        </button>
      </div>

      <label for="json-upload">Import from rpnow.net:</label>
      <input type="file" ref="fileInput" accept="application/json,.json">
      <button @click="uploadJson">Upload</button>
    </template>

    <div id="loading" v-if="submitted">
      <i class="material-icons">hourglass_full</i>
      Loading...
    </div>

  </div>
</template>

<script>
  module.exports = {
    data: function() {
      return {
        title: '',
        submitted: false,
      };
    },
    methods: {
      initializeAuth: require('../components/user'),
      spinTitle: function() {
        var millis = 10.0;

        var changeTitle = (function() {
          this.title = coolstory.title(20);
        }).bind(this);

        while ((millis *= 1.15) < 200.0 / .15) {
          setTimeout(changeTitle, millis);
        }
      },
      submitRp: function() {
        this.submitted = true;

        this.initializeAuth()
          .then((function() {
            return axios.post('/api/rp', { title: this.title })
          }).bind(this))
          .then(function(res) {
            window.location.href = '/rp/' + res.data.rpCode;
          })
          .catch((function(err) {
            this.submitted = false;
            alert('Failed to create RP: (' + err + ')');
          }).bind(this));
      },
      uploadJson: function(evt) {
        var file = this.$refs.fileInput.files[0];
        this.submitted = true;

        this.initializeAuth()
          .then((function() {
            var data = new FormData();
            data.append('file', file);
            return axios.post('/api/rp/import', data);
          }).bind(this))
          .then(function(res) {
            window.location.href = '/rp/' + res.data.rpCode;
          })
          .catch((function(err) {
            this.submitted = false;
            alert('Failed to import RP: (' + err + ')');
          }).bind(this));
      }
    }
  };
</script>

<style>
  #homepage {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 5%;
    box-sizing: border-box;
  }
  p {
    margin: 0;
    text-align: center;
    line-height: 1.5;
  }
  header {
    padding: 10vh 0 1.7vh;
  }
  header aside {
    transform: translate(calc(-20vmin - 32px)) rotate(-10deg);
    text-align: center;
    margin-bottom: 0;
    font-size: calc(16px + 7vmin);
    line-height: 1;
    font-family: "Alice";
  }
  header h1 {
    margin: -2vmin 0 0;
    text-align: center;
    font-size: calc(24px + 14vmin);
    line-height: 1;
    font-family: "Playfair Display";
    font-weight: normal;
  }
  #subheader {
    font-size: 16px;
    opacity: 0.7;
    font-style: italic;
  }
  @media (min-width: 650px) {
    #subheader {
      font-size: 20px;
    }
  }
  #title-entry {
    box-shadow: 0 0.5px 1.5px rgba(0,0,0,0.5);
    border-radius: 2px;
    margin: 7vh 0 10vh;
    display:flex;
    flex-direction:row;
    align-items: center;
    overflow: hidden;
    width: 100%;
    max-width: 400px;
  }
  #title-entry input {
    background: none;
    outline: none;
    border: none;
    padding: 15px 0 15px 10px;
    width: 100%;
    font-family: Alice;
    font-size: 16px;
  }
  #title-entry #random-button {
    background: none;
    outline: none;
    border: none;
    cursor: pointer;
    opacity: 0.2;
    padding-left: 5px;
    padding-right: 10px;
  }
  #title-entry #go-button {
    align-self: stretch;
    border: none;
    outline: none;
    border-radius: 0;
    box-shadow: none;
    padding: 0;
    width: 15vh;
    max-width: 80px;
    transition: 0.2s;
  }
  #go-button:not([disabled]) {
    cursor: pointer;
    background-color: #7c4dff;
    color: white;
  }
  #title-entry button {
    padding: 0;
  }
  #title-entry button i {
    padding: 15px 0;
  }
  @media (min-width: 650px) {
    #title-entry {
      max-width: 500px;
    }
    #title-entry input {
      font-size: 24px;
    }
    #go-button {
      max-width: 120px;
    }
    #title-entry button i {
      font-size: 32px;
      height: 32px;
      width: 32px;
    }
  }
  i.material-icons {
    font-size: 32px;
    height: 32px;
    width: 32px;
  }
  #loading {
    margin-top: 7vh;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
</style>
