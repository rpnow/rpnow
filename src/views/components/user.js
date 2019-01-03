module.exports = function auth() {
  return new Promise(function(resolve, reject) {
    try {
      var str = localStorage.getItem('rpnow.auth');
      if (str != null) {
        var data = JSON.parse(str);
        resolve(data);
        return;
      }
    } catch (err) {}

    axios.post('/api/user')
      .then(function(res) {
        try {
          localStorage.setItem('rpnow.auth', JSON.stringify(res.data))
        } catch (err) {}
        resolve(res.data);
      })
      .catch(function(err) {
        reject(err);
      });

  }).then(function(data) {
    axios.defaults.headers.common.authorization = 'Bearer ' + data.token;
    return data;
  });
};
