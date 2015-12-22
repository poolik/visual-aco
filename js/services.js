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

servicesModule.factory('Ant', ['Two', '$q', '$rootScope', function (Two, $q, $rootScope) {
  var Ant = function(id, nrOfCities, antImgScale) {
    this.id = id;
    this.nrOfCities = nrOfCities;
    this.tour = [];
    this.tourIds = [];
    this.visited = [];
    this.currentIndex = -1;
    this.antImgScale = antImgScale;
  };
  var speed = 2;

  $rootScope.$on('speedChange', function (event, newSpeed) {
    console.log("new speed", newSpeed);
    speed = newSpeed;
  });

  Ant.prototype.clear = function () {
    this.tourIds = [];
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

  Ant.prototype.move = function (forcePresent) {
    if (forcePresent || Math.abs(this.ant.translation.x - (this.destination.x)) < speed && Math.abs(this.ant.translation.y - (this.destination.y)) < speed) {
      if (tourComplete.call(this)) {
        if (this.moveDone != null) this.moveDone.reject(); // no more moving!
        this.tourDone.resolve();
      }
      if (this.moveDone != null) this.moveDone.resolve();
      this.moveDone = null;
    } else {
      this.ant.translation.x = this.ant.translation.x + speed * this.cos;
      this.ant.translation.y = this.ant.translation.y + speed * this.sin;
    }
  };

  function tourComplete() {
    return this.currentIndex == this.nrOfCities - 1;
  }

  Ant.prototype.visitTownInvisible = function (city) {
    this.hide();
    markVisited.call(this, city);
  };

  Ant.prototype.visitTown = function (city) {
    if (this.ant === undefined) {
      this.ant = Two.interpret(document.querySelector('#ant')).center();
      this.ant.noStroke().fill = "#D00000";
      this.ant.scale = this.antImgScale;
    }
    this.ant.translation.set(city.x, city.y);
    this.ant.visible = true;
    markVisited.call(this, city);
  };

  function markVisited(city) {
    if (tourComplete.call(this)) {
      return;
    }
    this.currentIndex++;
    this.tour[this.currentIndex] = city;
    this.tourIds[this.currentIndex] = city.id;
    this.visited[city.id] = true;
  }

  Ant.prototype.currentCity = function () {
    return this.tour[this.currentIndex];
  };

  Ant.prototype.getTour = function () {
    return this.tourIds;
  };

  Ant.prototype.hasVisited = function (cityIndex) {
    return this.visited[cityIndex];
  };

  Ant.prototype.hide = function () {
    if (this.ant !== undefined) this.ant.visible = false;
  };

  return function (id, nrOfCities, antImgScale) {
    return new Ant(id, nrOfCities, antImgScale);
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
    var trails = Array.matrix(nrOfCities, nrOfCities, 0);
    _(nrOfCities).times(function (i) {
      _(nrOfCities).times(function (j) {
        trails[i][j] = initialPheromonAmount;
      });
    });
    return trails;
  }

  function initAnts(nrOfCities, nrOfAnts, antImgScale) {
    var ants = [];
    _(nrOfAnts).times(function (i) { ants[i] = Ant(i, nrOfCities, antImgScale)});
    return ants;
  }

  var AntColony = function ($scope, cities, nrOfAnts, algorithm, antImgScale) {
    this.nrOfCities = cities.length;
    this.cities = cities;
    this.distances = calculateDistances(cities);
    this.trails = initTrails(this.nrOfCities, 0.1);
    this.ants = initAnts(this.nrOfCities, nrOfAnts, antImgScale);
    this.algorithm = algorithm;
    this.evaporation = $scope.evaporation;
    this.Q = $scope.Q;
  };

  AntColony.prototype.setupAnts = function (skipDrawingAnts) {
    _.each(this.ants, function (ant) {
      ant.clear();
      if (skipDrawingAnts) ant.visitTownInvisible(this.cities[_.random(this.nrOfCities - 1)]);
      else ant.visitTown(this.cities[_.random(this.nrOfCities - 1)]);
    }, this);
  };

  AntColony.prototype.moveAnts = function (skipDrawingAnts) {
    var deferred = $q.defer();
    if (skipDrawingAnts) {
      this.moveWithoutDrawing();
      setTimeout(function() {deferred.resolve()}, 50);
    }
    else {
      this.moveWithDrawing(deferred);
    }
    return deferred.promise;
  };

  AntColony.prototype.moveWithoutDrawing = function () {
    for (var j = 0; j < this.nrOfCities; j++) {
      for (var i = 0, len = this.ants.length; i < len; i++) {
        var ant = this.ants[i];
        var selectNextTown = this.algorithm.selectNextTown(ant, this);
        if (selectNextTown === undefined) selectNextTown = ant.getTour()[0]; // back to first!
        ant.visitTownInvisible(this.cities[selectNextTown]);
      }
    }
  };

  AntColony.prototype.moveWithDrawing = function (deferred) {
    var promises = [];
    for (var i = 0, len = this.ants.length; i < len; i++) {
      var ant = this.ants[i];
      promises.push(ant.startTour());
      nextCity.call(this, ant);
    }

    this.intervalId = setInterval(drawMoving.bind(this), 20);
    var interval = this.intervalId;
    $q.all(promises).then(function() {
      clearInterval(interval);
      deferred.resolve();
    });
  };

  function nextCity(ant) {
    var selectNextTown = this.algorithm.selectNextTown(ant, this);
    if (selectNextTown === undefined) selectNextTown = ant.getTour()[0]; // back to first!
    var nextTown = this.cities[selectNextTown];
    var promise = ant.moveTo(nextTown);
    promise.then(nextCityRecursive.bind(this, ant, nextTown));
  }

  function nextCityRecursive (ant, nextTown) {
    ant.visitTown(nextTown);
    nextCity.call(this, ant);
  }

  var frameNumber = 0;
  var startTime = 0;
  var f = document.querySelector("#fps");

  function drawMoving() {
    f.innerHTML = getFPS();
    for (var i = 0, len = this.ants.length; i < len; i++) {
      this.ants[i].move();
    }
  }

  function getFPS() {
    frameNumber++;
    var d = new Date().getTime(),
        currentTime = (d - startTime) / 1000,
        result = Math.floor((frameNumber / currentTime));

    if (currentTime > 1) {
      startTime = new Date().getTime();
      frameNumber = 0;
    }
    return result;
  }


  AntColony.prototype.tourLength = function (tour) {
    var length = this.distances[tour[this.nrOfCities - 1]][tour[0]];
    for (var i = 0; i < this.nrOfCities - 1; i++) {
      length += this.distances[tour[i]][tour[i + 1]];
    }
    return length;
  };

  AntColony.prototype.stopAnts = function () {
    clearInterval(this.intervalId);
    for (var i = 0, len = this.ants.length; i < len; i++) {
      this.ants[i].hide();
    }
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

  return function($scope, cities, nrOfAnts, algorithm, antImgScale) {
    return new AntColony($scope, cities, nrOfAnts, algorithm, antImgScale);
  }
}]);

servicesModule.factory('AntSystemAlgorithm', [function () {
  var AntSystemAlgorithm = function(alpha, beta) {
    this.alpha = alpha;
    this.beta = beta;
  };

  function calculateProbabilites(ant, colony, alpha, beta) {
    var probabilities = [];
    var current = ant.currentCity().id;

    var denominator = 0.0;
    for (var next = 0; next < colony.nrOfCities; next++) {
      if (!ant.hasVisited(next))
        denominator += Math.pow(colony.trails[current][next], alpha) * Math.pow(1.0 / colony.distances[current][next], beta);
    }

    if (denominator > Number.MAX_VALUE) denominator = Number.MAX_VALUE;

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


  return function (alpha, beta) {
    return new AntSystemAlgorithm(alpha, beta);
  }
}]);
