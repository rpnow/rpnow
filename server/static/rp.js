(function() {
   var app = angular.module('rpnow', ['ngMaterial', 'luegg.directives']);

   app.config(['$mdThemingProvider', function($mdThemingProvider) {
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
   }]);

   app.controller('RpController', ['$scope', '$http', '$mdMedia', '$mdSidenav', '$mdDialog', 'pageAlerts', 'socket', function($scope, $http, $mdMedia, $mdSidenav, $mdDialog, pageAlerts, socket) {
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
         $scope.recentMsgs = $scope.rp.msgs.slice(-RECENT_MSG_COUNT);
         $scope.loading = false;
      });

      $scope.isStoryGlued = true;
      function addMessage(msg) {
         $scope.rp.msgs.push(msg);
         $scope.recentMsgs.push(msg);
         $scope.recentMsgs.splice(0, $scope.recentMsgs.length - ($scope.isStoryGlued ? RECENT_MSG_COUNT : MAX_RECENT_MSG_COUNT) );
      }

      socket.on('add message', function(msg) {
         addMessage(msg);
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
         selected: false
      };
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
            msg.chara = $scope.rp.charas[+$scope.msgBox.voice];
            delete msg.chara.$$hashKey;
         }

         socket.emit('add message', msg, function(receivedMsg) {
            msg.timestamp = receivedMsg.timestamp;
            msg.ipid = receivedMsg.ipid;
            delete msg.sending;
         });
         msg.sending = true;
         addMessage(msg);
         $scope.msgBox.content = '';
      };
      $scope.addCharaBox = {
         lastVoice: null,
         name: '',
         color: '',
         sending: false
      };
      $scope.sendChara = function() {
         var chara = {
            name: $scope.addCharaBox.name,
            color: $scope.addCharaBox.color
         }

         socket.emit('add character', chara, function(receivedChara) {
            $scope.rp.charas.push(receivedChara);
            $mdDialog.hide($scope.rp.charas.length-1);
         });
         $scope.addCharaBox.sending = true;
         $scope.addCharaBox.name = '';
         $scope.addCharaBox.color = '';
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
      $scope.showDialog = function(id, evt) {
         return $mdDialog.show({
            contentElement: id,
            targetEvent: evt,
            clickOutsideToClose: true
         });
      }
      $scope.hideDialog = function() { $mdDialog.cancel(); };
      $scope.showCharacterDialog = function(evt) {
         $scope.addCharaBox.lastVoice = $scope.msgBox.voice;
         $scope.showDialog('#characterCreatorDialog', evt)
         .then(function(charaId) { 
            $scope.addCharaBox.sending = false;
            $scope.msgBox.voice = charaId
         }, function() {
            $scope.msgBox.voice = $scope.addCharaBox.lastVoice;
         })
      }
      $scope.viewMobileToolbarMenu = function($mdOpenMenu, evt) { $mdOpenMenu(evt); };
      $scope.$watch(function() { return $mdMedia('gt-sm'); }, function(desktop) {
         $scope.isDesktopMode = desktop;
      });

      $scope.$on('$destroy', socket.close);
   }]);

   app.directive('onPressEnter', function() {
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
   });

   app.directive('autoResize', function() {
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
   app.factory('socket', ['$rootScope', function($rootScope) {
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
   }]);

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
   app.filter('momentAgoShort', function() {
      return function(timestamp) {
         return moment(timestamp*1000).locale('en-short').fromNow();
      }
   });
   app.filter('momentAgo', function() {
      return function(timestamp) {
         return moment(timestamp*1000).locale('en').fromNow();
      }
   });

   app.filter('msgContent', ['$sce', function($sce) {
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
   }]);

   app.filter('contrastColor', function() {
      return function(color) {
         //YIQ algorithm modified from:
         // http://24ways.org/2010/calculating-color-contrast/
         var components = [1,3,5].map(i => parseInt(color.substr(i, 2), 16));
         var yiq = components[0]*0.299 + components[1]*0.597 + components[2]*0.114;
         return (yiq >= 128) ? 'black' : 'white';
      };
   });

   app.service('pageAlerts', function() {
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
   });

})();