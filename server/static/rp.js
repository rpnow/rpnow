(function() {
   var app = angular.module('rpnow', ['ngMaterial']);
   var socket = io();

   app.config(['$mdThemingProvider', function($mdThemingProvider) {
      $mdThemingProvider.theme('default')
         .primaryPalette('pink')
         .accentPalette('amber');
   }]);

   app.controller('RpController', ['$rootScope', function($rootScope) {
      var rp = this;
      rp.loading = true;
      rp.rpCode = location.pathname.split('/').pop().split('#')[0];
      rp.msgBox = {
         msg: {
            content: '',
            type: 'narrator'
         },
         selected: false
      };

      socket.emit('join rp', rp.rpCode, function(data) {
         ['title', 'desc', 'msgs', 'charas', 'ipid', 'timestamp']
            .forEach(function(prop) {
               if(data[prop] !== undefined) rp[prop] = JSON.parse(JSON.stringify(data[prop]));
            });
         rp.loading = false;
         rp.msgs = [{
            'content': 'hello',
            'type': 'narrator'
         }]
         $rootScope.$apply();
      });

      socket.on('add message', function(msg) {
         rp.msgs.push(msg);
         $rootScope.$apply();
      });
      socket.on('add character', function(chara) {
         rp.charas.push(chara);
         $rootScope.$apply();
      });

      rp.sendMessage = function() {
         if (!rp.msgBox.msg.content.trim()) return;

         var msg = JSON.parse(JSON.stringify(rp.msgBox.msg));
         socket.emit('add message', msg, function(receivedMsg) {
            rp.msgs.splice(rp.msgs.indexOf(msg),1);
            rp.msgs.push(receivedMsg);
            $rootScope.$apply();
         });
         msg.sending = true;
         rp.msgs.push(msg);
         rp.msgBox.msg.content = '';
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