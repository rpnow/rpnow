'use strict';

angular.module('rpnow')

.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state({
        name: 'terms',
        url: '/terms',
        template:`<md-content><article ng-include="'/articles/terms.template.html'"></article></md-content>`,
        meta: {
            title: 'Terms of Use | RPNow'
        }
    })
    .state({
        name: 'about',
        url: '/about',
        template:`<md-content><article ng-include="'/articles/about.template.html'"></article></md-content>`,
        meta: {
            title: 'About | RPNow'
        }
    })
    .state({
        name: '404',
        url: '*path',
        template:`<md-content><article ng-include="'/articles/404.template.html'"></article></md-content>`,
        meta: {
            title: 'Not Found | RPNow'
        },
        controller: 'NotFoundController'
    })
}])

.controller('NotFoundController', ['$scope', '$location', function($scope, $location) {
    $scope.url = $location.url();
}])