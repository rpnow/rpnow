'use strict';

angular.module('rpnow')

.config(function() {
    moment.defineLocale('en-short', {
        parentLocale: 'en',
        relativeTime: {
            past: function(val) {
                if (val === 'now') return 'now';
                return `${val} ago`;
            },
            s: 'now',
            m: '1 m', mm: '%d m',
            h: '1 h', hh: '%d h',
            d: '1 d', dd: '%d d',
            M: '1 Mo', MM: '%d Mo',
            y: '1 y', yy: '%d y'
        }
    });
})

.directive('momentAgoShort', ['timestampUpdateService', function(timestampUpdateService) {
    return {
        template: '<span>{{momentAgoShort}}</span>',
        replace: true,
        link: function(scope, el, attrs) {
            function updateTime() {
                var timestamp = scope.$eval(attrs.momentAgoShort);
                scope.momentAgoShort = moment(timestamp*1000).locale('en-short').fromNow();
            }
            timestampUpdateService.onTimeAgo(scope, updateTime);
            updateTime();
        }
    }
}])

.filter('momentAgo', function() {
    return function(timestamp) {
        return moment(timestamp*1000).calendar();
    }
})

// https://stackoverflow.com/questions/18006334/updating-time-ago-values-in-angularjs-and-momentjs
.factory('timestampUpdateService', ['$rootScope', function($rootScope) {
    function timeAgoTick() {
        $rootScope.$broadcast('e:timeAgo');
    }
    setInterval(function() {
        timeAgoTick();
        $rootScope.$apply();
    }, 1000*60);
    return {
        timeAgoTick: timeAgoTick,
        onTimeAgo: function($scope, handler) {
            $scope.$on('e:timeAgo', handler);
        }
    };
}])
