/*
 * Copyright (c) 2017 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* globals moment */


(function () {

    "use strict";

    MashupPlatform.wiring.registerCallback("entityInput", function (entities) {
        if (entities === "string") {
            entities = JSON.parse(entities);
        }

        if (!Array.isArray(entities)) {
            entities = [entities];
        }
        var pois = entities.map(processEntity).filter((poi) => {return poi != null;});
        MashupPlatform.wiring.pushEvent("poiOutput", pois);
    });

    var processEntity = function processEntity(entity) {
        var coordinates = null;

        if (entity.location != null && typeof entity.location === "object") {
            // GeoJSON format: longitude, latitude[, elevation]
            // WireCloud: latitude and longitude
            coordinates = {
                system: "WGS84",
                lng: parseFloat(entity.location.coordinates[0]),
                lat: parseFloat(entity.location.coordinates[1])
            };

            return entity2poi(entity, coordinates);
        }
    };

    var entity2poi = function entity2poi(entity, coordinates) {
        return builders[entity.type](entity, coordinates);
    };

    var renderAirQualityObserved = function renderAirQualityObserved(entity, coordinates) {
        var icon, level, style;

        if (!('NO2' in entity)) {
            level = "unknown";
            style = {
                fill: "rgba(51, 51, 51, 0.1)",
                stroke: "#333333"
            };
        } else if (entity.NO2 <= 50) {
            level = "verylow";
            style = {
                fill: "rgba(121, 188, 106, 0.3)",
                stroke: "rgb(99, 112, 30)"
            };
        } else if (entity.NO2 <= 100) {
            level = "low";
            style = {
                fill: "rgba(187, 207, 76, 0.3)",
                stroke: "rgba(187, 207, 76, 0.9)"
            };
        } else if (entity.NO2 <= 200) {
            level = "moderate";
            style = {
                fill: "rgba(238, 194, 11, 0.3)",
                stroke: "rgba(238, 194, 11, 0.9)"
            };
        } else if (entity.NO2 <= 400) {
            level = "high";
            style = {
                fill: "rgba(242, 147, 5, 0.3)",
                stroke: "rgba(242, 147, 5, 0.9)"
            };
        } else {
            level = "veryhigh";
            style = {
                fill: "rgba(150, 0, 24, 0.3)",
                stroke: "rgba(150, 0, 24, 0.9)"
            };
        }

        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/airquality/' + level + '.png')
        };

        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.stationName + ' (' + entity.stationCode + ')',
            infoWindow: buildAirQualityObservedInfoWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location,
            style: style
        };

        return poi;
    };

    var internalUrl = function internalUrl(data) {
        var url = document.createElement("a");
        url.setAttribute('href', data);
        return url.href;
    };

    var units = {
        "GP": "µg/m³",
        "GQ": "mg/m³"
    };

    var buildAirQualityObservedInfoWindow = function buildAirQualityObservedInfoWindow(entity) {
        var infoWindow = "<div>";

        var date  = moment(entity.dateObserved, null, MashupPlatform.context.get('language')).format('llll');
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";
        infoWindow += '<p><b><i class="fa fa-fw fa-feed"/> Source: </b> ' + entity.source +  "</p>";
        var measures = '<p><b><i class="fa fa-fw fa-list-ul"/> Measures</b>:</p><ul>';
        entity.measurand.forEach((pollutant_text) => {
            var data = pollutant_text.split(",");
            measures += '  <li><b>' + data[0] + '</b>: ' + (Math.round(data[1] * 100) / 100) + ' ' + units[data[2]] + '</li>';
        });
        measures += '</ul>';
        infoWindow += measures;
        infoWindow += "</div>";

        return infoWindow;
    };

    var renderOffStreetParking = function renderOffStreetParking(entity, coordinates) {
        var icon, level, style;

        if (!('availableSpotNumber' in entity)) {
            level = "unknown";
            style = {
                fill: "rgba(51, 51, 51, 0.1)",
                stroke: "#333333"
            };
        } else if (entity.availableSpotNumber <= 5) {
            level = "veryhigh";
            style = {
                fill: "rgba(150, 0, 24, 0.3)",
                stroke: "rgba(150, 0, 24, 0.9)"
            };
        } else if (entity.availableSpotNumber <= 10) {
            level = "high";
            style = {
                fill: "rgba(242, 147, 5, 0.3)",
                stroke: "rgba(242, 147, 5, 0.9)"
            };
        } else if (entity.availableSpotNumber <= 20) {
            level = "moderate";
            style = {
                fill: "rgba(238, 194, 11, 0.3)",
                stroke: "rgba(238, 194, 11, 0.9)"
            };
        } else if (entity.availableSpotNumber <= 40) {
            level = "low";
            style = {
                fill: "rgba(121, 188, 106, 0.3)",
                stroke: "rgb(99, 112, 30)"
            };
        } else {
            level = "verylow";
            style = {
                fill: "rgba(121, 188, 106, 0.3)",
                stroke: "rgb(99, 112, 30)"
            };
        }
        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/parking/' + level + '.png')
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.name,
            infoWindow: buildOffStreetParkingInfoWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location,
            style: style
        };

        return poi;
    };

    var buildOffStreetParkingInfoWindow = function buildOffStreetParkingInfoWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }
        var  date  = moment(entity.dateModified, null, MashupPlatform.context.get('language')).format('llll');
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

        if (entity.availableSpotNumber != null && entity.totalSpotNumber != null) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> ' + entity.availableSpotNumber + ' available parking spots of ' + entity.totalSpotNumber + '</p>';
        } else if (entity.availableSpotNumber) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> ' + entity.availableSpotNumber + ' available parking spots</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderPointOfInterest = function renderPointOfInterest(entity, coordinates) {
        var icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/poi/' + entity.category + '.png')
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.name,
            infoWindow: buildPointOfInterestInfoWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildPointOfInterestInfoWindow = function buildPointOfInterestInfoWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        var  date  = moment(entity.dateModified, null, MashupPlatform.context.get('language')).format('llll');
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";
        infoWindow += "</div>";

        return infoWindow;
    };

    var renderWeatherObserved = function renderWeatherObserved(entity, coordinates) {
        var icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/weather/' + entity.category + '.png')
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.name,
            infoWindow: buildWeatherObservedInfoWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildWeatherObservedInfoWindow = function buildOffStreetParkingInfoWindow(entity) {
        var infoWindow = "<div>";

        var  date  = moment(entity.dateObserved, null, MashupPlatform.context.get('language')).format('llll');
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";
        infoWindow += "</div>";

        return infoWindow;
    };

    var builders = {
        "AirQualityObserved": renderAirQualityObserved,
        "OffStreetParking": renderOffStreetParking,
        "PointOfInterest": renderPointOfInterest,
        "WeatherObserved": renderWeatherObserved
    };

})();
