angular.module('rpnow', ['ngRoute', 'ngMaterial', 'angularCSS', 'luegg.directives', 'mp.colorPicker', 'LocalStorageModule'])

.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
    $locationProvider.html5Mode(true);

    $routeProvider
        .when('/', {
            title: 'RPNow',
            templateUrl: '/app/home.template.html',
            controller: 'NewRpController'
        })
        .when('/rp/:rpCode', {
            title: 'Loading RP... | RPNow',
            templateUrl: '/app/rp.template.html',
            controller: 'RpController',
            css: [
                '/app/rp.template.css',
                '/app/message.css',
            ]
        })
        .when('/terms', {
            title: 'Terms of Use | RPNow',
            templateUrl: '/app/terms.template.html'
        })
        .when('/about', {
            title: 'About | RPNow',
            templateUrl: '/app/about.template.html'
        })
        .otherwise({
            title: 'Not Found | RPNow',
            templateUrl: '/app/404.template.html',
            controller: ['$scope', '$location', function($scope, $location) {
                $scope.url = $location.url();
            }]
        });
}])

.config(['$mdThemingProvider', function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('grey', {
            'default': '50'
        })
        .accentPalette('deep-purple');
    $mdThemingProvider.theme('dark')
        .primaryPalette('grey', {
            'default': '800'
        })
        .accentPalette('amber')
        .dark();
    $mdThemingProvider.alwaysWatchTheme(true);
}])

.config(['localStorageServiceProvider', function(localStorageServiceProvider) {
    localStorageServiceProvider
        .setPrefix('rpnow')
        .setDefaultToCookie(false)
}])

.run(['$rootScope', '$route', function($rootScope, $route) {
    // https://stackoverflow.com/questions/26308020/how-to-change-page-title-in-angular-using-routeprovider
    $rootScope.$on('$routeChangeSuccess', function() {
        document.title = $route.current.title;
    });
}])

.controller('NewRpController', ['$scope', '$timeout', '$location', '$mdMedia', 'RPRandom', 'socket', function($scope, $timeout, $location, $mdMedia, RPRandom, socket) {
    var spinTimer = null;
    function tick(millis) {
        RPRandom.roll('title', 25).then(function(title) {
            $scope.$apply(function() {
                $scope.title = title;
            });
            if (millis < 200.0) spinTimer = $timeout(tick, millis, true, millis * 1.15);
        })
    }
    $scope.spinTitle = function() {
        if (spinTimer) $timeout.cancel(spinTimer);
        tick(10.0);
    }

    $scope.submit = function() {
        $scope.submitted = true;
        socket.emit('create rp', {title: $scope.title, desc: $scope.desc}, function(err, data) {
            $scope.rpCode = data;
            $location.url('/rp/'+$scope.rpCode);
        });
    };

    $scope.$watch(function() { return $mdMedia('xs'); }, function(result) {
        $scope.isXs = result;
    });
}])

.controller('RpController', ['$scope', '$timeout', '$mdMedia', '$mdSidenav', '$mdDialog', 'pageAlerts', 'localStorageService', 'rpService', 'saveRpService', function($scope, $timeout, $mdMedia, $mdSidenav, $mdDialog, pageAlerts, localStorageService, rpService, saveRpService) {
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
        if (rpTitle) document.title = rpTitle;
    });
    
    $scope.isStoryGlued = true;
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

    $scope.id = function(item) {
        var index;
        if ((index = $scope.rp.charas.indexOf(item)) >= 0) return index;
        if ((index = $scope.rp.msgs.indexOf(item)) >= 0) return index;
        return null;
    };
    var chara = $scope.chara = function(msg) {
        return msg.type === 'chara' ? $scope.rp.charas[msg.charaId] : null;
    };
    $scope.color = function(voice) {
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
        recentVoices: function() { return $scope.msgBox.recentVoicesString? $scope.msgBox.recentVoicesString.split(',').map(function(x) { return (+x >= 0)? +x: x;}): undefined; },
        recentVoicesString: 'narrator,ooc', // stored in a string so it can be easily bound to localStorage
        isValid: function() {
            return $scope.msgBox.content.trim().length > 0;
        }
    };
    $scope.$watch('msgBox.voice', function(newVoice) {
        if (typeof newVoice === 'string' && newVoice.startsWith('_')) return;

        var rv = $scope.msgBox.recentVoices();
        if (!rv) return;
        // add to 'recent' list if it isn't already there
        if (rv.indexOf(newVoice) === -1) rv.unshift(newVoice);
        // or move it to the top
        else {
            rv.splice(rv.indexOf(newVoice),1);
            rv.unshift(newVoice);
        }
        if(rv.length > 5) {
            rv.splice(5, rv.length);
        }
        $scope.msgBox.recentVoicesString = rv.join(',');
    })
    $scope.sendMessage = function() {
        var msg = {
            content: $scope.msgBox.content.trim(),
            type: (+$scope.msgBox.voice >= 0) ? 'chara' : $scope.msgBox.voice
        }
        if (msg.type !== 'ooc') {
            [  /^\({2,}\s*(.*?[^\s])\s*\)*$/g, // (( stuff ))
                /^\{+\s*(.*?[^\s])\s*\}*$/g, // { stuff }, {{ stuff }}, ...
                /^\/\/\s*(.*[^\s])\s*$/g // //stuff
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
            $mdDialog.hide($scope.rp.charas.length-1);
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
        $scope.rp.addImage($scope.imagePostBox.url, function() {
            $scope.imagePostBox.sending = false;
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
    $scope.$watch(function() { return $scope.charaListDocked || $mdSidenav('right').isOpen(); }, function(isRightDrawerLockedOpen) {
        $scope.isRightDrawerLockedOpen = isRightDrawerLockedOpen;
    });
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
        $scope.showDialog('#characterCreatorDialog', evt)
        .then(function(charaId) { 
            $scope.addCharaBox.sending = false;
            $scope.msgBox.voice = charaId
        })
    }
    $scope.viewMobileToolbarMenu = function($mdOpenMenu, evt) { $mdOpenMenu(evt); };

    $scope.$watch(function() { return $mdMedia('gt-sm'); }, function(desktop) {
        $scope.isDesktopMode = desktop;
    });

    // recall these values if they have been saved in localStorage
    // otherwise use the defaults defined earlier in the controller
    if (localStorageService.isSupported) {
        ['downloadOOC', 'pressEnterToSend', 'notificationNoise', 'showMessageDetails', 'nightMode', 'addCharaBox.color', 'charaListDocked']
        .forEach(function(option) {
            var initVal = option.split('.').reduce(function(scope,key){return scope[key];},$scope);
            localStorageService.bind($scope, option, initVal);
        });
        ['msgBox.content', 'msgBox.voice', 'msgBox.recentVoicesString']
        .forEach(function(option) {
            var initVal = option.split('.').reduce(function(scope,key){return scope[key];},$scope);
            localStorageService.bind($scope, option, initVal, $scope.rp.rpCode+'.'+option);
        });
    }

    $scope.$on('$destroy', function() {
        $scope.rp.exit();
    });
}])

.factory('rpService', ['socket', function(socket) {
    return function(rpCode) { return new RP(rpCode); };

    function RP(rpCode) {
        var rp = this;
        rp.rpCode = rpCode || (location.href.split('#')[0]).split('/').pop();
        rp.loading = true;
        rp.loadError = null;

        var msgSendQueue = [];

        function enterRp() {
            socket.emit('enter rp', rp.rpCode, function(err, data) {
                rp.loading = false;
                if (err) {
                    rp.loadError = err.code;
                    return;
                }
                ['title', 'desc', 'msgs', 'charas', 'ipid', 'timestamp']
                    .forEach(function(prop) {
                        if(data[prop] !== undefined) rp[prop] = JSON.parse(JSON.stringify(data[prop]));
                    });
                
                msgSendQueue.forEach(msg => rp.addMessage(msg))
            });
        }
        socket.on('reconnect', enterRp);
        enterRp();

        rp.exit = function() {
            socket.emit('exit rp');
        }

        socket.on('add message', function(msg) {
            rp.msgs.push(msg);
        });
        socket.on('add character', function(chara) {
            rp.charas.push(chara);
        });

        rp.addMessage = function(msg, callback) {
            var placeholderMsg = JSON.parse(JSON.stringify(msg));
            placeholderMsg.sending = true;
            rp.msgs.push(placeholderMsg);
            msgSendQueue.push(msg);

            socket.emit('add message', msg, function(err, receivedMsg) {
                if (err) return;
                rp.msgs.splice(rp.msgs.indexOf(placeholderMsg),1);
                msgSendQueue.splice(msgSendQueue.indexOf(msg));
                rp.msgs.push(receivedMsg);
                if (callback) callback();
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
                if (err) return;
                rp.msgs.push(receivedMsg);
                if (callback) callback();
            });
        }

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
            msg.isNarrator = msg.type === 'narrator';
            msg.isOOC = msg.type === 'ooc';
            msg.isChara = msg.type === 'chara';
            msg.isImage = msg.type === 'image';
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

.directive('autoResize', function() {
    return function(scope, element, attrs) {
        var maxHeight = null;
        element.css('resize','none');

        element.bind('input', resize);
        window.onresize = function() {
            maxHeight = null;
            resize();
        }
        function resize() {
            if (attrs.maxHeight && !maxHeight) {
                element.css('overflow','hidden');
                element.css('height', attrs.maxHeight);
                maxHeight = element[0].clientHeight;
            }
            element.css('height','');
            var newHeight = element[0].scrollHeight;
            if (newHeight > maxHeight) newHeight = maxHeight;
            element.css('overflow', newHeight === maxHeight? 'auto':'hidden')
            element.css('height', newHeight + 'px');
        }
    }
})

.factory('RPRandom', ['$http', function($http) {
    var types = {
        'title': ':Title'
    };
    var dictPromises = {
        'title': $http.get('/assets/titles.json')
    };

    function resolve(str, dict) {
        do {
            var lastStr = str;
            str = str.replace(/:([a-zA-Z]+):?/, dictRep);
        } while(str !== lastStr);
        function dictRep(match, inner) {
            var x = dict[inner];
            if(x) return x[Math.floor(Math.random()*x.length)];
            else return inner.toUpperCase() + '?';
        }
        return str.trim().replace(/\s+/g, ' ');
    }
    return {
        roll: function(template, maxLength) {
            return new Promise(function(success, fail) {
                dictPromises[template].then(function(res) {
                    while (true) {
                        var str = resolve(types[template], res.data);
                        if (maxLength && str.length > maxLength) continue;
                        return success(str);
                    }
                })
            })
        }
    }
}])

// https://stackoverflow.com/questions/14389049/
.factory('socket', ['$rootScope', function($rootScope) {
    var socket = io();
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
        }
    };
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
        // line breaks
        // http://stackoverflow.com/questions/2919337/jquery-convert-line-breaks-to-br-nl2br-equivalent
        str = str.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
        // mdash
        str = str.replace(/--/g, '&mdash;');

        // done.
        return $sce.trustAsHtml(str);
    }
}])

.filter('contrastColor', function() {
    return function(color, opacity) {
        //YIQ algorithm modified from:
        // http://24ways.org/2010/calculating-color-contrast/
        var components = [1,3,5].map(i => parseInt(color.substr(i, 2), 16));
        var yiq = components[0]*0.299 + components[1]*0.597 + components[2]*0.114;
        if (opacity) {
            var i = (yiq >= 128)? 0:255;
            return 'rgba('+i+','+i+','+i+','+opacity+')';
        }
        return (yiq >= 128) ? 'black' : 'white';
    };
})

.filter('needsContrastColor', function() {
    return function(color) {
        if (!color) return false;
        //YIQ algorithm modified from:
        // http://24ways.org/2010/calculating-color-contrast/
        var components = [1,3,5].map(i => parseInt(color.substr(i, 2), 16));
        var yiq = components[0]*0.299 + components[1]*0.597 + components[2]*0.114;
        return yiq > 200 || yiq < 60;
    };
})

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

moment.defineLocale('en-short', {
    parentLocale: 'en',
    relativeTime: {
        past: "%s",
        s: 'now',
        m: '%dmin', mm: '%dmin',
        h: '%dhr', hh: '%dhr',
        d: '%dday', dd: '%dday',
        M: '%dmo', MM: '%dmo',
        y: '%dyr', yy: '%dyrs'
    }
});