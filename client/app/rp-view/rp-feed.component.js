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
    controller: 'RpFeedController',
    bindings: {
        rp: '<',
        pressEnterToSend: '<',
        showDetails: '<'
    }
})

.controller('RpFeedController', ['$mdDialog', function($mdDialog) {
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
        isValid: () => $ctrl.msgBox.content.trim().length > 0
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
    }
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
