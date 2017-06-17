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
    template: `<span>It's the archive.</span>`,
    controller: 'RpArchiveController'
})

.controller('RpArchiveController', [function() {
    console.log('archive');
}])
