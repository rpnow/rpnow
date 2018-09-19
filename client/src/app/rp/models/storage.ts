const fakeStorage = {};

export function getLocalObject(key) {
    let str;
    try {
        str = localStorage.getItem(key);
    }
    catch (ex) {
        str = fakeStorage[key];
    }
    if (str == null) return str;
    return JSON.parse(str);
}

export function setLocalObject(key, obj) {
    const str = JSON.stringify(obj);
    try {
        localStorage.setItem(key, str);
    }
    catch (ex) {
        fakeStorage[key] = str;
    }
}