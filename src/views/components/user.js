module.exports = function auth() {
  return axios.post('/api/user')
    .then((function(res) {
      axios.defaults.headers.common.authorization = 'Bearer ' + res.data.token
    }).bind(this))
};
