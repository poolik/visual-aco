//noinspection JSUnresolvedFunction
var servicesModule = angular.module('visualAcoServices', []);

Array.matrix = function(numrows, numcols, initial){
  var arr = [];
  for (var i = 0; i < numrows; ++i){
    var columns = [];
    for (var j = 0; j < numcols; ++j){
      columns[j] = initial;
    }
    arr[i] = columns;
  }
  return arr;
};

servicesModule.factory('Two', function () {

  var type = 'webgl';
  var params = {
    type: Two.Types[type],
    autostart: true,
    width: document.querySelector('#stage').parentNode.offsetWidth,
    height: 600
  };

  return new Two(params).appendTo(document.querySelector('#stage'));
});

servicesModule.factory('City', function () {
  var City = function (id, x, y, circle) {
    this.id = id;
    this.point = circle;
    this.x = x;
    this.y = y;
  };

  City.prototype.distanceTo = function(other) {
    if (!other instanceof City) throw "Should be instanceof City!";
    var xDiff = this.x - other.x;
    var yDiff = this.y - other.y;
    return Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));
  };

  return function (id, x, y, circle) {
    return new City(id, x, y, circle);
  }
});

servicesModule.factory('Ant', ['Two', '$q', '$interval', function (Two, $q, $interval) {
  var Ant = function(id, nrOfCities) {
    this.id = id;
    this.nrOfCities = nrOfCities;
    this.tour = [];
    this.visited = [];
    this.currentIndex = -1;
  };

  Ant.prototype.clear = function () {
    for (var i = 0; i < this.visited.length; i++) {
      this.visited[i] = false;
    }
    for (i = 0; i < this.tour.length; i++) {
      this.tour[i] = undefined;
    }
    this.currentIndex = -1;
  };

  Ant.prototype.startTour = function () {
    this.tourDone = $q.defer();
    return this.tourDone.promise;
  };

  Ant.prototype.moveTo = function (city) {
    this.destination = city;
    var radians = Math.atan2(this.destination.y - (this.ant.translation.y), this.destination.x - (this.ant.translation.x));
    var angleDeg = radians * 180 / Math.PI;
    this.ant.rotation = radians + 45 / Math.PI - 0.2;
    this.cos = Math.cos(angleDeg * Math.PI / 180);
    this.sin = Math.sin(angleDeg * Math.PI / 180);
    this.moveDone = $q.defer();
    return this.moveDone.promise;
  };

  Ant.prototype.move = function () {
    if (Math.abs(this.ant.translation.x - (this.destination.x)) < 5 && Math.abs(this.ant.translation.y - (this.destination.y)) < 5) {
      this.moveDone.resolve();
      this.moveDone = null;
    } else {
      this.ant.translation.x = this.ant.translation.x + 2 * this.cos;
      this.ant.translation.y = this.ant.translation.y + 2 * this.sin;
    }
  };

  Ant.prototype.visitTown = function (city) {
    if (this.currentIndex === -1) {
      this.ant = Two.interpret(document.querySelector('#ant')).center();
      this.ant.noStroke().fill = "#D00000";
      this.ant.scale = 0.5;
      this.ant.translation.set(city.x, city.y);
    }
    if (this.currentIndex == this.nrOfCities - 1) return;
    this.currentIndex++;
    this.tour[this.currentIndex] = city;
    this.visited[city.id] = true;
  };

  Ant.prototype.currentCity = function () {
    return this.tour[this.currentIndex];
  };

  Ant.prototype.getTour = function () {
    return _.pluck(this.tour, 'id');
  };

  Ant.prototype.hasVisited = function (cityIndex) {
    return this.visited[cityIndex];
  };

  return function (id, nrOfCities) {
    return new Ant(id, nrOfCities);
  }
}]);

servicesModule.factory('AntColony', ['Ant', '$q', function (Ant, $q) {
  function calculateDistances(cities) {
    var distanceMatrix = Array.matrix(cities.length,cities.length,0);
    var rIndex = 0;
    _.each(cities, function (first) {
      var hIndex = 0;
      _.each(cities, function (second) {
        distanceMatrix[rIndex][hIndex] = first.distanceTo(second);
        hIndex++;
      });
      rIndex++;
    });
    return distanceMatrix;
  }

  function initTrails(nrOfCities, initialPheromonAmount) {
    var trails = Array.matrix(nrOfCities,nrOfCities,0);
    _(nrOfCities).times(function (i) {
      _(nrOfCities).times(function (j) {
        trails[i][j] = initialPheromonAmount;
      });
    });
    return trails;
  }

  function initAnts(nrOfCities, nrOfAnts) {
    var ants = [];
    _(nrOfAnts).times(function (i) { ants[i] = Ant(i, nrOfCities)});
    return ants;
  }

  var AntColony = function (cities, nrOfAnts, algorithm) {
    this.nrOfCities = cities.length;
    this.cities = cities;
    this.distances = calculateDistances(cities);
    this.trails = initTrails(this.nrOfCities, 1.0);
    this.ants = initAnts(this.nrOfCities, nrOfAnts);
    this.algorithm = algorithm;
    this.evaporation = 0.5;
    this.Q = 500;
  };

  AntColony.prototype.setupAnts = function () {
    _.each(this.ants, function (ant) {
      ant.clear();
      ant.visitTown(this.cities[_.random(this.nrOfCities - 1)]);
    }, this);
  };

  AntColony.prototype.moveAnts = function () {
    var deferred = $q.defer();
    this.moveAntsInner(0, deferred);
    return deferred.promise;
  };

  AntColony.prototype.moveAntsInner = function (count, deferred) {
    var promises = [];
    for (var i = 0, len = this.ants.length; i < len; i++) {
      var ant = this.ants[i];
      var selectNextTown = this.algorithm.selectNextTown(ant, this);
      if (selectNextTown === undefined) selectNextTown = ant.getTour()[0]; // back to first!
      console.log("next: " + selectNextTown);
      var nextTown = this.cities[selectNextTown];
      var promise = ant.moveTo(nextTown);
      promise.then(ant.visitTown.bind(ant, nextTown));
      promises.push(promise);
    }

    var intervalId = setInterval(drawMoving.bind(this), 30);
    $q.all(promises).then(allAntsMoved.bind(this, count, intervalId, deferred));
  };

  function allAntsMoved(count, intervalId, deferred) {
    clearInterval(intervalId);
    if (count < this.nrOfCities) this.moveAntsInner(++count, deferred);
    else deferred.resolve();
  }

  function drawMoving() {
    for (var i = 0, len = this.ants.length; i < len; i++) {
      this.ants[i].move();
    }
  }

  AntColony.prototype.tourLength = function (tour) {
    var length = this.distances[tour[this.nrOfCities - 1]][tour[0]];
    for (var i = 0; i < this.nrOfCities - 1; i++) {
      length += this.distances[tour[i]][tour[i + 1]];
    }
    return length;
  };

  AntColony.prototype.updateTrails = function () {
    for (var i = 0; i < this.nrOfCities; i++) {
      for (var j = 0; j < this.nrOfCities; j++)
        this.trails[i][j] *= this.evaporation;
    }

    // each ants contribution
    _.each(this.ants, function (ant) {
      var contribution = this.Q / this.tourLength(ant.getTour());
      for (var i = 0; i < this.nrOfCities - 1; i++) {
        this.trails[ant.getTour()[i]][ant.getTour()[i + 1]] += contribution;
      }
      this.trails[ant.getTour()[this.nrOfCities - 1]][ant.getTour()[0]] += contribution;
    }, this);
  };

  AntColony.prototype.getBestTour = function () {
    var bestTourLength = Number.MAX_VALUE;
    var bestTour = undefined;
    _.each(this.ants, function (ant) {
      var tourLength = this.tourLength(ant.getTour());
      if (tourLength < bestTourLength) {
        bestTourLength = tourLength;
        bestTour = ant.getTour();
      }
    }, this);
    return {tour: bestTour.slice(0), length: bestTourLength};
  };

  return function(cities, nrOfAnts, algorithm) {
    return new AntColony(cities, nrOfAnts, algorithm);
  }
}]);

servicesModule.factory('AntSystemAlgorithm', [function () {
  var AntSystemAlgorithm = function() {
    this.alpha = 1;
    this.beta = 5;
  };

  function calculateProbabilites(ant, colony, alpha, beta) {
    var probabilities = [];
    var current = ant.currentCity().id;

    var denominator = 0.0;
    for (var next = 0; next < colony.nrOfCities; next++) {
      if (!ant.hasVisited(next))
        denominator += Math.pow(colony.trails[current][next], alpha) * Math.pow(1.0 / colony.distances[current][next], beta);
    }

    for (var j = 0; j < colony.nrOfCities; j++) {
      if (ant.hasVisited(j)) {
        probabilities[j] = 0.0;
      } else {
        var numerator = Math.pow(colony.trails[current][j], alpha)
            * Math.pow(1.0 / colony.distances[current][j], beta);
        probabilities[j] = numerator / denominator;
      }
    }
    return probabilities;
  }

  AntSystemAlgorithm.prototype.selectNextTown = function (ant, colony) {
    var probabilities = calculateProbabilites(ant, colony, this.alpha, this.beta);

    var random = Math.random();
    var total = 0;
    for (var i = 0; i < colony.nrOfCities; i++) {
      total += probabilities[i];
      if (total >= random) return i;
    }
  };


  return function () {
    return new AntSystemAlgorithm();
  }
}]);
