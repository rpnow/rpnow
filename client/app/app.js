angular.module('rpnow', [
    'ngRoute', 'ngMaterial', 'angularCSS', 'luegg.directives', 'mp.colorPicker', 'LocalStorageModule'
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

.run(['$rootScope', '$route', function($rootScope, $route) {
    // https://stackoverflow.com/questions/26308020/how-to-change-page-title-in-angular-using-routeprovider
    $rootScope.$on('$routeChangeSuccess', function() {
        document.title = $route.current.title;
    });
}])
