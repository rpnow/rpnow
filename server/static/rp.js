angular.module('rpnow', ['ngMaterial', 'luegg.directives', 'mp.colorPicker', 'LocalStorageModule'])

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

.controller('RpController', ['$scope', '$timeout', '$http', '$mdMedia', '$mdSidenav', '$mdDialog', 'pageAlerts', 'socket', 'localStorageService', function($scope, $timeout, $http, $mdMedia, $mdSidenav, $mdDialog, pageAlerts, socket, localStorageService) {
   $scope.MAX_CHARA_NAME_LENGTH  = 30;
   $scope.MAX_MSG_CONTENT_LENGTH = 10000;

   var RECENT_MSG_COUNT = 100;
   var MAX_RECENT_MSG_COUNT = 200;

   $scope.loading = true;
   $scope.url = location.href.split('#')[0];
   $scope.rp = { rpCode: $scope.url.split('/').pop() };

   socket.emit('join rp', $scope.rp.rpCode, function(data) {
      ['title', 'desc', 'msgs', 'charas', 'ipid', 'timestamp']
         .forEach(function(prop) {
            if(data[prop] !== undefined) $scope.rp[prop] = JSON.parse(JSON.stringify(data[prop]));
         });
      $scope.loading = false;
   });

   $scope.id = function(item) {
      var index;
      if ((index = $scope.rp.charas.indexOf(item)) >= 0) return index;
      if ((index = $scope.rp.msgs.indexOf(item)) >= 0) return index;
      return null;
   }

   socket.on('add message', function(msg) {
      $scope.rp.msgs.push(msg);
      var alertText;
      if(msg.type === 'chara') alertText = '* ' + msg.chara.name + ' says...';
      else if(msg.type === 'narrator') alertText = '* The narrator says...';
      else if(msg.type === 'ooc') alertText = '* OOC message...';
      pageAlerts.alert(alertText, $scope.notificationNoise);
   });
   socket.on('add character', function(chara) {
      $scope.rp.charas.push(chara);
   });

   $scope.msgBox = {
      content: '',
      voice: 'narrator',
      recentVoices: function() { return $scope.msgBox.recentVoicesString? $scope.msgBox.recentVoicesString.split(',').map(function(x) { return (+x >= 0)? +x: x;}): undefined; },
      recentVoicesString: 'narrator,ooc' // stored in a string so it can be easily bound to localStorage
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
      console.log($scope.msgBox.voice);
      console.log($scope.msgBox.recentVoicesString);
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
         msg.chara = JSON.parse(JSON.stringify($scope.rp.charas[+$scope.msgBox.voice]));
         delete msg.chara.$$hashKey;
      }

      socket.emit('add message', msg, function(receivedMsg) {
         $scope.rp.msgs.splice($scope.rp.msgs.indexOf(msg),1);
         $scope.rp.msgs.push(receivedMsg);
      });
      msg.sending = true;
      $scope.rp.msgs.push(msg);
      $scope.msgBox.content = '';
   };
   $scope.addCharaBox = {
      name: '',
      color: '#ff0000',
      sending: false
   };
   $scope.sendChara = function() {
      var chara = {
         name: $scope.addCharaBox.name,
         color: $scope.addCharaBox.color
      }

      socket.emit('add character', chara, function(receivedChara) {
         $scope.rp.charas.push(receivedChara);
         $timeout(function() { $mdSidenav('right').close(); },100);
         $mdDialog.hide($scope.rp.charas.length-1);
      });
      $scope.addCharaBox.sending = true;
      $scope.addCharaBox.name = '';
   };
   // rp.stop = function() {
   //    socket.close();
   // };
   $scope.downloadOOC = true;
   $scope.downloadTxt = function() {
      var out = $scope.rp.msgs;
      if (!$scope.downloadOOC) out = out.filter(function(msg) {return msg.type!=='ooc'});
      out = out.map(function(msg){
         if(msg.type === 'narrator') {
            return wordwrap(msg.content, 72);
         }
         else if(msg.type === 'ooc') {
            return wordwrap('(( OOC: '+msg.content+' ))', 72);
         }
         else if(msg.type === 'chara') {
            return msg.chara.name.toUpperCase()+':\r\n'
               + wordwrap(msg.content, 70, '  ');
         }
         else {
            throw new Error('Unexpected message type: '+msg.type);
         }
      });
      out.unshift($scope.rp.title+'\r\n'+($scope.rp.desc||'')+'\r\n----------');
      var str = out.join('\r\n\r\n');
      download($scope.rp.title+'.txt', str);
   };
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
   function download(filename, data) {
      // https://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
      // https://stackoverflow.com/questions/23451726/saving-binary-data-as-file-using-javascript-from-a-browser
      var element = document.createElement('a');
      element.style.display = 'none';
      element.setAttribute('download', filename);

      var href;
      if (typeof data === 'string') {
         href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(data);
      }
      else if (data instanceof Blob) {
         href = window.URL.createObjectURL(data);
      }
      else {
         throw new Error('unknown data type.');
      }
      element.setAttribute('href', href);


      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
   }
   $scope.downloadDocx = function() {
      var rpData = JSON.parse(JSON.stringify($scope.rp));
      rpData.hasDesc = !!rpData.desc;
      rpData.msgs.forEach(function(msg) {
         msg.isNarrator = msg.type === 'narrator';
         msg.isOOC = msg.type === 'ooc';
         msg.isChara = msg.type === 'chara';
         if (msg.isChara) msg.name = msg.chara.name.toUpperCase();
      });
      $http.get('/template.docx', {responseType: 'arraybuffer'})
         .then(function(res) {

            var doc = new Docxtemplater().loadZip(new JSZip(res.data));
            doc.setData(rpData);
            doc.render();
            var out = doc.getZip().generate({
               type: 'blob',
               mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            });
            download($scope.rp.title+'.docx', out)
         });
   }

   $scope.pressEnterToSend = true;
   $scope.notificationNoise = true;
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
      console.log(isRightDrawerLockedOpen);
   });

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

   $scope.isStoryGlued = true;
   $scope.numMsgsToShow = RECENT_MSG_COUNT;
   $scope.$watch('rp.msgs.length', function(length, oldLength) {
      if (!(length > oldLength)) return;

      if ($scope.isStoryGlued) $scope.numMsgsToShow = RECENT_MSG_COUNT;
      else $scope.numMsgsToShow = Math.min($scope.numMsgsToShow+1, MAX_RECENT_MSG_COUNT);
   });

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

   $scope.$on('$destroy', socket.close);
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
      },
      close: socket.close.bind(socket)
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

.filter('msgContent', ['$sce', function($sce) {
   return function(str) {
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
      // if(chara) {
      //    str = str.replace(/\*([^\r\n\*_]+)\*/g, '<span class="action" style="background-color:' + chara.color + ';' + 'color:' + rp.contrastColor(chara.color) + '">*$1*</span>');
      // }
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
      //YIQ algorithm modified from:
      // http://24ways.org/2010/calculating-color-contrast/
      var components = [1,3,5].map(i => parseInt(color.substr(i, 2), 16));
      var yiq = components[0]*0.299 + components[1]*0.597 + components[2]*0.114;
      return yiq > 200 || yiq < 60;
   };
})

.service('pageAlerts', function() {
   var pageAlerts = this;

   var alertNoise = new Audio('/alert.mp3');
   
   var alertText = null;
   var oldText = null;
   var flashesLeft = 0;
   var timer = null;
   
   this.alert = function(text, playSound) {
      if (document.visibilityState === 'visible') return;

      clearTimeout(timer);
      if (document.title === alertText) document.title = oldText;

      alertText = text;
      flashesLeft = 3;
      timerAction();
      if (playSound) alertNoise.play();
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