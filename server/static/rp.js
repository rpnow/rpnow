(function() {
   var app = angular.module('rpnow', ['ngMaterial', 'ngSanitize']);

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

   app.controller('RpController', ['$scope', '$mdMedia', '$mdSidenav', '$mdDialog', 'socket', function($scope, $mdMedia, $mdSidenav, $mdDialog, socket) {
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

      socket.on('add message', function(msg) {
         $scope.rp.msgs.push(msg);
         flashAlert('* New message!', $scope.notificationNoise);
      });
      socket.on('add character', function(chara) {
         $scope.rp.charas.push(chara);
      });

      $scope.msgBox = {
         content: '',
         sender: 'narrator',
         selected: false
      };
      $scope.sendMessage = function() {
         if (!$scope.msgBox.content.trim()) return;

         var msg = {
            content: $scope.msgBox.content.trim(),
            type: (Math.random()<.2)?'narrator':(Math.random()<.4)?'ooc':'chara'
         }
         if(msg.type === 'chara') msg.chara = {name:'Copernicus', color:
            (['#7BA84B', '#EED1D2', '#372715'])[Math.floor(Math.random()*3)]
         };
         socket.emit('add message', msg, function(receivedMsg) {
            $scope.rp.msgs.splice($scope.rp.msgs.indexOf(msg),1);
            $scope.rp.msgs.push(receivedMsg);
         });
         msg.sending = true;
         $scope.rp.msgs.push(msg);
         $scope.msgBox.content = '';
      };
      // rp.sendChara = function(chara, callback) {
      //    socket.emit('add character', chara, function(recievedChara) {
      //       callback(recievedChara);
      //    });
      // };
      // rp.stop = function() {
      //    socket.close();
      // };

      $scope.pressEnterToSend = true;
      $scope.notificationNoise = true;
      $scope.showMessageDetails = true;
      $scope.nightMode = false;

      $scope.toggleLeftDrawer = function() {
         $mdSidenav('left').toggle();
      };
      $scope.showInviteDialog = function(evt) {
         $mdDialog.show({
            contentElement: '#myDialog',
            targetEvent: evt,
            clickOutsideToClose: true
         });
      };
      $scope.hideInviteDialog = function() { $mdDialog.hide(); };
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

   app.filter('msgContent', function() {
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
            '<a href="$1" target="_blank">$1</a>'
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
         return str;
      }
   });

   app.filter('contrastColor', function() {
      return function(color) {
         //YIQ algorithm modified from:
         // http://24ways.org/2010/calculating-color-contrast/
         var components = [1,3,5].map(i => parseInt(color.substr(i, 2), 16));
         var yiq = components[0]*0.299 + components[1]*0.597 + components[2]*0.114;
         return (yiq >= 128) ? 'black' : 'white';
      };
   });

   var flashAlert = (function() {
      var alertNoise = new Audio('/alert.mp3');
      var alertMsg = null;
      var i = 0;
      var informTimer = null;
      var oldTitleText;
      function timerAction() {
         if(i%2) document.title = oldTitleText;
         else document.title = alertMsg;
         --i;
         if(i >= 0) informTimer = setTimeout(timerAction, 500);
      }
      document.addEventListener('visibilitychange', function(evt) {
         if(document.visibilityState === 'visible') {
            clearTimeout(informTimer);
            document.title = oldTitleText;
         }
      });
      return function(msg, noise) {
         if(document.visibilityState === 'visible') return;
         i = 6;
         if(informTimer) clearTimeout(informTimer);
         alertMsg = msg;
         oldTitleText = document.title;
         timerAction(msg);
         if (noise) alertNoise.play();
      };
   })();
})();