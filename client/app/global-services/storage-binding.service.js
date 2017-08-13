'use strict';

angular.module('rpnow')

.factory('storageBindingService', [function() {
    return function(key, defaultValue) {
        return {
            get value() {
                if (localStorage.getItem(key) === null) return defaultValue;
                return JSON.parse(localStorage.getItem(key));
            },
            set value(value) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        };
    };
}])

.factory('globalSettings', ['storageBindingService', function(storageBindingService) {
    return {
        setting: (key, defaultValue) => storageBindingService(['rpnow',key].join('.'), defaultValue)
    }
}])

.factory('roomSettings', ['storageBindingService', function(storageBindingService) {
    return (rpCode) => ({
        setting: (key, defaultValue) => storageBindingService(['rpnow',rpCode,key].join('.'), defaultValue)
    });
}])