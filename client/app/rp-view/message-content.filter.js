'use strict';

angular.module('rpnow')

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
