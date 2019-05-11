<template>
  <div id="login" v-if="!user.anon">
    <p>
      You are already logged in as {{ user.userid }}.
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
    <h1>{{ isRegister ? 'New user' : 'Log in' }}</h1>

    <form @submit.prevent="login">
      <input type="text" name="username" v-model="username" placeholder="Username" required pattern="^[!-~]+$" minlength="1" maxlength="30"/>
      <br>

      <input type="password" name="password" v-model="password" placeholder="Password" required minlength="6" maxlength="100" @keyup="checkPasswordMatch"/>
      <br>

      <template v-if="isRegister">
        <input id="passwordAgain" type="password" v-model="passwordAgain" placeholder="Password again" required minlength="6" maxlength="100" @keyup="checkPasswordMatch"/>
        <br>
      </template>

      <br>

      <button type="submit">Submit</button>
    </form>

    <p v-if="!isRegister">
      New user? <a href="/register">Create an account</a>
    </p>

    <p v-if="isRegister">
      Already registered? <a href="/login">Log in</a>
    </p>

    <p>
      Or, <a href="/">go back home</a>
    </p>
  </div>
</template>

<script>
  import axios from 'axios';

  export default {
    name: 'Login',
    props: {
      user: Object,
      isRegister: Boolean
    },
    data() {
      return {
        canLogin: (location.protocol === 'https:' || location.hostname === 'localhost'),
        username: '',
        password: '',
        passwordAgain: '',
      }
    },
    methods: {
      checkPasswordMatch() {
        if (!this.isRegister) return;

        if (this.password !== this.passwordAgain) {
          document.querySelector('#passwordAgain').setCustomValidity("Password does not match");
        } else {
          document.querySelector('#passwordAgain').setCustomValidity('');
        }
      },
      login() {
        const login = { username: this.username, password: this.password };
        const api = (this.isRegister ? '/api/user' : '/api/user/login');
        axios.post(api, login).then((res) => {
          try {
            localStorage.setItem('rpnow.auth', JSON.stringify(res.data))
          } catch (err) {/* it's ok */}
          this.$emit('change-user', res.data);
          this.$router.push('/');
        }).catch(err =>{
          alert(`Error - ${err.response.data}`)
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