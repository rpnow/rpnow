<template>
  <div id="login" v-if="user">
    <p>
      You are already logged in as {{ user.name }}.
    </p>
    <p>
      <a href="/">Back to dashboard</a>
    </p>
    <button @click="void $emit('logout')">Log out</button>
  </div>

  <!-- Forbid login without SSL -->
  <div v-else-if="!canLogin" id="forbidden">
    Cannot login without HTTPS enabled
  </div>

  <div v-else id="login">
    <h1>Log in</h1>

    <form @submit.prevent="login">
      <input type="text" name="username" v-model="username" placeholder="Username"/>
      <br>

      <input type="password" name="password" v-model="password" placeholder="Password"/>
      <br>
      <br>

      <button type="submit">LOG IN</button>
    </form>

    <p>
      New user? <a href="/register">Create an account</a>
    </p>
  </div>
</template>

<script>
  import axios from 'axios';

  export default {
    name: 'Login',
    props: {
      user: Object,
    },
    data() {
      return {
        canLogin: (location.protocol === 'https:' || location.hostname === 'localhost'),
        username: '',
        password: '',
      }
    },
    methods: {
      login() {
        const login = { username: this.username, password: this.password };
        axios.post('/api/user/login', login).then((res) => {
          try {
            localStorage.setItem('rpnow.auth', JSON.stringify(res.data))
          } catch (err) {/* it's ok */}
          axios.defaults.headers.common.authorization = 'Bearer '+res.data.token;
          this.$router.replace(this.$route.query.prev)
        });
      },
      register() {
        const login = { username: this.username, password: this.password };
        axios.post('/api/user', login).then((res) => {
          try {
            localStorage.setItem('rpnow.auth', JSON.stringify(res.data))
          } catch (err) {/* it's ok */}
          axios.defaults.headers.common.authorization = 'Bearer '+res.data.token;
          this.$router.replace(this.$route.query.prev)
        });
      },
    }
  };
</script>

<style>
  #login {
    width: 80%;
    max-width: 300px;
    height: 200px;
    margin: auto;
    padding: 50px;
  }
</style>