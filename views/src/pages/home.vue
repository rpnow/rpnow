<template>
  <div id="homepage">
    <div v-if="!loading">
      <h1>My RPs</h1>
      <div id="top-options">
        <button class="pane" id="new-rp" v-if="canCreate" @click="createRp">
          Create New RP
        </button>
        <a class="pane" id="import-rp" v-if="canImport" href="/import">
          Import RP
        </a>
      </div>
      <template v-for="room of recentRooms">
        <a :key="'room'+room.rpCode" class="pane recent-rp" :href="'/rp/'+room.rpCode">
          <div class="pretty-block">
            <span class="rp-date">3/27/09</span>
          </div>
          <div class="rp-title">
            {{ room.title }}
          </div>
        </a>
      </template>
    </div>

    <div id="loading" v-else>
      <i class="material-icons">hourglass_full</i>
      Loading...
    </div>

  </div>
</template>

<style scoped>
  #homepage {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 5%;
    box-sizing: border-box;
  }
  h1 {
    margin-top: 30px;
    text-align: center;
    font-weight: normal;
  }
  #top-options {
    display: flex;
    width: 300px;
  }
  .pane {
    display: block;
    height: 100px;
    border: solid 1px rgba(0,0,0,0.5);
    background: none;
    font-family: inherit;
    cursor: pointer;
    margin: 0 5px 10px;
    text-decoration: none;
    color: inherit;
    box-sizing: border-box;
    border-radius: 10px;
    overflow: hidden;
  }
  .recent-rp {
    display: flex;
    flex-direction: column;
  }
  .pretty-block {
    flex: 1;
    position: relative;
    background-color: aquamarine;
  }
  .rp-date {
    position: absolute;
    right: 4px;
    top: 2px;
  }
  .rp-title {
    padding: 3px 10px;
  }
  #new-rp {
    height: 60px;
    font-size: inherit;
    flex-grow: 3;
  }
  #import-rp {
    height: 60px;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>

<script>
  import axios from 'axios';
  import initializeAuth from '../components/user';
  import coolstory from 'coolstory.js';

  export default {
    data() {
      return {
        recentRooms: [],
        loading: true,
        canCreate: false,
        canImport: false,
      };
    },
    beforeMount() {
      document.title = 'My RPs on ' + location.hostname;
      try {
        this.recentRooms = JSON.parse(localStorage.getItem('rpnow.global.recentRooms') || '[]')
      } catch (err) {
        // no big deal
      }
      axios.post('/api/dashboard')
        .then(res => {
          this.canCreate = res.data.canCreate;
          this.canImport = res.data.canImport;
          this.loading = false;
        });
    },
    methods: {
      initializeAuth: initializeAuth,
      createRp() {
        // this.title = prompt("What is this RP called?");
        this.title = coolstory.title(20);

        if (this.title == null) return;

        this.submitRp();
      },
      spinTitle() {
        let millis = 10.0;

        const changeTitle = () => this.title = coolstory.title(20);

        while ((millis *= 1.15) < 200.0 / .15) {
          setTimeout(changeTitle, millis);
        }
      },
      submitRp() {
        this.loading = true;

        this.initializeAuth()
          .then(() => axios.post('/api/rp', { title: this.title }))
          .then(res => window.location.href = '/rp/' + res.data.rpCode)
          .catch((err) => {
            this.loading = false;
            alert('Failed to create RP: (' + err + ')');
          });
      },
    }
  };
</script>

