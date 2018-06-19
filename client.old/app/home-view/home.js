'use strict';

angular.module('rpnow')

.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state({
        name: 'home',
        url: '/',
        templateUrl: '/home-view/home.template.html',
        controller: 'HomeController',
        meta: {
            title: 'RPNow'
        },
    })
}])

.controller('HomeController', ['$scope', '$timeout', '$location', '$http', '$mdMedia', function($scope, $timeout, $location, $http, $mdMedia) {
    var spinTimer = null;
    function tick(millis) {
        $scope.title = coolstory.title(25);
        if (millis < 200.0) spinTimer = $timeout(tick, millis, true, millis * 1.15);
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
