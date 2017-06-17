'use strict';

angular.module('rpnow')

.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state({
        name: 'rp.feed',
        url: '',
        component: 'rpFeed'
    })
}])

.component('rpFeed', {
    template: `<span>The regular feed.</span>`,
    controller: 'RpFeedController'
})

.controller('RpFeedController', [function() {
    console.log('feed');
}])
