(function() {
   var app = angular.module('rpnow', ['ngMaterial']);

   app.config(['$mdThemingProvider', function($mdThemingProvider) {
      $mdThemingProvider.theme('default')
         .primaryPalette('pink')
         .accentPalette('amber');
   }]);

   app.controller('RpController', ['$scope', 'socket', function($scope, socket) {
      $scope.loading = true;
      $scope.rp = { rpCode: location.pathname.split('/').pop().split('#')[0] };

      $scope.msgBox = {
         content: '',
         sender: 'narrator',
         selected: false
      };

      socket.emit('join rp', $scope.rp.rpCode, function(data) {
         ['title', 'desc', 'msgs', 'charas', 'ipid', 'timestamp']
            .forEach(function(prop) {
               if(data[prop] !== undefined) $scope.rp[prop] = JSON.parse(JSON.stringify(data[prop]));
            });
         $scope.loading = false;
      });

      socket.on('add message', function(msg) {
         $scope.rp.msgs.push(msg);
      });
      socket.on('add character', function(chara) {
         $scope.rp.charas.push(chara);
      });

      $scope.sendMessage = function() {
         if (!$scope.msgBox.content.trim()) return;

         var msg = {
            content: $scope.msgBox.content.trim(),
            type: (Math.random()<.5)?'narrator':'ooc'
         }
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

      $scope.$on('$destroy', socket.close);
   }]);

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

   app.filter('momentAgo', function() {
      return function(timestamp) {
         return moment(timestamp*1000).fromNow();
      }
   });

   app.filter('msgContent', function() {
      return function(str) {
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
         return (yiq >= 128) ? '#000000' : '#ffffff';
      };
   });
})();