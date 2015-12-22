var visualAco = angular.module('visualAco', [
  'ngRoute',
  'visualAcoControllers',
  'visualAcoServices',
  'ui.bootstrap'
]);

visualAco.config(['$routeProvider',
  function ($routeProvider) {
    $routeProvider.
    when('/algorithm', {
      templateUrl: 'partials/algorithm.html',
      controller: 'AlgorithmCtrl',
      activeTab: 'algorithm'
    }).
    when('/about', {
      templateUrl: 'partials/about.html',
      controller: 'AboutCtrl',
      activeTab: 'about'
    }).
    when('/visualisation', {
      templateUrl: 'partials/visualisation.html',
      controller: 'VisualisationCtrl',
      activeTab: 'visualisation'
    }).
    otherwise({
      redirectTo: '/visualisation'
    });
  }]).run(['$rootScope', '$location', function($rootScope, $location){
  var path = function() { return $location.path();};
  $rootScope.$watch(path, function(newVal, oldVal){
    $rootScope.activeTab = newVal;
  });
}]);