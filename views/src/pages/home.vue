<template>
  <div id="homepage">
    <div v-if="loading" id="loading">
      <i class="material-icons">hourglass_full</i>
      Loading...
    </div>

    <template v-else>
      <!-- Header: if logged in, "<username>'s RPs" otherwise "Welcome, stranger" -->
      <h1>{{ user.anon ? 'Welcome, stranger' : myUsername + "'s RPs" }}</h1>

      <!-- If logged in, show "logout" button under header -->
      <button id="logout-button" v-if="!user.anon" @click="void $emit('logout')">Log out</button>

      <!-- If you can create an RP, ("anon create" is set, or logged in with privileges) show "create" button -->
      <div v-if="canCreate" id="top-options">
        <button class="pane" id="new-rp" @click="createRp">
          Create New RP
        </button>
        <router-link class="pane" id="import-rp" to="/import">
          Import RP
        </router-link>
      </div>

      <!-- If no RPs, show "No recent RPs." -->
      <p v-if="!user.anon && rooms.length === 0">No recent RPs.</p>

      <!-- If no RPs and cannot create one, inform about how to get into an RP -->
      <p v-if="rooms.length === 0 && !canCreate">
        To join an RP, ask the host for a link. (Or, if you're the admin of this site, create an RP using rpadmin.) 
      </p>

      <!-- If no RPs, not logged in, but can login (SSL), suggest logging in -->
      <p v-if="user.anon && canLogin">
        <router-link to="/register">Create an account</router-link> or <router-link to="/login">log in</router-link> to keep track of all your RPs.
      </p>

      <!-- If there are RPs, list them -->
      <template v-for="room of rooms">
        <router-link :key="'room'+room.rpCode" class="pane recent-rp" :to="'/rp/'+room.rpCode">
          <div class="pretty-block" :style="blockStyles(room)">
            <span class="rp-date">{{ timeAgoText(room.updated) }}</span>
          </div>
          <div class="rp-title">
            {{ room.title }}
          </div>
        </router-link>
      </template>
    </template>

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
    margin: 30px auto 0;
    text-align: center;
    font-weight: normal;
  }
  #logout-button {
    margin: 7px auto 0;
    background: none;
    border: solid 1px rgba(0,0,0,0.5);
    padding: 5px 20px;
    border-radius: 5px;
    cursor: pointer;
  }
  #top-options {
    margin-top: 30px;
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
    width: 290px;
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
      blockStyles(room) {
        const id = room.rpCode;
        // hash id into 32-bit integer
        var hash = 0, i, chr;
        for (i = 0; i < id.length; i++) {
          chr   = id.charCodeAt(i);
          hash  = ((hash << 5) - hash) + chr;
          hash |= 0; // Convert to 32bit integer
        }

        const [r, g, b] = [0,8,16].map(sh => hash >> sh & 255)
        const light = (r*299)+(g*587)+(b*114) > 128000;

        return {
          backgroundColor: `rgb(${r}, ${g}, ${b})`,
          color: light? 'black':'white'
        }
      },
      timeAgoText(timestamp) {
        const ago = Date.now() - new Date(timestamp).getTime();
        if (ago < 1000 * 60*60*24) {
          return new Date(timestamp).toLocaleTimeString();
        } else {
          return new Date(timestamp).toLocaleDateString();
        }
      },
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
          .then(res => this.$router.push('/rp/' + res.data.rpCode))
          .catch((err) => {
            this.loading = false;
            alert('Failed to create RP: (' + err + ')');
          });
      },
    }
  };
</script>

