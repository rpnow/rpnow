'use strict';

angular.module('rpnow')

.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state({
        name: 'terms',
        url: '/terms',
        template:`<article ng-include="'/articles/terms.template.html'"></article>`,
        meta: {
            title: 'Terms of Use | RPNow'
        }
    })
    .state({
        name: 'about',
        url: '/about',
        template:`<article ng-include="'/articles/about.template.html'"></article>`,
        meta: {
            title: 'About | RPNow'
        }
    })
    .state({
        name: '404',
        url: '*path',
        template:`<article ng-include="'/articles/404.template.html'"></article>`,
        meta: {
            title: 'Not Found | RPNow'
        },
        controller: 'NotFoundController'
    })
}])

.controller('NotFoundController', ['$scope', '$location', function($scope, $location) {
    $scope.url = $location.url();
}])