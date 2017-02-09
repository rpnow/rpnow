(function() {
   var app = angular.module('rpnow', []);
   app.controller('RpController', function() {
      this.loading = false;
      this.rpCode = "Tv9jdt7X";
      this.title = "The Grim Grotto";
      this.desc = "time for some fun";
      this.timestamp = 1484768511.033;
      this.ipid = "12a949960fcd587a33";
      this.msgs = [
         {  type: "narrator",
            content: "Message!!!",
            timestamp: 1484768525.751,
            ipid: "12a949960fcd587a33"
         },
         {  type: "chara",
            content: "hello, /ya dingus/",
            chara: {
               name: "DAN",
               color: "#dddddd"
            },
            timestamp: 1484768566.323,
            ipid: "12a949960fcd587a33"
         },
         {  type: "ooc",
            content: "hey",
            timestamp: 1484768525.751,
            ipid: "12a949960fcd587a33"
         },
         {  type: "ooc",
            content: "hey",
            timestamp: 1484768525.751,
            ipid: "12a949960fcd587a33"
         },
         {  type: "ooc",
            content: "hey",
            timestamp: 1484768525.751,
            ipid: "12a949960fcd587a33"
         },
         {  type: "chara",
            content: "l8r",
            chara: {
               name: "GRAN",
               color: "#ffeeaa"
            },
            timestamp: 1484768566.323,
            ipid: "12a949960fcd587a33"
         },
         {  type: "chara",
            content: "goodbye, /ya dingus/",
            chara: {
               name: "MAN",
               color: "#dd7733"
            },
            timestamp: 1484768566.323,
            ipid: "12a949960fcd587a33"
         },
         {  type: "narrator",
            content: "ME AGAIN",
            timestamp: 1484768525.751,
            ipid: "12a949960fcd587a33"
         },
         {  type: "narrator",
            content: "OH NO",
            timestamp: 1484768525.751,
            ipid: "12a949960fcd587a33"
         },
         {  type: "ooc",
            content: "yep",
            timestamp: 1484768525.751,
            ipid: "12a949960fcd587a33"
         },
         {  type: "chara",
            content: "i am the END",
            chara: {
               name: "THE END",
               color: "#220011"
            },
            timestamp: 1484768566.323,
            ipid: "12a949960fcd587a33"
         },
      ];
      this.charas = [
         {
            name: "DAN",
            color: "#dddddd"
         }
      ];
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
   })
})();