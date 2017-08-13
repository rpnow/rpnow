'use strict';

angular.module('rpnow')

.factory('storageBinder', [function() {
    return function($ctrl, propName, key) {
        let defaultValue = $ctrl[key];
        Object.defineProperty($ctrl, propName, {
            get: function() {
                if (localStorage.getItem(key) === null) return defaultValue;
                return JSON.parse(localStorage.getItem(key));
            },
            set: function(value) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        });
    };
}])

.factory('globalSetting', ['storageBinder', function(storageBinder) {
    return ($ctrl, propName, key) => storageBinder($ctrl, propName, ['rpnow',(key||propName)].join('.'));
}])

.factory('roomSetting', ['storageBinder', function(storageBinder) {
    return (rpCode) => ({
        setting: ($ctrl, propName, key) => storageBinder($ctrl, propName ['rpnow',rpCode,(key||propName)].join('.'))
    });
}])