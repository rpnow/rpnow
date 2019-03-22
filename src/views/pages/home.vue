<template>
  <div id="homepage">
    <h1>{{ siteName }}</h1>

    <div v-if="!loading">
      <div v-if="canCreate">
        <button @click="createRp">Create New RP</button>
      </div>
      <div v-if="canImport">
        <a href="/import">Import RP</a>
      </div>
      <div v-if="recentRooms.length > 0">
        <h2>My recent RPs</h2>
      </div>
      <div v-for="room of recentRooms" :key="'room'+room.rpCode">
        <a :href="'/rp/'+room.rpCode">{{ room.title }}</a>
      </div>
    </div>

    <div id="loading" v-else>
      <i class="material-icons">hourglass_full</i>
      Loading...
    </div>

  </div>
</template>

<script>
  module.exports = {
    data: function() {
      return {
        siteName: 'rpnow',
        recentRooms: [],
        title: '',
        loading: true,
        canCreate: false,
        canImport: false,
      };
    },
    beforeMount: function() {
      this.siteName = location.hostname;
      try {
        this.recentRooms = JSON.parse(localStorage.getItem('rpnow.global.recentRooms') || '[]')
      } catch (err) {
        // no big deal
      }
      axios.post('/api/dashboard')
        .then((function(res) {
          this.canCreate = res.data.canCreate;
          this.canImport = res.data.canImport;
          this.loading = false;
        }).bind(this))
    },
    methods: {
      initializeAuth: require('../components/user'),
      createRp: function() {
        this.title = prompt("What is this RP called?");

        if (this.title == null) return;

        this.submitRp();
      },
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
        this.loading = true;

        this.initializeAuth()
          .then((function() {
            return axios.post('/api/rp', { title: this.title })
          }).bind(this))
          .then(function(res) {
            window.location.href = '/rp/' + res.data.rpCode;
          })
          .catch((function(err) {
            this.loading = false;
            alert('Failed to create RP: (' + err + ')');
          }).bind(this));
      },
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
  h1 {
    padding: 10vh 0 1.7vh;
    margin: -2vmin 0 0;
    text-align: center;
    font-size: calc(12px + 7vmin);
    line-height: 1;
    font-family: "Playfair Display";
    font-weight: normal;
  }
</style>
