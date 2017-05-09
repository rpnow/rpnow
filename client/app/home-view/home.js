'use strict';

angular.module('rpnow')

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {
        title: 'RPNow',
        templateUrl: 'home-view/home.template.html',
        controller: 'HomeController'
    })
}])

.controller('HomeController', ['$scope', '$timeout', '$location', '$http', '$mdMedia', 'RPRandom', function($scope, $timeout, $location, $http, $mdMedia, RPRandom) {
    var spinTimer = null;
    function tick(millis) {
        RPRandom.roll('title', 25).then(function(title) {
            $scope.$apply(function() {
                $scope.title = title;
            });
            if (millis < 200.0) spinTimer = $timeout(tick, millis, true, millis * 1.15);
        })
    }
    $scope.spinTitle = function() {
        if (spinTimer) $timeout.cancel(spinTimer);
        tick(10.0);
    }

    $scope.submit = function() {
        $scope.submitted = true;
        $http.post('/api/rp.json', {title: $scope.title, desc: $scope.desc})
            .then(function(res) {
                $scope.rpCode = res.data.rpCode;
                $location.url('/rp/'+$scope.rpCode);
            });
    };

    $scope.$watch(function() { return $mdMedia('xs'); }, function(result) {
        $scope.isXs = result;
    });
}])

.factory('RPRandom', ['$http', function($http) {
    var types = {
        'title': ':Title'
    };
    var dictPromises = {
        'title': $http.get('/assets/titles.json')
    };

    function fillString(str, dict) {
        do {
            var lastStr = str;
            str = str.replace(/:([a-zA-Z]+):?/, dictRep);
        } while(str !== lastStr);
        function dictRep(match, inner) {
            var x = dict[inner];
            if(x) return x[Math.floor(Math.random()*x.length)];
            else return inner.toUpperCase() + '?';
        }
        return str.trim().replace(/\s+/g, ' ');
    }
    return {
        roll: function(template, maxLength) {
            return new Promise(function(success, fail) {
                dictPromises[template].then(function(res) {
                    while (true) {
                        var str = fillString(types[template], res.data);
                        if (maxLength && str.length > maxLength) continue;
                        return success(str);
                    }
                })
            })
        }
    }
}])
