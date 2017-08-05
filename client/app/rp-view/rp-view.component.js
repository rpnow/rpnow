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
    
    $ctrl.MAX_CHARA_NAME_LENGTH  = 30;
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
                hide: $ctrl.hideDialog,
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
                this.hide = $ctrl.hideDialog;
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
            controller: () => ({ hide: $ctrl.hideDialog }),
            controllerAs: '$ctrl',
            templateUrl: '/rp-view/contact-dialog.template.html',
            parent: angular.element(document.body),
            targetEvent: evt,
            clickOutsideToClose: true
        });
    }

    $ctrl.hideDialog = function() { $mdDialog.cancel(); };
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

    var id = $scope.id = function(item) {
        var index;
        if ((index = $scope.rp.charas && $scope.rp.charas.indexOf(item)) >= 0) return index;
        if ((index = $scope.rp.msgs && $scope.rp.msgs.indexOf(item)) >= 0) return index;
        return null;
    };
    var chara = $scope.chara = function(x) {
        if (!$scope.rp.charas) return null;
        // voice
        if (x >= 0) return $scope.rp.charas[x];
        // msg
        if (x.type === 'chara') return $scope.rp.charas[x.charaId];
        // fail
        return null;
    };
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

    // TODO: move to character menu area
    $scope.msgBox = {
        recentCharas: function() {
            return $ctrl.msgBox.recentCharasString
                .split(',')
                .filter(x=>x>=0)
                .map(x=>$ctrl.rp.charas[+x]);
        },
        recentCharasString: '', // stored in a string so it can be easily bound to localStorage
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

    $scope.addCharaBox = {
        name: '',
        color: '#ff0000',
        sending: false,
        isValid: function() {
            return $scope.addCharaBox.name.trim().length > 0
                && /^#[0-9a-f]{6}$/g.test($scope.addCharaBox.color);
        }
    };
    $scope.sendChara = function() {
        $scope.rp.addChara({
            name: $scope.addCharaBox.name,
            color: $scope.addCharaBox.color
        }, function() {
            $timeout(function() { $mdSidenav('right').close(); },100);
            $mdDialog.hide();
            $scope.msgBox.voice = $scope.rp.charas.length-1
        });
        $scope.addCharaBox.sending = true;
        $scope.addCharaBox.name = '';
    };

    // all this complicated logic ends up creating intuitive behavior
    // for the right sidedrawer when resizing window, and opening/closing
    // sidedrawer within different window sizes.
    $scope.charaListDocked = false;
    $scope.toggleRightDrawer = function() {
        // if clicked from select menu, set it back to old chara
        $timeout(function(x){$scope.msgBox.voice=x;},0,true,$scope.msgBox.voice);

        // change behavior based on if we're on a large screen or not
        if ($mdMedia('gt-md')) {
            if ($scope.charaListDocked) {
                $mdSidenav('right').close();
                $timeout(function() { $scope.charaListDocked = false; },100);
            }         
            else {
                $scope.charaListDocked = true;
            }
        }
        else {
            $mdSidenav('right').toggle();
        }
    }
    $scope.setVoice = function(voice) {
        $scope.msgBox.voice = voice;
        $mdSidenav('right').close();
    }
    $scope.$watch(function() {
        return $scope.charaListDocked || $mdSidenav('right').isOpen();
    }, function(isRightDrawerLockedOpen) {
        $scope.isRightDrawerLockedOpen = isRightDrawerLockedOpen;
    });
    $scope.$watch(function() {
        return $mdMedia('gt-md') ? $scope.isRightDrawerLockedOpen : $mdSidenav('right').isOpen()
    }, function(isRightDrawerVisible) {
        $scope.isRightDrawerVisible = isRightDrawerVisible;
    })

    $scope.hasManyCharacters = function() {
        return $scope.rp.charas && $scope.rp.charas.length > 10;
    };

    $scope.showCharacterDialog = function(evt) {
        $timeout(function(x){$scope.msgBox.voice=x;},0,true,$scope.msgBox.voice);
        $mdDialog.show({
            contentElement: '#characterCreatorDialog',
            targetEvent: evt,
            clickOutsideToClose: true,
            fullscreen: $mdMedia('xs')
        }).then(function() { 
            $scope.addCharaBox.sending = false;
        })
    }

    $scope.$watch(function() { return $mdMedia('gt-sm'); }, function(desktop) {
        $scope.isDesktopMode = desktop;
    });

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

    $scope.$on('$destroy', function() {
        $scope.rp.exit();
    });
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
