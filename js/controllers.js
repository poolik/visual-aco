'use strict';

/* Controllers */
var visualAcoControllers = angular.module('visualAcoControllers', []);

visualAcoControllers.controller('VisualisationCtrl', ['$scope', 'City', 'AntColony', 'AntSystemAlgorithm', 'Two',
  function ($scope, City, AntColony, AntSystemAlgorithm, Two) {
    $scope.nrOfCities = 10;

    $scope.generate = function () {
      bestTour = undefined;
      Two.remove(_.pluck(cities, 'point'));
      Two.remove(lines);
      _($scope.nrOfCities).times(function (n) {
        var radius = getScaleAdjustedSettings().radius;
        var x = _.random(radius, Two.width - radius);
        var y = _.random(radius, Two.height - radius);
        var circle = Two.makeCircle(x, y, radius);
        circle.noStroke().fill = '#000000';
        cities[n] = City(n, x, y, circle);
      });
      colony = AntColony(cities, Math.round($scope.nrOfCities * 0.8), algorithm);
    };

    function drawBest() {
      Two.remove(lines);
      var start = cities[bestTour.tour[$scope.nrOfCities - 1]];
      var end = cities[bestTour.tour[0]];
      lines[0] = Two.makeLine(start.x, start.y, end.x, end.y);
      for (var i = 1; i < bestTour.tour.length; i++) {
        start = cities[bestTour.tour[i - 1]];
        end = cities[bestTour.tour[i]];
        lines[i] = Two.makeLine(start.x, start.y, end.x, end.y);
      }
    }

    $scope.next = function () {
      colony.setupAnts();
      colony.moveAnts().then(function() {
        colony.updateTrails();
        updateBest(colony.getBestTour());
      });
    };

    $scope.run = function () {
      var iterationCount = 0;
      setInterval(runIter(++iterationCount), 10);
      var running = false;
      function runIter(iterationCount) {
        console.log("iteration: " + iterationCount);
        if (running || iterationCount > 1000) return;
        running = true;
        colony.setupAnts();
        colony.moveAnts().then(function() {
          colony.updateTrails();
          updateBest(colony.getBestTour());
          running = false;
        });
      }
    };

    var cities = [];
    var bestTour = undefined;
    var lines = [];
    var algorithm = AntSystemAlgorithm();
    var colony = AntColony(cities, Math.round($scope.nrOfCities * 0.8), algorithm);

    function getScaleAdjustedSettings() {
      if ($scope.nrOfCities < 50) return {radius: 10, scale: 0.5};
      if ($scope.nrOfCities < 250) return {radius: 5, scale: 0.3};
      return {radius: 3, scale: 0.15};
    }

    function updateBest(currentBest) {
      if (bestTour === undefined) {
        bestTour = currentBest;
      } else if (currentBest.length < bestTour.length) {
        bestTour = currentBest;
      }
      drawBest();
      console.log("Best tour so far: ", bestTour.length);
      console.log(bestTour.tour.toString());
    }
  }]);

visualAcoControllers.controller('AlgorithmCtrl', ['$scope',
  function ($scope) {
  }]);

visualAcoControllers.controller('AboutCtrl', ['$scope',
  function ($scope) {
  }]);