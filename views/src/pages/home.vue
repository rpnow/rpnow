<template>
  <div id="homepage">
    <div v-if="loading" id="loading">
      <i class="material-icons">hourglass_full</i>
      Loading...
    </div>

    <div v-else>
      <!-- Header: if logged in, "<username>'s RPs" otherwise "Welcome, stranger" -->
      <h1>{{ user.anon ? 'Welcome, stranger' : myUsername + "'s RPs" }}</h1>

      <!-- If logged in, show "logout" button under header -->
      <button v-if="!user.anon" @click="void $emit('logout')">LOGOUT</button>

      <!-- If you can create an RP, ("anon create" is set, or logged in with privileges) show "create" button -->
      <div v-if="canCreate" id="top-options">
        <button class="pane" id="new-rp" @click="createRp">
          Create New RP
        </button>
        <a class="pane" id="import-rp" href="/import">
          Import RP
        </a>
      </div>

      <!-- If no RPs, show "No recent RPs." -->
      <p v-if="!user.anon && rooms.length === 0">No recent RPs.</p>

      <!-- If no RPs and cannot create one, inform about how to get into an RP -->
      <p v-if="rooms.length === 0 && !canCreate">
        To join an RP, ask the host for a link. (Or, if you're the admin of this site, create an RP using rpadmin.) 
      </p>

      <!-- If no RPs, not logged in, but can login (SSL), suggest logging in -->
      <p v-if="user.anon && canLogin">
        <a href="/register">Create an account</a> or <a href="/login">log in</a> to keep track of all your RPs.
      </p>

      <!-- If there are RPs, list them -->
      <template v-for="room of rooms">
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
  import coolstory from 'coolstory.js';

  export default {
    name: 'Dashboard',
    props: {
      user: Object,
      myUsername: String,
    },
    data() {
      return {
        loading: true,
        canLogin: (location.protocol === 'https:' || location.hostname === 'localhost'),
        canCreate: false,
        rooms: []
      };
    },
    beforeMount() {
      document.title = 'My RPs on ' + location.hostname;
      axios.post('/api/dashboard')
        .then(res => {
          this.canCreate = res.data.canCreate;
          this.rooms = res.data.rooms;
          this.loading = false;
        });
    },
    methods: {
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

        axios.post('/api/rp', { title: this.title })
          .then(res => window.location.href = '/rp/' + res.data.rpCode)
          .catch((err) => {
            this.loading = false;
            alert('Failed to create RP: (' + err + ')');
          });
      },
    }
  };
</script>

