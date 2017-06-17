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
    templateUrl: '/rp-view/rp-feed.template.html',
    template: ``,
    controller: 'RpFeedController'
})

.controller('RpFeedController', [function() {
    console.log('feed');
}])
