angular.module('rpnow', [
    'angularCSS', 'LocalStorageModule', 'luegg.directives', 'mp.colorPicker', 'ngMaterial', 'ui.router', 'ngMeta'
])

.config(['$locationProvider', function($locationProvider) {
    $locationProvider.html5Mode(true);
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

.run(['ngMeta', function(ngMeta) {
    ngMeta.init();
}])
