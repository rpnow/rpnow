'use strict';

angular.module('rpnow')

.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state({
        name: 'rp.archive',
        url: '/:page',
        component: 'rpArchive'
    })
}])

.component('rpArchive', {
    templateUrl: '/rp-view/rp-archive.template.html',
    controller: 'RpArchiveController'
})

.controller('RpArchiveController', [function() {
    console.log('archive');
}])
