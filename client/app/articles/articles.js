'use strict';

angular.module('rpnow')

.config(['$routeProvider', function($routeProvider) {
    $routeProvider
        .when('/terms', {
            title: 'Terms of Use | RPNow',
            template:`<article ng-include="'/articles/terms.template.html'"></article>`
        })
        .when('/about', {
            title: 'About | RPNow',
            template:`<article ng-include="'/articles/about.template.html'"></article>`
        })
        .otherwise({
            title: 'Not Found | RPNow',
            template:`<article ng-include="'/articles/404.template.html'"></article>`,
            controller: 'NotFoundController'
        });
}])

.controller('NotFoundController', ['$scope', '$location', function($scope, $location) {
    $scope.url = $location.url();
}])