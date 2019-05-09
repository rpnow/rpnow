<template>
  <div v-if="loading">
    Loading...
  </div>
  <router-view v-else :user="user" @logout="logout"></router-view>
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
    mounted() {
      new Promise((resolve) => {
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
          .then(function() { return Promise.resolve(data) })
          .catch(function(err) { 
            if (err.response && err.response.status === 401) {
              return Promise.resolve(null);
            } else {
              throw err;
            }
          });

      }).then((data) => {
        // this is the user
        this.user = data;
        this.loading = false;
      });
    },
    methods: {
      logout() {
        try {
          localStorage.removeItem('rpnow.auth')
        } catch (err) {/* it's ok */}
        this.user = null;
      }
    },
    watch: {
      user(user) {
        axios.defaults.headers.common.authorization = (user == null) ? '' : ('Bearer '+user.token)
      },
    },
  };
</script>