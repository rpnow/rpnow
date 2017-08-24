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
        showDetails: '<',
        notificationNoise: '<'
    }
})

.controller('RpFeedController', ['$timeout', '$mdDialog', '$mdMedia', '$mdSidenav', '$rootScope', 'globalSetting', 'roomSetting', 'pageAlerts', function($timeout, $mdDialog, $mdMedia, $mdSidenav, $rootScope, globalSetting, roomSetting, pageAlerts) {
    const $ctrl = this;

    var RECENT_MSG_COUNT = 100;
    var MAX_RECENT_MSG_COUNT = 200;

    $ctrl.$onInit = function() {
        $ctrl.isStoryGlued = true;
        $ctrl.numMsgsToShow = RECENT_MSG_COUNT;
        roomSetting($ctrl.rp.rpCode).setting($ctrl.msgBox, 'content', 'msgBox.conent');
        roomSetting($ctrl.rp.rpCode).setting($ctrl.msgBox, 'voice', 'msgBox.voice');
        roomSetting($ctrl.rp.rpCode).setting($ctrl, 'recentCharasString');
        $ctrl.rp.onNewMessage = $ctrl.onNewMessage;
        $ctrl.inviteUrl = location.href.split('#')[0];
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
        if (!$ctrl.recentCharasString) return [];
        return $ctrl.recentCharasString
            .split(',')
            .filter(x=>x>=0)
            .map(x=>$ctrl.rp.charas[+x]);
    };
    $ctrl.updateRecentCharas = function() {
        var charaId = $ctrl.msgBox.voice;
        if (!(charaId >= 0)) return;

        var c = $ctrl.rp.charas[charaId];
        var rc = $ctrl.recentCharas();
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
        $ctrl.recentCharasString = rc.map(c=>c.id).join(',');
    };

    $ctrl.hasManyCharacters = () => $ctrl.rp.charas.length > 10;

    $ctrl.setVoice = function(voice) {
        $ctrl.msgBox.voice = voice;
        $mdSidenav('right').close();
        if (voice >= 0) $ctrl.updateRecentCharas();
    };

    // all this complicated logic ends up creating intuitive behavior
    // for the right sidedrawer when resizing window, and opening/closing
    // sidedrawer within different window sizes.
    $ctrl.charaListDocked = false;
    globalSetting($ctrl, 'charaListDocked');

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
            locals: {
                rp: $ctrl.rp,
                onComplete: () => $timeout(() => $mdSidenav('right').close(), 100) 
            },
            bindToController: true,
            templateUrl: '/rp-view/chara-dialog.template.html',
            parent: angular.element(document.body),
            targetEvent: evt,
            clickOutsideToClose: true,
            fullscreen: $mdMedia('xs')
        }).then(function() { 
            $ctrl.msgBox.voice = $ctrl.rp.charas.length-1;
            $ctrl.updateRecentCharas();
        })
    };

    $ctrl.onNewMessage = function(msg) {
        var alertText;
        if(msg.type === 'chara') alertText = '* ' + chara(msg).name + ' says...';
        else if(msg.type === 'narrator') alertText = '* The narrator says...';
        else if(msg.type === 'ooc') alertText = '* OOC message...';
        else if(msg.type === 'image') alertText = '* Image posted...'
        pageAlerts.alert(alertText, $ctrl.notificationNoise);

        if ($ctrl.isStoryGlued) $ctrl.numMsgsToShow = RECENT_MSG_COUNT;
        else $ctrl.numMsgsToShow = Math.min($ctrl.numMsgsToShow+1, MAX_RECENT_MSG_COUNT);
    };

    $ctrl.$onDestroy = function() {
        $ctrl.rp.onNewMessage = null;
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

.controller('CharaDialogController', ['$mdDialog', 'globalSetting', function($mdDialog, globalSetting) {
    this.MAX_CHARA_NAME_LENGTH  = 30;

    this.hide = () => $mdDialog.cancel();
    this.name = '';
    this.color = '#ff0000';
    this.sending = false;

    globalSetting(this, 'color', 'addCharaBox.color');

    this.isValid = () => this.name.trim().length > 0 && /^#[0-9a-f]{6}$/g.test(this.color);

    this.send = () => {
        let data = { name: this.name, color: this.color };
        this.rp.addChara(data, () => {
            if (this.onComplete) this.onComplete();
            $mdDialog.hide()
        });
        this.sending = true;
    }
}])
