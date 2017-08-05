'use strict';

angular.module('rpnow')

.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state({
        name: 'rp',
        url: '/rp/:rpCode',
        abstract: true,
        component: 'rpView',
        meta: {
            title: 'Loading RP... | RPNow'
        },
        resolve: {
            rp: ['rpService', '$stateParams', function(rpService, $stateParams) {
                return rpService.rp($stateParams.rpCode);
            }]
        }
    })
}])

.component('rpView', {
    templateUrl: '/rp-view/rp-view.template.html',
    controller: 'RpController',
    bindings: {
        rp: '<'
    }
})

.controller('RpController', ['$timeout', '$mdMedia', '$mdSidenav', '$mdDialog', 'pageAlerts', 'localStorageService', function($timeout, $mdMedia, $mdSidenav, $mdDialog, pageAlerts, localStorageService) {
    const $ctrl = this;
    
    $ctrl.MAX_MSG_CONTENT_LENGTH = 10000;

    $ctrl.$onInit = function() {
        document.title = $ctrl.rp.title + ' | RPNow';
    }

    $ctrl.toggleLeftDrawer = function() {
        $mdSidenav('left').toggle();
    };

    $ctrl.pressEnterToSend = true;
    $ctrl.notificationNoise = 1;
    $ctrl.showMessageDetails = true;

    $ctrl.allNoises = pageAlerts.allNoises;
    $ctrl.openNoiseSelector = function() {
        $timeout(function() {
            angular.element(document.getElementById('noiseSelector')).triggerHandler('click');
        })
    }

    $ctrl.showInviteDialog = function(evt) {
        return $mdDialog.show({
            controller: () => ({
                hide: $mdDialog.cancel,
                inviteUrl: location.href.split('#')[0]
            }),
            controllerAs: '$ctrl',
            templateUrl: '/rp-view/invite-dialog.template.html',
            parent: angular.element(document.body),
            targetEvent: evt,
            clickOutsideToClose: true
        });
    }
    $ctrl.showDownloadDialog = function(evt) {
        return $mdDialog.show({
            controller: ['saveRpService', function(saveRpService) {
                this.hide = $mdDialog.cancel;
                this.downloadOOC = true;
                this.downloadTxt = () => saveRpService.saveTxt($ctrl.rp, this.downloadOOC);
                this.downloadDocx = () => saveRpService.saveDocx($ctrl.rp, this.downloadOOC)
            }],
            controllerAs: '$ctrl',
            templateUrl: '/rp-view/download-dialog.template.html',
            parent: angular.element(document.body),
            targetEvent: evt,
            clickOutsideToClose: true
        });
    }
    $ctrl.showContactDialog = function(evt) {
        return $mdDialog.show({
            controller: () => ({ hide: $mdDialog.cancel }),
            controllerAs: '$ctrl',
            templateUrl: '/rp-view/contact-dialog.template.html',
            parent: angular.element(document.body),
            targetEvent: evt,
            clickOutsideToClose: true
        });
    }

    $ctrl.$onDestroy = function() {
        $ctrl.rp.exit();
    };
}])

.controller('RpControllerOld', ['$scope', '$rootScope', '$timeout', '$mdMedia', '$mdSidenav', '$mdDialog', '$mdToast', 'pageAlerts', 'localStorageService', 'saveRpService', function($scope, $rootScope, $timeout, $mdMedia, $mdSidenav, $mdDialog, $mdToast, pageAlerts, localStorageService, saveRpService) {

    // for SOME REASON this makes scrollglue work properly again
    //  my best guess? view changes are happening AFTER scrollglue tries
    //  to move the scrolling content, so it doesn't scroll the rest of
    //  the way
    // this is a dumb workaround but what EVER
    $scope.$watch('showMessageDetails', checkScrollHeight);
    $scope.$watch('rp.loading', checkScrollHeight);
    $scope.$watchCollection('rp.msgs', checkScrollHeight);
    function checkScrollHeight() { $timeout(() => {},100); }

    $scope.$watch('rp.msgs.length', function(newLength, oldLength) {
        if (!(newLength > oldLength)) return;

        var msg = $scope.rp.msgs[$scope.rp.msgs.length-1];
        var alertText;
        if(msg.type === 'chara') alertText = '* ' + chara(msg).name + ' says...';
        else if(msg.type === 'narrator') alertText = '* The narrator says...';
        else if(msg.type === 'ooc') alertText = '* OOC message...';
        else if(msg.type === 'image') alertText = '* Image posted...'
        pageAlerts.alert(alertText, $scope.notificationNoise);

        if ($scope.isStoryGlued) $scope.numMsgsToShow = RECENT_MSG_COUNT;
        else $scope.numMsgsToShow = Math.min($scope.numMsgsToShow+1, MAX_RECENT_MSG_COUNT);
    });

    $scope.color = function(voice) {
        // msg
        if (voice.content) voice = (voice.type === 'chara') ? voice.charaId : voice.type;
        // other
        if (voice === 'narrator') return $rootScope.nightMode? '#444444':'#ffffff'; 
        if (voice === 'ooc') return $rootScope.nightMode? '#303030':'#fafafa'; 
        if (voice >= 0) {
            if (!$scope.rp.charas) return '';
            voice = $scope.rp.charas[voice];
        }
        return voice.color;
    }

    $scope.$watch('msgBox.voice', function(newChara) {
        if (!(newChara >= 0)) return;
        if ($scope.msgBox.recentCharasString === undefined) return;
        if ($scope.rp.charas === undefined) return;

        var c = $scope.rp.charas[newChara];
        var rc = $scope.msgBox.recentCharas();
        // add to 'recent' list if it isn't already there
        if (rc.indexOf(c) === -1) rc.unshift(c);
        // or move it to the top
        else {
            rc.splice(rc.indexOf(c),1);
            rc.unshift(c);
        }
        if(rc.length > 5) {
            rc.splice(5, rc.length);
        }
        $scope.msgBox.recentCharasString = rc.map(c=>$scope.id(c)).join(',');
    })

    // recall these values if they have been saved in localStorage
    // otherwise use the defaults defined earlier in the controller
    if (localStorageService.isSupported) {
        ['downloadOOC', 'pressEnterToSend', 'notificationNoise', 'showMessageDetails', 'addCharaBox.color', 'charaListDocked']
        .forEach(function(option) {
            var initVal = option.split('.').reduce(function(scope,key){return scope[key];},$scope);
            localStorageService.bind($scope, option, initVal);
        });
        ['msgBox.content', 'msgBox.voice', 'msgBox.recentCharasString']
        .forEach(function(option) {
            var initVal = option.split('.').reduce(function(scope,key){return scope[key];},$scope);
            localStorageService.bind($scope, option, initVal, $scope.rp.rpCode+'.'+option);
        });
    }
}])

.directive('onPressEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keypress", function(evt) {
            if ((evt.keyCode || evt.which) !== 13) return;
            if (evt.shiftKey) return;
            var requireCtrlKey = scope.$eval(attrs.requireCtrlKey);
            if (requireCtrlKey && !evt.ctrlKey) return;

            evt.preventDefault();
            scope.$apply(function() {
                scope.$eval(attrs.onPressEnter, {'event': evt});
            });
        })
    }
})
