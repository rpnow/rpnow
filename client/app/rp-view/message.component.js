'use strict';

angular.module('rpnow')

.component('rpMessage', {
    templateUrl: '/rp-view/message.template.html',
    controller: 'RpMessageController',
    bindings: {
        msg: '<',
        showDetails: '<'
    }
})

.controller('RpMessageController', [function() {
    this.beginEdit = function() {
        this.editing = true;
        this.newContent = this.msg.content;
    }

    this.cancelEdit = function() {
        this.editing = false;
    }

    this.confirmEdit = function() {
        this.editing = false;
        this.msg.edit(this.newContent);
    }
}])
