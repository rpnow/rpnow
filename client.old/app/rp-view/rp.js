'use strict';

angular.module('rpnow')

.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state({
        name: 'rp',
        url: '/rp/:rpCode',
        templateUrl: '/rp-view/rp.template.html',
        controller: 'RpController',
        meta: {
            title: 'Loading RP... | RPNow'
        }
    })
}])

.controller('RpController', ['$scope', '$timeout', '$mdMedia', '$mdSidenav', '$mdDialog', '$mdToast', 'pageAlerts', 'localStorageService', 'rpService', 'saveRpService', function($scope, $timeout, $mdMedia, $mdSidenav, $mdDialog, $mdToast, pageAlerts, localStorageService, rpService, saveRpService) {
    $scope.MAX_CHARA_NAME_LENGTH  = 30;
    $scope.MAX_MSG_CONTENT_LENGTH = 10000;

    var RECENT_MSG_COUNT = 100;
    var MAX_RECENT_MSG_COUNT = 200;

    $scope.url = location.href.split('#')[0];
    $scope.rp = rpService();

    $scope.$watch('rp.loadError', function(loadError) {
        if (loadError) document.title = 'RP Not Found | RPNow';
    });

    $scope.$watch('rp.title', function(rpTitle) {
        if (rpTitle) document.title = rpTitle + ' | RPNow';
    });

    $scope.isStoryGlued = true;
    // for SOME REASON this makes scrollglue work properly again
    //  my best guess? view changes are happening AFTER scrollglue tries
    //  to move the scrolling content, so it doesn't scroll the rest of
    //  the way
    // this is a dumb workaround but what EVER
    $scope.$watch('showMessageDetails', checkScrollHeight);
    $scope.$watch('rp.loading', checkScrollHeight);
    $scope.$watchCollection('rp.msgs', checkScrollHeight);
    function checkScrollHeight() { $timeout(() => {},100); }

    $scope.numMsgsToShow = RECENT_MSG_COUNT;
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
        if (voice === 'narrator') return $scope.nightMode? '#444444':'#ffffff'; 
        if (voice === 'ooc') return $scope.nightMode? '#303030':'#fafafa'; 
        if (voice >= 0) {
            if (!$scope.rp.charas) return '';
            voice = $scope.rp.charas[voice];
        }
        return voice.color;
    }

    $scope.msgBox = {
        content: '',
        voice: 'narrator',
        recentCharas: () => $scope.rp.charas ?
            $scope.msgBox.recentCharasString
                .split(',')
                .filter(x=>x>=0)
                .map(x=>$scope.rp.charas[+x]):
            [],
        recentCharasString: '', // stored in a string so it can be easily bound to localStorage
        isValid: function() {
            return $scope.msgBox.content.trim().length > 0;
        }
    };
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
    $scope.sendMessage = function() {
        var msg = {
            content: $scope.msgBox.content.trim(),
            type: (+$scope.msgBox.voice >= 0) ? 'chara' : $scope.msgBox.voice
        }
        // shortcut to send ooc messages; if not on the actual OOC character,
        //  you can send a message inside of (()) et all, as a shortcut to change
        //  that specific message to an OOC message
        if (msg.type !== 'ooc') {
            [  /^\({2,}\s*(.*?[^\s])\s*\)*$/g, // (( message text ))
                /^\{+\s*(.*?[^\s])\s*\}*$/g, // { message text }, {{ message text }}, ...
                /^\/\/\s*(.*[^\s])\s*$/g // //message text
            ].forEach(function(oocRegex) {
                var match = oocRegex.exec(msg.content);
                if (match) {
                    msg.content = match[1];
                    msg.type = 'ooc';
                }
            });
        }
        if (!msg.content) return;
        if (msg.type === 'chara') {
            msg.charaId = +$scope.msgBox.voice;
        }
        $scope.rp.addMessage(msg);
        $scope.msgBox.content = '';
    };

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

    $scope.imagePostBox = {
        url: '',
        sending: false,
        isValid: function() {
            var url = $scope.imagePostBox.url;
            var regexp = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi //https://github.com/angular/angular.js/blob/master/src/ngSanitize/filter/linky.js#L3
            return url.match(regexp);
        }
    };
    $scope.sendImage = function() {
        var url = $scope.imagePostBox.url;
        $scope.rp.addImage(url, function(err) {
            $scope.imagePostBox.sending = false;
            if (err) {
                var errMsg;
                if (err.code === 'URL_FAILED')
                    errMsg = `Couldn't reach the site at: ${url}`
                else if (err.code === 'BAD_CONTENT')
                    errMsg = `The content at "${url}" does not appear to be an image. Check the URL and try again.`;
                else
                    errMsg = `An unknown error occurred! Server says: "${err.code}"`

                $mdToast.show($mdToast.simple().textContent(errMsg));
                return;
            }
            $mdDialog.hide();
        });
        $scope.imagePostBox.url = '';
        $scope.imagePostBox.sending = true;
    }

    $scope.downloadOOC = true;
    $scope.downloadTxt = function() {
        saveRpService.saveTxt($scope.rp, $scope.downloadOOC);
    };
    $scope.downloadDocx = function() {
        saveRpService.saveDocx($scope.rp, $scope.downloadOOC);
    };

    $scope.beginEdit = function(msg) {
        msg.editing = true;
        msg.newContent = msg.content;
    };
    $scope.cancelEdit = function(msg) {
        msg.editing = false;
    };
    $scope.confirmEdit = function(msg) {
        var data = { id: id(msg), content: msg.newContent };
        $scope.rp.editMessage(data);
        msg.content = msg.newContent;
        msg.editing = false;
        msg.sending = true;
    };
    
    $scope.allNoises = pageAlerts.allNoises;
    $scope.openNoiseSelector = function() {
        $timeout(function() {
            angular.element(document.getElementById('noiseSelector')).triggerHandler('click');
        })
    }

    $scope.pressEnterToSend = true;
    $scope.notificationNoise = 1;
    $scope.showMessageDetails = true;
    $scope.nightMode = false;

    $scope.toggleLeftDrawer = function() {
        $mdSidenav('left').toggle();
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

    $scope.showDialog = function(id, evt) {
        return $mdDialog.show({
            contentElement: id,
            targetEvent: evt,
            clickOutsideToClose: true
        });
    }
    $scope.hideDialog = function() { $mdDialog.cancel(); };
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
    $scope.viewMobileToolbarMenu = function($mdOpenMenu, evt) { $mdOpenMenu(evt); };

    $scope.$watch(function() { return $mdMedia('gt-sm'); }, function(desktop) {
        $scope.isDesktopMode = desktop;
    });

    // detect if the user is primarily using touch or a mouse,
    //  guessing according to which the window notices first
    //  used to decide whether to show tooltips or not
    $scope.hasMouse = undefined;
    window.addEventListener('touchstart', detectEvent);
    window.addEventListener('mousemove', detectEvent);
    function detectEvent(evt) {
        window.removeEventListener('touchstart', detectEvent);
        window.removeEventListener('mousemove', detectEvent);
        $scope.hasMouse = (evt.type === 'mousemove');
    }

    // recall these values if they have been saved in localStorage
    // otherwise use the defaults defined earlier in the controller
    if (localStorageService.isSupported) {
        ['downloadOOC', 'pressEnterToSend', 'notificationNoise', 'showMessageDetails', 'nightMode', 'addCharaBox.color', 'charaListDocked']
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

.factory('rpService', ['$http', 'io', 'localStorageService', function($http, io, localStorageService) {
    return function(rpCode) { return new RP(rpCode); };

    function RP(rpCode) {
        var rp = this;
        rp.rpCode = rpCode || (location.href.split('#')[0]).split('/').pop();
        rp.loading = true;
        rp.loadError = null;

        var socket = io('/', { query: 'rpCode='+rp.rpCode });

        var challenge = null;
        var challegePromise = new Promise(function(resolve, reject) {
            if (localStorageService.isSupported && localStorageService.get('challenge.secret')) {
                resolve(challenge = {
                    secret: localStorageService.get('challenge.secret') || null,
                    hash: localStorageService.get('challenge.hash') || null
                });
            }
            else $http.get('/api/challenge.json').then(function(res) {
                resolve(challenge = res.data);
                localStorageService.set('challenge.secret', challenge.secret);
                localStorageService.set('challenge.hash', challenge.hash);
            });
        });

        socket.on('rp error', function(err) {
            rp.loading = false;
            rp.loadError = err.code;
        })

        socket.on('load rp', function(data) {
            rp.loading = false;
            for (var prop in data) {
                rp[prop] = data[prop];
            }
        });

        socket.on('add message', function(msg) {
            rp.msgs.push(msg);
        });
        socket.on('add character', function(chara) {
            rp.charas.push(chara);
        });
        socket.on('edit message', function(data) {
            rp.msgs.splice(data.id,1, data.msg);
        });

        rp.addMessage = function(msg, callback) {
            var placeholderMsg = JSON.parse(JSON.stringify(msg));
            placeholderMsg.sending = true;
            rp.msgs.push(placeholderMsg);

            challegePromise.then(() => {
                msg.challenge = challenge.hash;
                socket.emit('add message', msg, function(err, receivedMsg) {
                    if (err) return;
                    rp.msgs.splice(rp.msgs.indexOf(placeholderMsg),1);
                    rp.msgs.push(receivedMsg);
                    if (callback) callback();
                });
            });
        };
        rp.addChara = function(chara, callback) {
            socket.emit('add character', chara, function(err, receivedChara) {
                if (err) return;
                rp.charas.push(receivedChara);
                if (callback) callback();
            });
        };
        rp.addImage = function(url, callback) {
            socket.emit('add image', url, function(err, receivedMsg) {
                if (err) return callback(err);
                rp.msgs.push(receivedMsg);
                if (callback) callback();
            });
        };

        rp.editMessage = function(editInfo, callback) {
            rp.msgs[editInfo.id].sending = true;
            challegePromise.then(() => {
                editInfo.secret = challenge.secret;
                socket.emit('edit message', editInfo, function(err, receivedMsg) {
                    if (err) return;
                    rp.msgs.splice(editInfo.id,1, receivedMsg);
                    if (callback) callback();
                });
            });
        };

        rp.canEdit = function(msg) {
            return msg.challenge === challenge.hash;
        }

        rp.exit = function() {
            socket.close();
        };

    }
}])

.factory('saveRpService', ['$http', function($http) {
    function saveTxt(rp, includeOOC) {
        var out = rp.msgs;
        if (!includeOOC) out = out.filter(function(msg) {return msg.type!=='ooc'});
        out = out.map(function(msg) {
            if(msg.type === 'narrator') {
                return wordwrap(msg.content, 72);
            }
            else if(msg.type === 'ooc') {
                return wordwrap('(( OOC: '+msg.content+' ))', 72);
            }
            else if(msg.type === 'chara') {
                return rp.charas[msg.charaId].name.toUpperCase()+':\r\n'
                    + wordwrap(msg.content, 70, '  ');
            }
            else if(msg.type === 'image') {
                return '--- IMAGE ---\r\n' + msg.url + '\r\n-------------';
            }
            else {
                throw new Error('Unexpected message type: '+msg.type);
            }
        });
        out.unshift(rp.title+'\r\n'+(rp.desc||'')+'\r\n----------');
        var str = out.join('\r\n\r\n');
        var blob = new Blob([str], {type: "text/plain;charset=utf-8"});
        saveAs(blob, rp.title + ".txt");
    }
    function wordwrap(str, width, indent) {
        return str.split('\n')
            .map(function(paragraph) { return (paragraph
                .match(/\S+\s*/g) || [])
                .reduce(function(lines,word) {
                        if ((lines[lines.length-1]+word).trimRight().length>width)
                            word.match(new RegExp("\\S{1,"+width+"}\\s*",'g'))
                                    .forEach(function(wordPiece){ lines.push(wordPiece); })
                        else
                            lines[lines.length-1] += word;
                        return lines;
                }, [''])
                .map(function(str) { return (indent||'')+str.trimRight(); })
            })
            .reduce(function(lines, paragraph) {
                paragraph.forEach(function(line) { lines.push(line); });
                return lines;
            }, [])
            .join('\r\n');
    }

    var docxTemplateRequest;

    function saveDocx(rp, includeOOC) {
        var rpData = JSON.parse(JSON.stringify(rp));
        rpData.hasDesc = !!rpData.desc;
        if (!includeOOC) rpData.msgs = rpData.msgs.filter(function(msg) {return msg.type!=='ooc'});
        rpData.msgs.forEach(function(msg) {
            msg.isNarrator = (msg.type === 'narrator');
            msg.isOOC = (msg.type === 'ooc');
            msg.isChara = (msg.type === 'chara');
            msg.isImage = (msg.type === 'image');
            if (msg.isChara) msg.name = rpData.charas[msg.charaId].name.toUpperCase();
        });
        if (!docxTemplateRequest) {
            docxTemplateRequest = $http.get('/assets/template.docx', {responseType: 'arraybuffer'});
        }
        docxTemplateRequest.then(function(res) {
            var doc = new Docxtemplater().loadZip(new JSZip(res.data));
            doc.setData(rpData);
            doc.render();
            var blob = doc.getZip().generate({
                type: 'blob',
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            });
            saveAs(blob, rp.title + ".docx");
        })
    }

    return {
        saveTxt: saveTxt,
        saveDocx: saveDocx
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

// https://stackoverflow.com/questions/14389049/
.factory('io', ['$rootScope', function($rootScope) {
    return function() {
        var socket = io.apply(io, arguments);
        return {
            emit: function(type, data, callback) {
                socket.emit(type, data, function() {
                    if (callback) callback.apply(socket, arguments);
                    $rootScope.$apply();
                })
            },
            on: function(type, callback) {
                socket.on(type, function() {
                    callback.apply(socket, arguments);
                    $rootScope.$apply();
                })
            },
            close: function() {
                socket.close();
            }
        };
    }
}])

// https://stackoverflow.com/questions/18006334/updating-time-ago-values-in-angularjs-and-momentjs
.factory('timestampUpdateService', ['$rootScope', function($rootScope) {
    function timeAgoTick() {
        $rootScope.$broadcast('e:timeAgo');
    }
    setInterval(function() {
        timeAgoTick();
        $rootScope.$apply();
    }, 1000*60);
    return {
        timeAgoTick: timeAgoTick,
        onTimeAgo: function($scope, handler) {
            $scope.$on('e:timeAgo', handler);
        }
    };
}])
.config(function() {
    moment.defineLocale('en-short', {
        parentLocale: 'en',
        relativeTime: {
            past: function(val) {
                if (val === 'now') return 'now';
                return `${val} ago`;
            },
            s: 'now',
            m: '1 m', mm: '%d m',
            h: '1 h', hh: '%d h',
            d: '1 d', dd: '%d d',
            M: '1 Mo', MM: '%d Mo',
            y: '1 y', yy: '%d y'
        }
    });
})
.directive('momentAgoShort', ['timestampUpdateService', function(timestampUpdateService) {
    return {
        template: '<span>{{momentAgoShort}}</span>',
        replace: true,
        link: function(scope, el, attrs) {
            function updateTime() {
                var timestamp = scope.$eval(attrs.momentAgoShort);
                scope.momentAgoShort = moment(timestamp*1000).locale('en-short').fromNow();
            }
            timestampUpdateService.onTimeAgo(scope, updateTime);
            updateTime();
        }
    }
}])
.filter('momentAgo', function() {
    return function(timestamp) {
        return moment(timestamp*1000).calendar();
    }
})

.filter('msgContent', ['$sce', '$filter', function($sce, $filter) {
    return function(str, color) {
        // escape characters
        var escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        str = str.replace(/[&<>"']/g, function(m) { return escapeMap[m]; });
        // urls
        // http://stackoverflow.com/a/3890175
        str = str.replace(
            /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim,
            '<a href="$1" class="link" target="_blank">$1</a>'
        );
        // actions
        if(color) {
            str = str.replace(/\*([^\r\n\*_]+)\*/g, '<span class="action" style="background-color:' + color + ';' + 'color:' + $filter('contrastColor')(color) + '">*$1*</span>');
        }
        // bold
        str = str.replace(/(^|\s|(?:&quot;))__([^\r\n_]+)__([\s,\.\?!]|(?:&quot;)|$)/g, '$1<b>$2</b>$3');
        // italix
        str = str.replace(/(^|\s|(?:&quot;))_([^\r\n_]+)_([\s,\.\?!]|(?:&quot;)|$)/g, '$1<i>$2</i>$3');
        str = str.replace(/(^|\s|(?:&quot;))\/([^\r\n\/>]+)\/([\s,\.\?!]|(?:&quot;)|$)/g, '$1<i>$2</i>$3');
        // both!
        str = str.replace(/(^|\s|(?:&quot;))___([^\r\n_]+)___([\s,\.\?!]|(?:&quot;)|$)/g, '$1<b><i>$2</i></b>$3');
        // strikethrough
        str = str.replace(/~~([^\r\n<>]+?)~~/g, '<del>$1</del>');
        // line breaks
        // http://stackoverflow.com/questions/2919337/jquery-convert-line-breaks-to-br-nl2br-equivalent
        str = str.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
        // mdash
        str = str.replace(/--/g, '&mdash;');

        // done.
        return $sce.trustAsHtml(str);
    }
}])

.factory('yiqBrightness', function() {
    // returns brightness from 0 to 255
    return function(color) {
        // YIQ algorithm modified from:
        //  http://24ways.org/2010/calculating-color-contrast/
        let [r,g,b] = color.match(/[0-9a-f]{2}/g).map(hex => parseInt(hex,16));
        return 0.299*r + 0.597*g + 0.114*b;
    }
})

.filter('contrastColor', ['yiqBrightness', function(yiqBrightness) {
    return function(color, opacity=1) {
        if (!color) return false;
        let brightness = yiqBrightness(color);
        if (brightness >= 128) return `rgba(0,0,0, ${opacity})`;
        else return `rgba(255,255,255, ${opacity})`;
    };
}])

.filter('needsContrastColor', ['yiqBrightness', function(yiqBrightness) {
    return function(color) {
        if (!color) return false;
        let brightness = yiqBrightness(color);
        return brightness < 60 || brightness > 200;
    };
}])

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
