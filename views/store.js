const Vue = window.Vue;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonStream(url, cb) {
  // feature detection to possibly polyfill a version of fetch that supports streaming
  var nativeFetchStreams = ('body' in Response.prototype);
  var fetch = nativeFetchStreams ? window.fetch : window.fetchStream;
  // console.log('Native fetch streams? ' + nativeFetchStreams)

  return fetch(url).then(function(response) {
    if (!response.ok) {
      const err = new Error(response.status + ' ' + response.statusText)
      err.response = response;
      throw err;
    }

    var utf8 = new TextDecoder();
    var reader = response.body.getReader();
    var partial = '';

    function loop() {
      // TODO expect whitespace heartbeat from server, normally handled by transport layer but polyfill doesn't seem to notice when the connection breaks for some reason
      return reader.read().then(function(chunk) {
        if (chunk.done) {
          throw new Error('server ended stream');
        }

        partial += utf8.decode(chunk.value);
        var lines = partial.split('\n');
        partial = lines.pop();

        lines.forEach(function (line) {
          var json = line.trim();
          if (json.length === 0) return;
          var value = JSON.parse(json)
          cb(value);
        })

        return loop();
      })
    }
    return loop();
  })
}

export const state = Vue.observable({
  loaded: false,
  error: null,
  title: null,
  msgs: null,
  charas: null,
});

export async function initialize() {
  jsonStream('/api/rp/chat', updateState)
  .catch(function (err) {
    if (err.response && err.response.status === 401) {
      fetch('/api/user/anon', { method: 'POST' })
      .then(initialize);
    } else {
      state.error = err;
      setTimeout(initialize, 2000);
    }
  })
}

function updateState(update) {
  if (update.type === 'init') {
    Object.assign(state, update.data, { loaded: true, error: null });
  } else if (update.type === 'title') {
    state.title = update.data;
  } else {
    state[update.type] = state[update.type]
      .filter(item => item._id !== update.data._id)
      .concat([update.data])
      .sort((a, b) => a._id < b._id ? -1 : 1);
    
    // keep no more than 60 messages
    if (update.type === 'msgs') {
      state.msgs = state.msgs.slice(-60);
    }
  }
}

function sendUpdate(type, body, _id) {
  var url = '/api/rp/' + type + (_id ? ('/' + _id) : '');
  return fetch(url, {
    method: _id ? 'PUT' : 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  })
    .then(response => {
      if (response.ok) {
        return response.json().then(data => {
          updateState({ data, type })
          return data;
        });
      } else {
        return response.json().then(data => {
          if (data.error) throw new Error(data.error);
          throw new Error(response.statusText)
        })
      }
    })
    .catch(err => {
      alert('Error! ' + err)
      throw err;
    });
}

export function sendMessage(data, _id) {
  return sendUpdate('msgs', data, _id);
}

export function sendChara(data, _id) {
  return sendUpdate('charas', data, _id);
}

function getThingHistory(type, _id) {
  return fetch('/api/rp/' + type + '/' + _id + '/history')
    .then(res => res.json())
    .catch(err => {
      alert('Error! ' + err)
      throw err;
    });
}

export function getMessageHistory(_id) {
  return getThingHistory('msgs', _id);
}

export function changeTitle() {
  const title = prompt('Enter the title for this RP:', state.title);
  if (title != null) {
    return fetch('/api/rp/title', {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ title }),
    })
    .then(() => state.title = title)
    .catch(err => {
      alert('Error! ' + err)
      throw err;
    });
  }
}

export function openWebhookDialog() {
  const webhook = prompt('Webhook URL, please:');
  if (webhook) {
    return fetch('/api/rp/webhook', {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ webhook }),
    })
    .then(() => alert('Webhook added successfully'))
    .catch(err => {
      alert('Error! ' + (err && err.response && JSON.stringify(err.response.data) || err))
      throw err;
    });
  }
}
