(function() {
   var app = angular.module('rpnow', ['ngMaterial']);
   var socket = io();

   app.config(['$mdThemingProvider', function($mdThemingProvider) {
      $mdThemingProvider.theme('default')
         .primaryPalette('pink')
         .accentPalette('amber');
   }]);

   app.controller('RpController', ['$scope', '$rootScope', function($scope, $rootScope) {
      $scope.loading = true;
      $scope.rp = { rpCode: location.pathname.split('/').pop().split('#')[0] };

      $scope.msgBox = {
         msg: {
            content: '',
            type: 'narrator'
         },
         selected: false
      };

      socket.emit('join rp', $scope.rp.rpCode, function(data) {
         ['title', 'desc', 'msgs', 'charas', 'ipid', 'timestamp']
            .forEach(function(prop) {
               if(data[prop] !== undefined) $scope.rp[prop] = JSON.parse(JSON.stringify(data[prop]));
            });
         $scope.loading = false;
$scope.rp.msgs = [{
'content': 'Vero odit debitis vel nobis ut laudantium architecto similique. Aut velit possimus delectus assumenda sapiente. Laboriosam impedit quibusdam cum nulla voluptas explicabo. Omnis sint voluptatem earum omnis. Pariatur fuga amet alias sed quibusdam incidunt.',
'type': 'narrator',
'ipid': '19018a9df9d7e9bca1',
'timestamp': 1487794467385.234
}]; for(var i = 0; i < 50; ++i) $scope.rp.msgs.push(JSON.parse(JSON.stringify($scope.rp.msgs[0])));
$scope.rp.msgs.forEach(msg=> {
if(Math.random()<.5) msg.type='ooc';
else if(Math.random()<.5) {msg.type='chara'; msg.chara={name:'dan',color:'#8b6312'}}
})
         $rootScope.$apply();
      });

      socket.on('add message', function(msg) {
         $scope.rp.msgs.push(msg);
         $rootScope.$apply();
      });
      socket.on('add character', function(chara) {
         $scope.rp.charas.push(chara);
         $rootScope.$apply();
      });

      $scope.rp.sendMessage = function() {
         if (!$scope.msgBox.msg.content.trim()) return;

         var msg = JSON.parse(JSON.stringify($scope.msgBox.msg));
         socket.emit('add message', msg, function(receivedMsg) {
            $scope.rp.msgs.splice($scope.rp.msgs.indexOf(msg),1);
            $scope.rp.msgs.push(receivedMsg);
            $rootScope.$apply();
         });
         msg.sending = true;
         $scope.rp.msgs.push(msg);
         $scope.msgBox.msg.content = '';
      };
      // rp.sendChara = function(chara, callback) {
      //    socket.emit('add character', chara, function(recievedChara) {
      //       callback(recievedChara);
      //    });
      // };
      // rp.stop = function() {
      //    socket.close();
      // };

   }]);

   app.filter('momentAgo', function() {
      return function(timestamp) {
         return moment(timestamp).fromNow();
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