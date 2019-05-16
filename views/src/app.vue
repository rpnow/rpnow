<template>
  <div v-if="loading">
    Loading...
  </div>
  <router-view v-else :key="$route.fullPath" :user="user" :myUsername="myUsername" @logout="logout" @change-user="setUser"></router-view>
</template>

<script>
  import axios from 'axios';

  export default {
    data() {
      return {
        loading: true,
        user: null,
      };
    },
    computed: {
      myUsername() {
        return this.user && this.user.userid.substr(this.user.userid.indexOf(':') + 1);
      }
    },
    mounted() {
      this.initAuth();
    },
    methods: {
      initAuth() {
        this.loading = true;

        return new Promise((resolve) => {
          // check if we have a token in the cache
          try {
            var str = localStorage.getItem('rpnow.auth');
            if (str != null) {
              var data = JSON.parse(str);
              resolve(data);
              return;
            }
          } catch (err) {/* it's ok */}
          resolve(null);

        }).then((data) => {
          // if we do, make sure that it's valid. otherwise discard it
          if (data == null) return null;

          axios.defaults.headers.common.authorization = 'Bearer ' + data.token;
          return axios.get('/api/user/verify')
            .then(() => data)
            .catch((err) => { 
              if (err.response && err.response.status === 401) {
                return null;
              } else {
                throw err;
              }
            });

        }).then((data) => {
          // if we don't have a valid token, get one (and store it)
          if (data != null) return data;

          return axios.post('/api/user/anon')
            .then((res) => {
              this.setUser(res.data);
              return res.data;
            });

        }).then((data) => {
          // this is the user
          this.user = data;
          this.loading = false;
        });
      },
      setUser(user) {
        try {
          localStorage.setItem('rpnow.auth', JSON.stringify(user))
        } catch (err) {/* it's ok */}
        this.user = user;
      },
      logout() {
        try {
          localStorage.removeItem('rpnow.auth')
        } catch (err) {/* it's ok */}
        this.user = null;
        this.initAuth();
      }
    },
    watch: {
      user(user) {
        axios.defaults.headers.common.authorization = (user == null) ? '' : ('Bearer '+user.token)
      },
    },
  };
</script>