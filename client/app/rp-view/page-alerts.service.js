'use strict';

angular.module('rpnow')

.service('pageAlerts', function() {
    var pageAlerts = this;

    var alertText = null;
    var oldText = null;
    var flashesLeft = 0;
    var timer = null;

    var noiseDir = '/assets/sounds';
    this.allNoises = [
        {'name':'Off', 'audio':null},
        {'name':'Typewriter', 'audio': new Audio(noiseDir+'/typewriter.mp3')},
        {'name':'Page turn', 'audio': new Audio(noiseDir+'/pageturn.mp3')},
        {'name':'Chimes', 'audio': new Audio(noiseDir+'/chimes.mp3')},
        {'name':'Woosh', 'audio': new Audio(noiseDir+'/woosh.mp3')},
        {'name':'Frog block', 'audio': new Audio(noiseDir+'/frogblock.mp3')},
        {'name':'Classic alert', 'audio': new Audio(noiseDir+'/alert.mp3')},
    ];
    
    this.alert = function(text, noiseIdx) {
        if (document.visibilityState === 'visible') return;

        clearTimeout(timer);
        if (document.title === alertText) document.title = oldText;

        alertText = text;
        flashesLeft = 3;
        timerAction();

        var noise = this.allNoises[noiseIdx];
        if (noise.audio) noise.audio.play();
    };

    function timerAction() {
        if(document.title === alertText) {
            document.title = oldText;
        }
        else {
            oldText = document.title;
            document.title = alertText;

            if (flashesLeft <= 0) return;
            --flashesLeft;
        }
        timer = setTimeout(timerAction, 1000);
    }

    document.addEventListener('visibilitychange', function(evt) {
        if(document.visibilityState !== 'visible') return;

        if (document.title === alertText) document.title = oldText;
        clearTimeout(timer);
    })
})
