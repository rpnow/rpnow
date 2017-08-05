'use strict';

angular.module('rpnow')

.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state({
        name: 'rp.feed',
        url: '',
        component: 'rpFeed',
        resolve: {
            msgs: ['rp', rp => rp.msgs]
        }
    })
}])

.component('rpFeed', {
    templateUrl: '/rp-view/rp-feed.template.html',
    template: ``,
    controller: 'RpFeedController',
    bindings: {
        msgs: '<',
        showDetails: '<'
    }
})

.controller('RpFeedController', [function() {
    const $ctrl = this;

    var RECENT_MSG_COUNT = 100;
    var MAX_RECENT_MSG_COUNT = 200;

    $ctrl.$onInit = function() {
        $ctrl.isStoryGlued = true;
        $ctrl.numMsgsToShow = RECENT_MSG_COUNT;
    };
}])
