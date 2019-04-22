<template>
  <div id="login">
    <h1>Who are you?</h1>
    <form @submit.prevent="login">
      <input type="text" name="username" v-model="username" placeholder="Username"/>
      <br>

      <input type="password" name="password" v-model="password" placeholder="Password"/>
      <br>
      <br>

      <button type="submit">LOG IN</button>
    </form>
  </div>
</template>

<script>
  import axios from 'axios';

  export default {
    data() {
      return {
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