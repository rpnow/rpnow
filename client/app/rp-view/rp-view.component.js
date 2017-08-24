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

.controller('RpController', ['$timeout', '$mdMedia', '$mdSidenav', '$mdDialog', 'pageAlerts', 'globalSetting', function($timeout, $mdMedia, $mdSidenav, $mdDialog, pageAlerts, globalSetting) {
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
    globalSetting($ctrl, 'pressEnterToSend');
    globalSetting($ctrl, 'notificationNoise');
    globalSetting($ctrl, 'showMessageDetails');

    $ctrl.allNoises = pageAlerts.allNoises;
    $ctrl.openNoiseSelector = function() {
        $timeout(function() {
            angular.element(document.getElementById('noiseSelector')).triggerHandler('click');
        })
    }

    $ctrl.showDownloadDialog = function(evt) {
        return $mdDialog.show({
            controller: ['saveRpService', 'globalSetting', function(saveRpService, globalSetting) {
                this.hide = $mdDialog.cancel;
                this.downloadOOC = true;
                globalSetting(this, 'downloadOOC');
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
