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
    controller: 'RpArchiveController',
    bindings: {
        rp: '<',
        pressEnterToSend: '<',
        showDetails: '<'
    }
})

.controller('RpArchiveController', ['$stateParams', function($stateParams) {
    const $ctrl = this;

    const POSTS_PER_PAGE = 5;
    
    $ctrl.$onInit = function() {
        $ctrl.page = +$stateParams.page;
        $ctrl.numPages = Math.ceil($ctrl.rp.msgs.length/POSTS_PER_PAGE);
        let startId = ($ctrl.page - 1) * POSTS_PER_PAGE;
        $ctrl.msgs = $ctrl.rp.msgs.slice(startId, startId+POSTS_PER_PAGE);
    }
}])
