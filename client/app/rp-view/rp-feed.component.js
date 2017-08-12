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
    controller: 'RpFeedController',
    bindings: {
        rp: '<',
        pressEnterToSend: '<',
        showDetails: '<'
    }
})

.controller('RpFeedController', ['$timeout', '$mdDialog', '$mdMedia', '$mdSidenav', '$rootScope', function($timeout, $mdDialog, $mdMedia, $mdSidenav, $rootScope) {
    const $ctrl = this;

    var RECENT_MSG_COUNT = 100;
    var MAX_RECENT_MSG_COUNT = 200;

    $ctrl.$onInit = function() {
        $ctrl.isStoryGlued = true;
        $ctrl.numMsgsToShow = RECENT_MSG_COUNT;
    };

    $ctrl.msgBox = {
        content: '',
        voice: 'narrator',
        isValid: () => ($ctrl.msgBox.content.trim().length > 0),
        color: () => {
            if ($ctrl.msgBox.voice === 'narrator') return $rootScope.nightMode? '#444444':'#ffffff'; 
            if ($ctrl.msgBox.voice === 'ooc') return $rootScope.nightMode? '#303030':'#fafafa'; 
            return $ctrl.rp.charas[$ctrl.msgBox.voice].color;
        }
    };

    function applyOocShortcuts(msg) {
        // shortcut to send ooc messages; if not on the actual OOC character,
        //  you can send a message inside of (()) et all, as a shortcut to change
        //  that specific message to an OOC message
        let oocRegexList = [
            /^\({2,}\s*(.*?[^\s])\s*\)*$/g, // (( message text ))
            /^\{+\s*(.*?[^\s])\s*\}*$/g, // { message text }, {{ message text }}, ...
            /^\/\/\s*(.*[^\s])\s*$/g // //message text
        ];
        oocRegexList.forEach(function(oocRegex) {
            var match = oocRegex.exec(msg.content);
            if (match) {
                msg.content = match[1];
                msg.type = 'ooc';
            }
        });
    }

    $ctrl.sendMessage = function() {
        var msg = {
            content: $ctrl.msgBox.content.trim(),
            type: (+$ctrl.msgBox.voice >= 0) ? 'chara' : $ctrl.msgBox.voice
        }
        if (msg.type !== 'ooc') applyOocShortcuts(msg);
        if (!msg.content) return;
        if (msg.type === 'chara') {
            msg.charaId = +$ctrl.msgBox.voice;
        }
        $ctrl.rp.addMessage(msg);
        $ctrl.msgBox.content = '';
    };

    $ctrl.showImageDialog = function(evt) {
        return $mdDialog.show({
            controller: 'ImageDialogController',
            controllerAs: '$ctrl',
            locals: { rp: $ctrl.rp },
            bindToController: true,
            templateUrl: '/rp-view/image-dialog.template.html',
            parent: angular.element(document.body),
            targetEvent: evt,
            clickOutsideToClose: true
        });
    };

    $ctrl.recentCharasString = '';
    $ctrl.recentCharas = function() {
        return $ctrl.recentCharasString
            .split(',')
            .filter(x=>x>=0)
            .map(x=>$ctrl.rp.charas[+x]);
    };

    $ctrl.hasManyCharacters = () => $ctrl.rp.charas.length > 10;

    $ctrl.setVoice = function(voice) {
        $ctrl.msgBox.voice = voice;
        $mdSidenav('right').close();
    };

    // all this complicated logic ends up creating intuitive behavior
    // for the right sidedrawer when resizing window, and opening/closing
    // sidedrawer within different window sizes.
    $ctrl.charaListDocked = false;
    $ctrl.toggleRightDrawer = function() {
        // change behavior based on if we're on a large screen or not
        if ($mdMedia('gt-md')) {
            if ($ctrl.charaListDocked) {
                $mdSidenav('right').close();
                $timeout(() => $ctrl.charaListDocked = false, 100);
            }         
            else {
                $ctrl.charaListDocked = true;
            }
        }
        else {
            $mdSidenav('right').toggle();
        }
    }
    $ctrl.isRightDrawerLockedOpen = () => $ctrl.charaListDocked || $mdSidenav('right').isOpen();
    $ctrl.isRightDrawerVisible = () => $mdMedia('gt-md') ? $ctrl.isRightDrawerLockedOpen() : $mdSidenav('right').isOpen()

    $ctrl.showCharaDialog = function(evt) {
        return $mdDialog.show({
            controller: 'CharaDialogController',
            controllerAs: '$ctrl',
            locals: { rp: $ctrl.rp },
            bindToController: true,
            templateUrl: '/rp-view/chara-dialog.template.html',
            parent: angular.element(document.body),
            targetEvent: evt,
            clickOutsideToClose: true,
            fullscreen: $mdMedia('xs')
        }).then(function() { 
            $timeout(() => $mdSidenav('right').close(), 100);
            $ctrl.msgBox.voice = $ctrl.rp.charas.length-1
        })
    };

}])

.controller('ImageDialogController', ['$mdDialog', '$mdToast', function($mdDialog, $mdToast) {
    this.hide = () => $mdDialog.cancel();
    this.url = '';
    this.sending = false;

    //https://github.com/angular/angular.js/blob/master/src/ngSanitize/filter/linky.js#L3
    var urlRegexp = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi
    this.isValid = () => this.url.match(urlRegexp);
    
    this.send = () => {
        this.rp.addImage(this.url, (err) => {
            this.sending = false;
            if (err) {
                var errMsg;
                if (err.code === 'URL_FAILED')
                    errMsg = `Couldn't reach the site at: ${this.url}`
                else if (err.code === 'BAD_CONTENT')
                    errMsg = `The content at "${this.url}" does not appear to be an image. Check the URL and try again.`;
                else
                    errMsg = `An unknown error occurred! Server says: "${err.code}"`

                $mdToast.show($mdToast.simple().textContent(errMsg));
                return;
            }
            $mdDialog.hide();
        });
        this.sending = true;
    }
}])

.controller('CharaDialogController', ['$mdDialog', function($mdDialog) {
    this.MAX_CHARA_NAME_LENGTH  = 30;

    this.hide = () => $mdDialog.cancel();
    this.name = '';
    this.color = '#ff0000';
    this.sending = false;

    let colorRegex = /^#[0-9a-f]{6}$/g;
    this.isValid = () => this.name.trim().length > 0 && colorRegex.test(this.color);

    this.send = () => {
        let data = { name: this.name, color: this.color };
        this.rp.addChara(data, () => $mdDialog.hide() );
        this.sending = true;
    }
}])
