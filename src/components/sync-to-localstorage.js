export function syncToLocalStorage(vm, watchProps) {
  // store and retrieve json as objects in localStorage
  // (or memory if localStorage doesn't work)
  var fakeStorage = {};

  function getJson(key) {
    var str;
    try {
      str = localStorage.getItem(key);
    } catch (ex) {
      str = fakeStorage[key];
    }
    if (str == null) return null;
    return JSON.parse(str);
  }
  function saveJsonFn(key) {
    return function setter(obj) {
      var str = JSON.stringify(obj);
      try {
        localStorage.setItem(key, str);
      } catch (ex) {
        fakeStorage[key] = str;
      }
    }
  }

  for (var prop in watchProps) {
    var key = watchProps[prop];

    var savedValue = getJson(key);
    if (savedValue != null) vm[prop] = savedValue;

    vm.$watch(prop, saveJsonFn(key));
  }
}
