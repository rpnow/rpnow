module.exports = function auth() {
  return new Promise(function(resolve, reject) {
    // check if we have a token in the cache
    try {
      var str = localStorage.getItem('rpnow.auth');
      if (str != null) {
        var data = JSON.parse(str);
        resolve(data);
        return;
      }
    } catch (err) {}
    resolve(null);

  }).then(function(data) {
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

  }).then(function(data) {
    // if we don't have a valid token, get one (and store it)
    if (data != null) return data;

    return axios.post('/api/user')
      .then(function(res) {
        try {
          localStorage.setItem('rpnow.auth', JSON.stringify(res.data))
        } catch (err) {}
        return res.data;
      })

  }).then(function(data) {
    // set token in headers for future requests
    axios.defaults.headers.common.authorization = 'Bearer ' + data.token;
    return data;
  });
};
