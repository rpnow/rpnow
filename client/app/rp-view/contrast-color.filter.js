'use strict';

angular.module('rpnow')

.factory('yiqBrightness', function() {
    // returns brightness from 0 to 255
    return function(color) {
        // YIQ algorithm modified from:
        //  http://24ways.org/2010/calculating-color-contrast/
        let [r,g,b] = color.match(/[0-9a-f]{2}/g).map(hex => parseInt(hex,16));
        return 0.299*r + 0.597*g + 0.114*b;
    }
})

.filter('contrastColor', ['yiqBrightness', function(yiqBrightness) {
    return function(color, opacity=1) {
        if (!color) return false;
        let brightness = yiqBrightness(color);
        if (brightness >= 128) return `rgba(0,0,0, ${opacity})`;
        else return `rgba(255,255,255, ${opacity})`;
    };
}])

.filter('needsContrastColor', ['yiqBrightness', function(yiqBrightness) {
    return function(color) {
        if (!color) return false;
        let brightness = yiqBrightness(color);
        return brightness < 60 || brightness > 200;
    };
}])
