
(function(module){

    var dictionaries = {
        alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    };

    var simpleTextGenerator = function(l, dictionary){
        var text = "";

        if ( l == undefined )
            l = 16;

        for ( var i = 0; i < l; i++ )
            text += dictionary.charAt(Math.floor(Math.random() * dictionary.length));

        return text;
    };

    module.value('random', {
        text: function(l){
            return simpleTextGenerator(l, dictionaries.alpha.slice(0, -10));
        },
        number: function(l){
            return simpleTextGenerator(l, dictionaries.alpha.slice(52));
        },
        alphanumeric: function(l){
            return simpleTextGenerator(l, dictionaries.alpha);
        }
    });

    var directionsService = new google.maps.DirectionsService();

    module.service('DirectionsService', function($q){
        this.route = function(request){
            var deferred = $q.defer();
            
            directionsService.route(request, function(result, status){
                if ( status == google.maps.DirectionsStatus.OK )
                    deferred.resolve(result);
                else
                    deferred.reject(result);
            });

            return deferred.promise;
        };
    });

})(angular.module('flaskmap.services', []));

(function(module){

    module.directive('googlemap', function(){
        return {
            template: '<div id="map_canvas" style="height: 100%;"></div>',
            replace: true,
            transclude: true,
            restrict: 'E',
            scope: {
                mapToModel: '=',
                onDblclick: '='
            },
            link: function(scope, iElement){
                google.maps.visualRefresh = true;
                scope.mapToModel = new google.maps.Map(iElement[0], {
                    center: new google.maps.LatLng(-42.364890402363315, 171.836626953125),
                    zoom: 8,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                });

                if ( scope.onDblclick )
                    google.maps.event.addListener(scope.mapToModel, 'dblclick', scope.onDblclick);
            }
        };
    });

    module.directive('dropbox', function(){
        return {
            template: '<div class="dropbox" ng-transclude></div>',
            replace: true,
            transclude: true,
            restrict: 'E',
            scope: {
                allowedFiletypes: '@',
                onEnter: '=',
                onHover: '=',
                onLeave: '=',
                onEnd: '=',
                onDrop: '=',
                global: '@'
            },
            link: function(scope, iElement, attr){
                var stop = function(e){
                    e.stopPropagation();
                    e.preventDefault();
                };

                var parent = iElement.parent()[0];

                parent.addEventListener('dragenter', function(e){
                    iElement.css('display', 'block');
                    setTimeout(function(){iElement.addClass('hover');}, 10);

                    if ( scope.onEnter )
                        scope.onEnter(e);
                }, false);

                if ( scope.onHover )
                {
                    parent.addEventListener('dragover', function(e){
                        scope.onHover(e);
                    }, false);
                }

                parent.addEventListener('drop', function(e){
                    stop(e);
                    iElement.removeClass('hover');
                    iElement.css('display', 'none');
                    if ( scope.onDrop )
                    {
                        var ofiles = e.dataTransfer.files;
                        var ffiles = [];
                        for ( var i = 0, file = ofiles[0] ; i < ofiles.length ; i++, file = ofiles[i] )
                        {
                            // THIS HORRIBLE THING IS JUST BECAUSE FileList OBJECT CANNOT BE
                            // ITERATED ASYNCHRONOUSLY, SO I FETCH EVERY ELEMENT AVAILABLE AND
                            // PUSH IT TO AN ARRAY.
                            //
                            // MY APOLOGIES FOR USING CAPS-LOCK FOR THIS MESSAGE. CARRY ON.
                            ffiles.push(file);
                        }
                        scope.onDrop(ffiles, e);
                    }
                }, false);

                parent.addEventListener('dragleave', function(e){
                    if ( e.target == iElement[0] )
                    {
                        iElement.removeClass('hover');
                        setTimeout(function(){iElement.css('display', 'none');}, 300);

                        if ( scope.onLeave )
                            scope.onLeave(e);
                    }
                }, false);

                parent.addEventListener('dragend', function(e){
                    iElement.removeClass('hover');
                    iElement.css('display', 'none');
                    if ( scope.onEnd )
                            scope.onEnd(e);
                }, false);
            }
        };
    });

})(angular.module('flaskmap.directives', ['flaskmap.services']));

(function(module){

    function PoiEditorController($scope, $http, $timeout, $q, $location)
    {
        $scope.containers = [];
        $scope.selectedContainer = null;

        $scope.screen = {
            width: $(window).width(),
            height: $(window).height()
        };

        var context = 'poi';

        var getOV2Float = function(n){
            return ((n * 100000)|0) / 100000;
        };

        var getJSONValidPointArray = function(content){
            var a = [];
            content.forEach(function(poi){
                a.push({
                    name: poi.name,
                    longitude: poi.longitude,
                    latitude: poi.latitude
                });
            });

            return a;
        };

        var createMarker = function(poi){
            var marker = poi.marker;

            if ( marker === undefined )
            {
                marker = new google.maps.Marker({
                    position: new google.maps.LatLng(poi.latitude, poi.longitude),
                    map: $scope.gmap,
                    title: poi.name,
                    draggable: true
                });
                
                google.maps.event.addListener(marker, 'dragend', function(mouseEvent){
                    poi.latitude = getOV2Float(mouseEvent.latLng.lat());
                    poi.longitude = getOV2Float(mouseEvent.latLng.lng());

                    $scope.$apply();
                });
                
                poi.marker = marker;
            }

            return marker;
        };

        var autosave = function(){
            $scope.loading = true;
            var promises = [],
                i = $scope.containers.length;
            while ( i-- )
            {
                list = $scope.containers[i];
                promises.push(
                    $http({
                        method: 'PUT', 
                        url: '/poi/' + list.id + '/', 
                        data: {
                            id: list.id,
                            name: list.name,
                            content: list.content
                        }
                    })
                );
            }
            var promise = $q.all(promises);
            promise.then(
                function(){
                    noty({text: 'Guardado automático completado.', type: 'success'});
                },
                function(){
                    noty({text: 'Ha habido un problema durante el guardado', type: 'error'});
                }
            );

            $timeout(autosave, 60000);
        };

        //$timeout(autosave, 60000);

        var initializeUI = function(){
            var path = $location.path().split('/');

            if ( path[1] == 'poi' )
            {
                $scope.$emit('set-context', context);
                var container = $scope.containers.filter(function(e){
                    return e.id == path[2];
                });

                if ( container && container.length != 0 )
                {
                    $scope.selectContainer(container[0]);
                }
            }
        };

        $http({method: 'GET', url: '/poi/'})
            .success(function(data){
                $scope.containers = data;

                initializeUI();

                if ( data.length <= 0 ) {
                    noty({
                        text: 'Bienvenido a Flaskmap. No hay ninguna lista de puntos de' + 
                            ' interés, pero puedes agregar nuevas haciendo click a ' + 
                            '<i class="icon-file"></i>.', 
                        timeout: 10000,
                        type: 'information'
                    });
                }
                else if ( data.length == 1 ) {
                    noty({text: 'Se ha cargado ' + data.length + ' lista de puntos de interés.'});
                } else {
                    noty({text: 'Se han cargado ' + data.length + ' listas de puntos de interés.'});
                }
            });

        $scope.panMapTo = function(poi){
            if ( $scope.gmap ) {
                $scope.gmap.panTo(new google.maps.LatLng(poi.latitude, poi.longitude));
            }
        };

        $scope.createPoiContainer = function(){
            $http({method: 'POST', url: '/poi/'})
                .success(function(data){
                    var i = $scope.containers.push(data);
                    $scope.selectedContainer = $scope.containers[i - 1];
                });
        };

        $scope.savePoiContainer = function(){
            $scope.loading = true;
            $http({
              method: 'PUT', 
              url: '/poi/' + $scope.selectedContainer.id + '/', 
              data: {
                id: $scope.selectedContainer.id,
                name: $scope.selectedContainer.name,
                content: getJSONValidPointArray($scope.selectedContainer.content)
              }
            }).success(function(data){
                noty({text: '"' + $scope.selectedContainer.name + '" se ha guardado correctamente.', type: 'success'});
            });
        };

        $scope.deletePoiContainer = function(){
            $http({
              method: 'DELETE', 
              url: '/poi/' + $scope.selectedContainer.id + '/'
            }).success(function(data){
                var i = $scope.containers.indexOf($scope.selectedContainer);
                if ( i != -1 )
                {
                    $scope.selectedContainer = null;
                    $scope.containers.splice(i, 1);
                }
            });
        };

        $scope.selectContainer = function(container){
            $scope.selectedContainer = container;
            $location.path('/poi/' + container.id);
        };

        $scope.createPoi = function(mouseEvent){
            if ( $scope.selectedContainer )
            {
                var l = $scope.selectedContainer.content.length;
                $scope.selectedContainer.content.push({
                    name: 'POI #' + l,
                    longitude: getOV2Float(mouseEvent.latLng.lng()),
                    latitude: getOV2Float(mouseEvent.latLng.lat())
                });

                $scope.$apply();

                createMarker($scope.selectedContainer.content[l]);
            }
        };

        $scope.deletePoi = function(i){
            $scope.selectedContainer.content[i].marker.setMap(null);
            $scope.selectedContainer.content.splice(i, 1);
        };

        $scope.processDroppedElements = function(files){
            files.forEach(function(file){
                var reader = new FileReader();

                reader.onload = function(event){
                    var request = $http({
                        method: 'POST',
                        url: '/ov2/',
                        data:
                        {
                            name: file.name,
                            bin: event.target.result
                        }
                    });

                    request.success(function(data){
                        var i = $scope.containers.push(data);
                        $scope.selectedContainer = $scope.containers[i - 1];

                        noty({
                            text: 'Se ha subido el fichero [' + file.name + '] correctamente.', 
                            type: 'success'
                        });
                    });

                    request.error(function(){
                        noty({
                            text: 'No se ha podido subir el fichero [' + file.name + ']',
                            type: 'error'
                        });
                    });
                };

                reader.readAsDataURL(file);
            });
        };

        $scope.$on('map-double-click', function(event, mouseEvent){
            $scope.createPoi(mouseEvent);
        });

        $scope.$on('context-changed', function(event, ctx){
            if ( ctx == context )
            {
                initializeUI();
            }
        });

        $scope.$watch('selectedContainer', function(newContainer, oldContainer){
            if ( oldContainer )
            {
                oldContainer.content.forEach(function(poi){
                    poi.marker.setVisible(false);
                });
            }

            if ( newContainer )
            {
                newContainer.content.forEach(function(poi){
                    marker = createMarker(poi);

                    marker.setVisible(true);
                    marker.setTitle(poi.name);
                });   
            }
        });
    };

    function FlaskMapController($scope, $http, $timeout, $q, $location)
    {
        $scope.location = $location;
        $scope.gmap = null;
        $scope.fullscreenMap = false;
        $scope.mapDisplayMode = '';
        $scope.context = 'main'

        $scope.PoiEditor = PoiEditorController;

        $scope.emitMapDoubleClick = function(mouseEvent){
            $scope.$broadcast('map-double-click', mouseEvent);
        };

        $scope.toggleFullscreenMap = function(){
            $scope.fullscreenMap = !$scope.fullscreenMap;
            
            if ( $scope.fullscreenMap )
                $scope.mapDisplayMode = 'fullscreen';
            else
                $scope.mapDisplayMode = '';

            // It has to be done after the digest phase in angular :S
            $timeout(function(){ google.maps.event.trigger($scope.gmap, 'resize'); }, 500);
        };

        $scope.getMenuButtonClass = function(ctx){
            return $scope.context == ctx ? 'active' : '';
        };

        $scope.isContext = function(ctx){
            return $scope.context == ctx;
        };

        $scope.$on('set-context', function(event, ctx){
            $scope.context = ctx;
        });

        $scope.$watch('location.path()', function(p){
            var path = $location.path().split('/');
            $scope.context = path[1];
            $scope.$broadcast('context-changed', path[1]);
        });

        if ( $location.path() == '' )
            $location.path('/poi');
    };

    module.controller('FlaskMapController', FlaskMapController);

})(angular.module('flaskmap.controllers', ['flaskmap.services', 'flaskmap.directives']));

angular.module('flaskmap', ['flaskmap.services', 'flaskmap.directives', 'flaskmap.controllers'], function($locationProvider){
    console.log('Flaskmap running!');

    $locationProvider.html5Mode(false);

    $.noty.defaults.layout = 'bottomRight';
    $.noty.defaults.timeout = 2000; // DEFAULT 2s TIMEOUT FOR NOTIES 
});
