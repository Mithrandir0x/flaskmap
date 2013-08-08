
(function(module){

    var directionsService = new google.maps.DirectionsService();
    
    module.service('Directions', function($q, $rootScope){
        this.route = function(origin, destination){
            var deferred = $q.defer();
            var request = {
                origin: new google.maps.LatLng(origin.latitude, origin.longitude),
                destination: new google.maps.LatLng(destination.latitude, destination.longitude),
                travelMode: google.maps.TravelMode.DRIVING
            };
            
            setTimeout(function(){
                directionsService.route(request, function(result, status){
                    if ( status == google.maps.DirectionsStatus.OK )
                    {
                        $rootScope.$apply(function(){
                            deferred.resolve(result);
                        });
                    }
                    else
                    {
                        $rootScope.$apply(function(){
                            deferred.reject(result);
                        });
                    }
                });
            }, 500);

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

    var getOV2Float = function(n){
        return ((n * 100000)|0) / 100000;
    };

    var createMarker = function($scope, poi){
        var marker = poi.marker;

        if ( !marker )
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

    var removeMarker = function(poi){
        if ( poi.marker )
        {
            poi.marker.setMap(null);
            google.maps.event.clearListeners(poi, 'dragend');
            poi.marker = undefined;
        }
    };

    function PoiEditorController($scope, $http, $q, $location, $rootScope)
    {
        $scope.containers = [];
        $scope.selectedContainer = null;
        $scope.selectedRoute = null;

        $scope.screen = {
            width: $(window).width(),
            height: $(window).height()
        };

        var context = 'poi';
        var savedSelectedContainer = null;

        var initializeUI = function(){
            var path = $location.path().split('/');

            if ( path[1] == context )
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

        $scope.createPoiContainer = function(){
            $http({method: 'POST', url: '/poi/'})
                .success(function(data){
                    var i = $scope.containers.push(data);
                    $scope.selectedContainer = $scope.containers[i - 1];
                    $location.path('/poi/' + $scope.selectedContainer.id);
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
                $scope.loading = false;
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
                    $location.path('/poi');
                }
            });
        };

        $scope.selectContainer = function(container){
            $scope.selectedContainer = container;
            $location.path('/poi/' + container.id);
            $scope.$emit('set-poi-path', container.id);
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

                createMarker($scope, $scope.selectedContainer.content[l]);
            }
        };

        $scope.deletePoi = function(i){
            $scope.selectedContainer.content[i].marker.setMap(null);
            $scope.selectedContainer.content.splice(i, 1);
        };

        $scope.sendPoiToRoute = function(poi, routeId){
            $rootScope.$broadcast('add-poi-route', poi, routeId);
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

        $scope.$on('map-double-click', function(event, mouseEvent, ctx){
            if ( ctx == context )
            {
                $scope.createPoi(mouseEvent);
            }
        });

        $scope.$on('context-changed', function(event, ctx){
            if ( ctx == context )
            {
                initializeUI();
            }
            else
            {
                // When changing to Route Editor, setting this to null will remove all
                // current markers from the poi list.
                $scope.selectedContainer = null;
            }
        });

        $scope.$on('set-route-path', function(event, path){
            $scope.selectedRoute = path;
        });

        $scope.$on('save-all-containers', function(){
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
                            content: getJSONValidPointArray(list.content)
                        }
                    })
                );
            }
            
            var promise = $q.all(promises);
            promise.then(
                function(){
                    noty({text: 'Se han guardado con éxito las ' + $scope.containers.length + ' listas.', type: 'success'});
                },
                function(){
                    noty({text: 'Ha habido un problema durante el guardado', type: 'error'});
                }
            );
        });

        $scope.$watch('selectedContainer', function(newContainer, oldContainer){
            if ( oldContainer )
            {
                oldContainer.content.forEach(function(poi){
                    removeMarker(poi);
                });
            }

            if ( newContainer )
            {
                newContainer.content.forEach(function(poi){
                    var marker = createMarker($scope, poi);

                    marker.setVisible(true);
                    marker.setTitle(poi.name);
                });   
            }
        });
    };

    function RouteEditorController($scope, $http, $location, $q, $rootScope, Directions)
    {
        $scope.loading = false;
        $scope.updatingRoute = true;
        $scope.routes = [];
        $scope.selectedRoute = null;

        var context = 'routes';
        var directionsRenderer = new google.maps.DirectionsRenderer();

        var searchRouteById = function(id){
            var route = $scope.routes.filter(function(e){
                return e.id == id;
            });

            if ( route && route.length != 0 ) {
                return route[0];
            } else {
                return null;
            }
        };

        var initializeUI = function(){
            var path = $location.path().split('/');

            if ( path[1] == context )
            {
                $scope.$emit('set-context', context);
                
                var route = searchRouteById(path[2]);
                if ( route )
                {
                    $scope.selectRoute(route);
                }
            }
        };

        $http({method: 'GET', url: '/route/'})
            .success(function(data){
                $scope.routes = data;

                initializeUI();

                if ( data.length == 1 ) {
                    noty({text: 'Se ha cargado ' + data.length + ' ruta.'});
                } else {
                    noty({text: 'Se han cargado ' + data.length + ' rutas.'});
                }
            });

        $scope.createRoute = function(){
            $http({method: 'POST', url: '/route/'})
                .success(function(data){
                    var i = $scope.routes.push(data);
                    $scope.selectedRoute = $scope.routes[i - 1];
                    $location.path('/routes/' + $scope.selectedRoute.id);
                });
        };

        $scope.selectRoute = function(route){
            $scope.selectedRoute = route;
            $location.path('/routes/' + route.id);
            $rootScope.$broadcast('set-route-path', route.id);
        };

        $scope.saveRoute = function(){
            $scope.loading = true;
            $http({
              method: 'PUT', 
              url: '/route/' + $scope.selectedRoute.id + '/', 
              data: {
                id: $scope.selectedRoute.id,
                name: $scope.selectedRoute.name,
                content: getJSONValidPointArray($scope.selectedRoute.content)
              }
            }).success(function(data){
                $scope.loading = false;
                noty({text: '"' + $scope.selectedRoute.name + '" se ha guardado correctamente.', type: 'success'});
            });
        };

        $scope.deleteRoute = function(){
            $scope.loading = true;
            $http({
              method: 'DELETE', 
              url: '/route/' + $scope.selectedRoute.id + '/'
            }).success(function(data){
                $scope.loading = false;
                var i = $scope.routes.indexOf($scope.selectedRoute);
                if ( i != -1 )
                {
                    $scope.selectedRoute = null;
                    $scope.routes.splice(i, 1);
                    $location.path('/routes');
                }
            });
        };

        var clearRoute = function(route){
            var rt = route ? route : $scope.selectedRoute;
            if ( rt != null )
            {
                var r = rt.content;
                r.forEach(function(wp){
                    removeMarker(wp);
                    if ( wp.directionsRenderer )
                    {
                        wp.directionsRenderer.setMap(null);
                    }
                });
            }
        };

        var updateRoute = function(){
            var r = $scope.selectedRoute.content,
                l = r.length,
                promises = [];

            $scope.updatingRoute = true;

            clearRoute();

            if ( l > 1 )
            {
                r.forEach(function(wp, i){
                    if ( i < l - 1 )
                    {
                        var q = Directions.route(wp, r[i + 1]);
                        
                        q.then(function(result, status){
                            wp.directionRoutes = result.routes;
                            wp.directionsRenderer = new google.maps.DirectionsRenderer({
                                directions: result,
                                map: $scope.gmap,
                                routeIndex: i,
                                markerOptions: {
                                    visible: false
                                }
                            });
                        });

                        promises.push(q);
                    }

                    var m = createMarker($scope, wp);
                    
                    google.maps.event.addListener(m, 'dragend', function(){
                        updateRoute();
                    });
                });

                var q = $q.all(promises);
                q.then(function(){
                    var distSum = 0;
                    r.forEach(function(wp){
                        wp.distance = distSum.toFixed(2);
                        if ( wp.directionRoutes && wp.directionRoutes.length > 0 )
                        {
                            distSum += wp.directionRoutes[0].legs[0].distance.value / 1000;
                        }
                    });
                }, function(result, status){
                    console.error('An error happened while trying to render the route');
                });
            }
        };

        $scope.createRouteWaypoint = function(mouseEvent){
            if ( $scope.selectedRoute )
            {
                var l = $scope.selectedRoute.content.length;
                $scope.selectedRoute.content.push({
                    name: 'Punto de ruta #' + l,
                    longitude: getOV2Float(mouseEvent.latLng.lng()),
                    latitude: getOV2Float(mouseEvent.latLng.lat())
                });
                
                updateRoute();

                $scope.$apply();
            }
        };

        $scope.toggleWaypointMetadata = function(wp){
            if ( wp )
            {
                if ( wp.showMeta ){
                    wp.showMeta = false;
                } else {
                    wp.showMeta = true;
                }
            }
            else
            {
                if ( $scope.selectedRoute.showMeta ){
                    $scope.selectedRoute.showMeta = false;
                } else {
                    $scope.selectedRoute.showMeta = true;
                }

                $scope.selectedRoute.content.forEach(function(wp){
                    wp.showMeta = $scope.selectedRoute.showMeta;
                });
            }
        };

        $scope.deleteRouteWaypoint = function(i){
            clearRoute();
            $scope.selectedRoute.content.splice(i, 1);
            updateRoute();
        };

        $scope.$on('context-changed', function(event, ctx){
            if ( ctx == context )
            {
                initializeUI();
            }
            else
            {
                $scope.selectedRoute = null;
            }
        });

        $scope.$watch('selectedRoute', function(newContainer, oldContainer){
            if ( oldContainer )
            {
                clearRoute(oldContainer);
            }

            if ( newContainer )
            {
                updateRoute();
            }
        });

        $scope.$on('map-double-click', function(event, mouseEvent, ctx){
            if ( ctx == context )
            {
                $scope.createRouteWaypoint(mouseEvent);
            }
        });

        $scope.$on('add-poi-route', function(event, poi, routeId){
            if ( routeId )
            {
                var route = searchRouteById(routeId);
                if ( route )
                {
                    route.content.push({
                        name: poi.name,
                        longitude: poi.longitude,
                        latitude: poi.latitude
                    });

                    noty({ text: 'Se ha copiado el punto "' + poi.name + '" en la lista "' + route.name + '".' });
                }
            }
        });
    }

    function FlaskMapController($scope, $http, $timeout, $q, $location)
    {
        $scope.location = $location;
        $scope.gmap = null;
        $scope.fullscreenMap = false;
        $scope.mapDisplayMode = '';
        $scope.context = 'main'

        $scope.pathPoiEditor = '';
        $scope.pathRouteEditor = '';

        $scope.PoiEditor = PoiEditorController;
        $scope.RouteEditor = RouteEditorController;

        $scope.emitMapDoubleClick = function(mouseEvent){
            $scope.$broadcast('map-double-click', mouseEvent, $scope.context);
        };

        $scope.panMapTo = function(poi){
            if ( $scope.gmap ) {
                $scope.gmap.panTo(new google.maps.LatLng(poi.latitude, poi.longitude));
            }
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

        $scope.$on('set-poi-path', function(event, path){
            $scope.pathPoiEditor = '/' + path;
        });

        $scope.$on('set-route-path', function(event, path){
            $scope.pathRouteEditor = '/' + path;
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
