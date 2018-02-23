/*
 * Copyright (c) 2017 CoNWeT Lab., Universidad Politécnica de Madrid
 * Copyright (c) 2018 Future Internet Consulting and Development Solutions S.L.
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

    var parseInputEndpointData = function parseInputEndpointData(data) {
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                throw new MashupPlatform.wiring.EndpointTypeError();
            }
        }

        if (data == null || typeof data !== "object") {
            throw new MashupPlatform.wiring.EndpointTypeError();
        }

        return data;
    };

    var processIncomingData = function processIncomingData(entities) {
        entities = parseInputEndpointData(entities);

        if (!Array.isArray(entities)) {
            entities = [entities];
        }

        var pois = entities.map(processEntity).filter((poi) => {return poi != null;});
        MashupPlatform.wiring.pushEvent("poiOutput", pois);

    };

    var processEntity = function processEntity(entity) {
        var coordinates = null;
        // Check if the entity is supported by this operator and log an error otherwise
        if (builders[entity.type] != undefined) {
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
        } else {
            MashupPlatform.operator.log("Entity type is not supported: " + entity.type);
        }
    };

    var entity2poi = function entity2poi(entity, coordinates) {
        return builders[entity.type](entity, coordinates);
    };

    var displayDate = function displayDate(date) {
        var d = date.split("/");

        if (d.length == 1) {
            return moment(d[0], null, MashupPlatform.context.get('language')).format('llll');
        } else if (d.length == 2) {
            return "From " + moment(d[0], null, MashupPlatform.context.get('language')).format('llll') + " to " + moment(d[1], null, MashupPlatform.context.get('language')).format('llll');
        }
    };

    var processAddress = function processAddress(entity) {
        if (entity.address == null || typeof entity.address !== "object") {
            return "";
        }

        var infoWindow = '<p><b><i class="fa fa-fw fa-address-card-o"/> Address: </b><br/>';
        if (entity.address.streetAddress) {
            infoWindow += entity.address.streetAddress + '<br/>';
        }

        var line = [];
        if (entity.address.addressLocality) {
            line.push(entity.address.addressLocality);
        }
        if (entity.address.addressRegion) {
            line.push(entity.address.addressRegion);
        }
        if (entity.address.postalCode) {
            line.push(entity.address.postalCode);
        }

        if (line.length > 0) {
            infoWindow += line.join(', ') + '<br/>';
        }

        if (entity.address.addressCountry) {
            infoWindow += entity.address.addressCountry;
        }
        infoWindow += '</p>';

        return infoWindow;
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

        // Build tooltip title
        var title = "";
        if (entity.stationName) {
            title = entity.stationName;
            if (entity.stationCode) {
                title = " (" + entity.stationCode + ")";
            }
        }

        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: title || entity.id,
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
        "GQ": "mg/m³",
        "M1": "mg/l"
    };

    var buildAirQualityObservedInfoWindow = function buildAirQualityObservedInfoWindow(entity) {
        var infoWindow = "<div>";

        infoWindow += processAddress(entity);

        var date = displayDate(entity.dateObserved);
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

        infoWindow += '<p><b><i class="fa fa-fw fa-feed"/> Source: </b> ' + entity.source +  "</p>";
        var measures = '<p><b><i class="fa fa-fw fa-list-ul"/> Measures</b>:</p><ul>';
        entity.measurand.forEach((pollutant_text) => {
            var data = pollutant_text.split(",");
            measures += '  <li><b>' + data[0] + '</b>: ' + (Math.round(data[1] * 100) / 100) + ' ' + units[data[2].trim()] + '</li>';
        });
        measures += '</ul>';
        infoWindow += measures;
        infoWindow += "</div>";

        return infoWindow;
    };

    var renderWaterQualityObserved = function renderWaterQualityObserved(entity, coordinates) {
        var icon, status;

        // Check oxygen and pH levels for water statusw
        if ((entity.O2 && (entity.O2 < 4.0 || entity.O2 > 12.0)) || entity.pH && (entity.pH < 6.5 || entity.ph > 9.0)) {
            status = "bad";
        } else {
            status = "good";
        }

        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/waterquality/' + status + '.png')
        };

        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.address || entity.id,
            infoWindow: buildWaterQualityObservedWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var waterMeasures = [
        {name: "temperature", unit: "ºC", title: "Temperature"},
        {name: "conductivity", unit: "S/m", title: "Conductivity"},
        {name: "conductance", unit: "S/m", title: "Conductance"},
        {name: "tss", unit: "mg/L", title: "Total suspended solids"},
        {name: "tds", unit: "mg/L", title: "Total dissolved solids"},
        {name: "turbidity", unit: "FTU", title: "Turbidity"},
        {name: "salinity", unit: "ppt", title: "Salinity"},
        {name: "pH", unit: "", title: "pH"},
        {name: "orp", unit: "mV", title: "Oxidation-Reduction potential"}
    ];

    var buildWaterQualityObservedWindow = function buildWaterQualityObservedWindow(entity) {
        var infoWindow = "<div>";

        var date = displayDate(entity.dateObserved);
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

        if (entity.source) {
            infoWindow += '<p><b><i class="fa fa-fw fa-feed"/> Source: </b> ' + entity.source +  "</p>";
        }

        var measures = '<p><b><i class="fa fa-fw fa-list-ul"/> Measures</b>:</p><ul>';
        waterMeasures.forEach((measure) => {
            if (entity[measure.name]) {
                measures += '  <li><b>' + measure.title + '</b>: ' + (Math.round(entity[measure.name] * 10000) / 10000) + ' ' + measure.unit + '</li>';
            }
        });
        measures += '</ul>';
        infoWindow += measures;

        var chems = '<p><b><i class="fa fa-fw fa-list-ul"/> Chemical agents</b>:</p><ul>';
        entity.measurand.forEach((pollutant_text) => {
            var data = pollutant_text.split(",");
            chems += '  <li><b>' + data[0] + '</b>: ' + (Math.round(data[1] * 1000) / 1000) + ' ' + units[data[2].trim()] + '</li>';
        });
        chems += '</ul>';
        infoWindow += chems;
        infoWindow += "</div>";

        return infoWindow;
    };

    var renderNoiseLevelObserved = function renderNoiseLevelObserved(entity, coordinates) {
        var icon;

        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/noiselevel/noise.png')
        };

        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.name || entity.id,
            infoWindow: buildNoiseLevelObservedWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildNoiseLevelObservedWindow = function buildNoiseLevelObservedWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        var date = displayDate(entity.dateObserved);
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

        if (entity.sonometerClass != null) {
            infoWindow += '<p><b><i class="fa fa-fw fa-info"/> Sonometer class: </b> ' + entity.sonometerClass +  "</p>";
        }

        if (entity.measurand && entity.measurand.length > 0) {
            var measures = '<p><b><i class="fa fa-fw fa-list-ul"/> Acustic parameters</b>:</p><ul>';
            entity.measurand.forEach((measure) => {
                var data = measure.split("|");
                measures += '  <li><b>' + data[0] + '</b>: ' + (Math.round(data[1] * 100) / 100) + '</li>';
            });
            measures += '</ul>';
            infoWindow += measures;
        }

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
            title: entity.name || entity.id,
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
        var date = moment(entity.dateModified, null, MashupPlatform.context.get('language')).format('llll');
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

        if (entity.availableSpotNumber != null && entity.totalSpotNumber != null) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> ' + entity.availableSpotNumber + ' available parking spots out of ' + entity.totalSpotNumber + '</p>';
        } else if (entity.availableSpotNumber) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> ' + entity.availableSpotNumber + ' available parking spots</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderOnStreetParking = function renderOnStreetParking(entity, coordinates) {
        var icon, level, style;

        if (!('availableSpotNumber' in entity)) {
            level = "unknown";
            style = {
                fill: "rgba(51, 51, 51, 0.1)",
                stroke: "#333333"
            };
        } else if (entity.availableSpotNumber == 0) {
            level = "veryhigh";
            style = {
                fill: "rgba(150, 0, 24, 0.3)",
                stroke: "rgba(150, 0, 24, 0.9)"
            };
        } else if (entity.availableSpotNumber < 2) {
            level = "high";
            style = {
                fill: "rgba(242, 147, 5, 0.3)",
                stroke: "rgba(242, 147, 5, 0.9)"
            };
        } else if (entity.availableSpotNumber <= 5) {
            level = "moderate";
            style = {
                fill: "rgba(238, 194, 11, 0.3)",
                stroke: "rgba(238, 194, 11, 0.9)"
            };
        } else if (entity.availableSpotNumber <= 10) {
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
            title: entity.name || entity.id,
            infoWindow: buildOnStreetParkingInfoWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location,
            style: style
        };

        return poi;
    };

    var buildOnStreetParkingInfoWindow = function buildOnStreetParkingInfoWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }
        var date = moment(entity.dateModified, null, MashupPlatform.context.get('language')).format('llll');
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

        if (entity.availableSpotNumber != null && entity.totalSpotNumber != null) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> ' + entity.availableSpotNumber + ' available parking spots out of ' + entity.totalSpotNumber + '</p>';
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
            title: entity.name || entity.id,
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
        infoWindow += processAddress(entity);

        var date = moment(entity.dateModified, null, MashupPlatform.context.get('language')).format('llll');
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";
        infoWindow += "</div>";

        return infoWindow;
    };

    var renderWeatherForecast = function renderWeatherForecast(entity, coordinates) {
        var type;

        if (entity.weatherType) {
            type = entity.weatherType.replace(/ /g, '');
        } else {
            type = "weather";
        }

        var icon = {
            anchor: [0.5, 0.5],
            scale: 0.5,
            src: internalUrl('images/weather/' + type + '.png')
        };

        var title = "";
        if (entity.address != null && entity.address.addressLocality && entity.address.addressRegion) {
            title = entity.address.addressLocality + ' (' + entity.address.addressRegion + ')';
        } else if (entity.address != null && entity.address.addressLocality) {
            title = entity.address.addressLocality;
        }

        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: title || entity.id,
            infoWindow: buildWeatherForecastInfoWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildWeatherForecastInfoWindow = function buildWeatherForecastInfoWindow(entity) {
        var infoWindow = "<div>";
        infoWindow += processAddress(entity);

        var date = moment(entity.dateObserved, null, MashupPlatform.context.get('language')).format('llll');
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

        if (entity.temperature) {
            infoWindow += '<p><i class="fa fa-fw fa-thermometer-half"/> <b>Temperature:</b> ' + entity.temperature + 'ºC</p>';
        }

        if (entity.feelsLikeTemperature) {
            infoWindow += '<p><i class="fa fa-fw fa-thermometer-half"/> <b>Feels Like:</b> ' + entity.feelsLikeTemperature + 'ºC</p>';
        }

        if (entity.relativeHumidity) {
            infoWindow += '<p><i class="fa fa-fw fa-tint"/> <b>Humidity:</b> ' + entity.relativeHumidity * 100 + '%</p>';
        }

        if (entity.windSpeed) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Wind speed:</b> ' + entity.windSpeed + 'm/s</p>';
        }

        if (entity.windDirection) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Wind direction:</b> ' + entity.windDirection + 'º</p>';
        }

        if (entity.precipitationProbability) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Precipitation probability:</b> ' + entity.precipitationProbability * 100 + '%</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderBeach = function renderBeach(entity, coordinates) {
        var icon, name;
        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/beach/' + (entity.occupationRate || "unknown") + '.png')
        };

        name = entity.name;
        if (entity.alternateName) {
            name += " (" + entity.alternateName + ")";
        }

        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: name || entity.id,
            infoWindow: buildBeachWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildBeachWindow = function buildBeachWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.occupationRate) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Occupation rate: ' + entity.occupationRate + '</p>';
        }

        if (entity.beachType != null) {
            var characteristics = '<p><b><i class="fa fa-fw fa-list-ul"/> Beach characteristics</b>:</p><ul>';
            entity.beachType.forEach((characteristic) => {
                characteristics += '  <li>' + characteristic + '</li>';
            });
            characteristics += '</ul>';
            infoWindow += characteristics;
        }

        if (entity.facilities) {
            var facilities = '<p><b><i class="fa fa-fw fa-list-ul"/> Beach facilities</b>:</p><ul>';
            entity.facilities.forEach((facility) => {
                facilities += '  <li>' + facility + '</li>';
            });
            facilities += '</ul>';
            infoWindow += facilities;
        }

        if (entity.accessType) {
            var access = '<p><b><i class="fa fa-fw fa-list-ul"/> Beach access</b>:</p><ul>';
            entity.accessType.forEach((acc) => {
                access += '  <li>' + acc + '</li>';
            });
            access += '</ul>';
            infoWindow += access;
        }

        if (entity.length) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Length: ' + entity.length + 'm</p>';
        }
        if (entity.width) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Width: ' + entity.width + 'm</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderMuseum = function renderMuseum(entity, coordinates) {
        var icon, name;
        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/museum/museum.png')
        };

        name = entity.name;
        if (entity.alternateName) {
            name += " (" + entity.alternateName + ")";
        }

        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: name || entity.id,
            infoWindow: buildMuseumWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildMuseumWindow = function buildMuseumWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.artPeriod) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Art period:</b> ' + entity.artPeriod.join(", ") + '</p>';
        } else if (entity.historicalPeriod) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Occupation rate:</b> ' + entity.historicalPeriod.join(", ") + '</p>';
        }

        if (entity.museumType != null) {
            infoWindow += '<p><b><i class="fa fa-fw fa-list-ul"/> Museum type</b>:' + entity.museumType.join(", ") + '</p>';
        }

        if (entity.buildingType) {
            infoWindow += '<p><b><i class="fa fa-fw fa-list-ul"/> Building type</b>:' + entity.buildingType + '</p>';
        }

        if (entity.openingHoursSpecification) {
            var hours = '<p><b><i class="fa fa-fw fa-list-ul"/> Opening hours</b>:</p><ul>';
            entity.openingHoursSpecification.forEach((spec) => {
                hours += '  <li><b>' + spec.dayOfWeek + ': </b>' + spec.opens + ' - ' + spec.closes + '</li>';
            });
            hours += '</ul>';
            infoWindow += hours;
        }

        if (entity.facilities) {
            var facilities = '<p><b><i class="fa fa-fw fa-list-ul"/> Museum facilities</b>:</p><ul>';
            entity.facilities.forEach((fac) => {
                facilities += '  <li>' + fac + '</li>';
            });
            facilities += '</ul>';
            infoWindow += facilities;
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderWeatherObserved = function renderWeatherObserved(entity, coordinates) {
        var type;

        if (entity.weatherType) {
            type = entity.weatherType.replace(/ /g, '');
        } else {
            type = "weather";
        }

        var icon = {
            anchor: [0.5, 0.5],
            scale: 0.5,
            src: internalUrl('images/weather/' + type + '.png')
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.name || entity.stationName || entity.id,
            infoWindow: buildWeatherObservedInfoWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildWeatherObservedInfoWindow = function buildWeatherObservedInfoWindow(entity) {
        var infoWindow = "<div>";
        infoWindow += processAddress(entity);

        var date = displayDate(entity.dateObserved);
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

        if (entity.barometricPressure) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Pressure:</b> ' + entity.barometricPressure + 'hPa</p>';
        }
        if (entity.pressureTendency) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Pressure tendency:</b> ' + entity.pressureTendency + '</p>';
        }

        if (entity.temperature) {
            infoWindow += '<p><i class="fa fa-fw fa-thermometer-half"/> <b>Temperature:</b> ' + entity.temperature + 'ºC</p>';
        }

        if (entity.precipitation) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Precipitation:</b> ' + entity.precipitation + 'l/m<sup>2</sup></p>';
        }
        if (entity.relativeHumidity) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Humidity:</b> ' + entity.relativeHumidity * 100 + '%</p>';
        }

        if (entity.windSpeed) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Wind speed:</b> ' + entity.windSpeed + 'm/s</p>';
        }
        if (entity.windDirection) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Wind direction:</b> ' + entity.windDirection + 'º</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderDevice = function renderDevice(entity, coordinates) {
        var iconSrc;
        if (entity.category.length == 1) {
            iconSrc = internalUrl('images/devices/' + entity.category[0] + '.png')
        } else {
            iconSrc = internalUrl('images/devices/generic.png')
        }

        var icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: iconSrc
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.name || entity.id,
            infoWindow: buildDeviceWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildDeviceWindow = function buildDeviceWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        var date = moment(entity.dateModified, null, MashupPlatform.context.get('language')).format('llll');
        infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

        if (entity.value) {
            var measures = '<p><b><i class="fa fa-fw fa-list-ul"/> Values</b>:</p><ul>';
            var values = entity.value.split(";");
            values.forEach((val, i) => {
                // Skip malformed values
                if (val.split("=").length != 2) {
                    return;
                }
                measures += '  <li><b>' + entity.controlledProperty[i] || val.split("=")[0] + '</b>: ' + val.split("=")[1] + '</li>';
            });
            measures += '</ul>';
            infoWindow += measures;
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderStreetlight = function renderStreetlight(entity, coordinates) {
        var iconSrc;
        if (entity.status !== "ok") {
            iconSrc = internalUrl('images/streetlight/notworking.png');
        } else {
            if (entity.powerState === "off") {
                iconSrc = internalUrl('images/streetlight/off.png');
            } else {
                iconSrc = internalUrl('images/streetlight/on.png');
            }
        }

        var icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: iconSrc
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.areaServed || entity.id,
            infoWindow: buildStreetlightWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildStreetlightWindow = function buildStreetlightWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        var status;
        if (entity.status === "ok") {
            status = entity.powerState;
        } else {
            status = entity.status;
        }
        infoWindow += '<p><i class="fa fa-fw fa-info"/> Street light status: ' + status + '</p>';

        if (entity.locationCategory != null) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Location: ' + entity.locationCategory + '</p>';
        }

        if (entity.lanternHeight != null) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Height: ' + entity.lanternHeight + 'm </p>';
        }

        if (entity.illuminanceLevel != null) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Illuminance level: ' + entity.illuminanceLevel + '/1</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderStreetlightGroup = function renderStreetlightGroup(entity, coordinates) {
        var iconSrc;
        if (entity.powerState === "on") {
            iconSrc = internalUrl('images/streetlight/on.png');
        } else {
            iconSrc = internalUrl('images/streetlight/off.png');
        }

        var icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: iconSrc
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.areaServed || entity.id,
            infoWindow: buildStreetlightGroupWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildStreetlightGroupWindow = function buildStreetlightGroupWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        var status;
        if (entity.powerState) {
            status = entity.powerState;
        } else {
            status = "Unknown";
        }

        infoWindow += '<p><i class="fa fa-fw fa-info"/> Street light status: ' + status + '</p>';

        if (entity.switchingMode != null) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Switching mode: ' + entity.switchingMode.join(", ") + '</p>';
        }

        if (entity.illuminanceLevel != null) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Illuminance level: ' + entity.illuminanceLevel + '/1</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderStreetlightControlCabinet = function renderStreetlightControlCabinet(entity,coordinates) {
        var iconSrc;
        iconSrc = internalUrl('images/streetlight/cabinet.png');

        var icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: iconSrc
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.areaServed || entity.id,
            infoWindow: buildStreetlightControlCabinetWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildStreetlightControlCabinetWindow = function buildStreetlightControlCabinetWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.energyConsumed || entity.lastMeterReading) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Energy consumed: ' + entity.energyConsumed || entity.lastMeterReading + ' kW</p>';
        }

        if (entity.intensity) {
            var intensity = '<p><b><i class="fa fa-fw fa-list-ul"/> Intensity</b>:</p><ul>';

            Object.keys(entity.intensity).forEach((key) => {
                intensity += '  <li><b>' + key + ': </b>' + entity.intensity[key] + '</li>';
            });
            intensity += '</ul>';
            infoWindow += intensity;
        }

        if (entity.reactivePower) {
            var power = '<p><b><i class="fa fa-fw fa-list-ul"/> Intensity</b>:</p><ul>';

            Object.keys(entity.reactivePower).forEach((key) => {
                power += '  <li><b>' + key + ': </b>' + entity.reactivePower[key] + '</li>';
            });
            power += '</ul>';
            infoWindow += power;
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderWasteContainer = function renderWasteContainer(entity, coordinates) {
        var iconSrc;

        if (entity.status === "ok") {
            iconSrc = internalUrl('images/waste/ok.png');
        } else {
            iconSrc = internalUrl('images/waste/bad.png');
        }

        var icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: iconSrc
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.serialNumber || entity.id,
            infoWindow: buildWasteContainerWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildWasteContainerWindow = function buildWasteContainerWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.category) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Container type: ' + entity.category.join(", ") + '</p>';
        }

        if (entity.status) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Container status: ' + entity.status + '</p>';
        }

        if (entity.fillingLevel != null) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Filling level: ' + entity.fillingLevel * 100 + '%</p>';
        }



        infoWindow += "</div>";

        return infoWindow;
    };

    var renderWasteContainerIsle = function renderWasteContainerIsle(entity, coordinates) {
        var icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/waste/ok.png')
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.name || entity.id,
            infoWindow: buildWasteContainerIsleWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildWasteContainerIsleWindow = function buildWasteContainerIsleWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.category) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Isle features: ' + entity.features.join(", ") + '</p>';
        }

        if (entity.containers) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> Number of containers: ' + entity.containers.length + '</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderServiceRequest = function renderServiceRequest(entity, coordinates) {
        var src;
        if (entity.status === "open") {
            src = internalUrl('images/civicissues/open.png');
        } else if (entity.status === "closed") {
            src = internalUrl('images/civicissues/closed.png');
        } else {
            src = internalUrl('images/civicissues/civicissues.png');
        }
        var icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: src
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.service_name || entity.id,
            infoWindow: buildServiceRequestWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildServiceRequestWindow = function buildServiceRequestWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.status) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Request status:</b> ' + entity.status + ": " + entity.status_notes + '</p>';
        }

        if (entity.agency_responsible) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Responsible:</b> ' + entity.agency_responsible + '</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderGarden = function renderGarden(entity, coordinates) {
        var icon, name;

        name = entity.name;
        if (entity.alternateName) {
            name += " (" + entity.alternateName + ")";
        }
        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/garden/garden.png')
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: name || entity.id,
            infoWindow: buildGardenWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildGardenWindow = function buildGardenWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.category) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Category:</b> ' + entity.category.join(", ") + '</p>';
        }

        if (entity.style) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Garden style:</b> ' + entity.style + '</p>';
        }

        if (entity.openingHours) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Open hours:</b> ' + entity.openingHours + '</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderVehicle = function renderVehicle(entity, coordinates) {
        var icon, title;

        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/vehicle/' + entity.vehicleType + "-" + entity.serviceStatus.split(",")[0] + '.png')
        };

        title = "";
        var id = entity.vehiclePlateIdentifier || entity.vehicleIdentificationNumber || null;
        if (entity.name) {
            title = entity.name + "(" + id + ")";
        } else {
            title = id;
        }

        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: title || entity.id,
            infoWindow: buildVehicleWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildVehicleWindow = function buildVehicleWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.vehicleType) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Type:</b> ' + entity.vehicleType + '</p>';
        }

        if (entity.category) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Category:</b> ' + entity.category + '</p>';
        }

        if (entity.serviceProvided) {
            var services = '<p><b><i class="fa fa-fw fa-list-ul"/> Services provided</b>:</p><ul>';
            entity.serviceProvided.forEach((service) => {
                services += '  <li>' + service + '</li>';
            });
            services += '</ul>';
            infoWindow += services;
        }

        if (entity.serviceStatus) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Service status:</b> ' + entity.serviceStatus + '</p>';
        }

        if (entity.vehicleSpecialUsage) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Special usage:</b> ' + entity.vehicleSpecialUsage + '</p>';
        }

        if (entity.speed) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Speed:</b> ' + entity.speed + '</p>';
        }

        if (entity.cargoWeight) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Cargo weight:</b> ' + entity.cargoWeight + '</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    // Status priority list
    var availableBikeStatus = ["outOfService", "withIncidence", "full", "almostFull"]; // Working is default one, so no need to have it here

    var renderBikeHireDockingStation = function renderBikeHireDockingStation(entity, coordinates) {
        var icon;
        var status = "working"

        // Search for the top priority icon-ready status
        if (entity.status) {
            availableBikeStatus.some((s) => {
                if (entity.status.indexOf(s) != -1) {
                    status = s;
                    return true;
                } else {
                    return false;
                }
            });
        }

        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: internalUrl('images/bikestation/' + status + '.png')
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.name || entity.id,
            infoWindow: buildBikeHireDockingStationWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildBikeHireDockingStationWindow = function buildBikeHireDockingStationWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.status) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Status:</b> ' + entity.status + '</p>';
        }

        if (entity.availableBikeNumber) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Available bikes:</b> ' + entity.availableBikeNumber + '</p>';
        }

        if (entity.freeSlotNumber) {
            var extraInfo = "";
            if (entity.totalSlotNumber) {
                extraInfo = "/" + entity.totalSlotNumber;
            }

            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Free slots:</b> ' + entity.freeSlotNumber + extraInfo + '</p>';
        }

        if (entity.outOfServiceSlotNumber) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Out of service slots:</b> ' + entity.outOfServiceSlotNumber + '</p>';
        }

        if (entity.openingHours) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Open hours:</b> ' + entity.openingHours + '</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var renderKeyPerformanceIndicator = function renderKeyPerformanceIndicator(entity, coordinates) {
        var icon, src;

        // Get icon based on currentStanding
        src = internalUrl('images/kpi/' + (entity.currentStanding || "undefined").replace(/\s+/, '') + '.png');

        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: src
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: entity.name || entity.id,
            infoWindow: buildKeyPerformanceIndicatorWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildKeyPerformanceIndicatorWindow = function buildKeyPerformanceIndicatorWindow(entity) {
        var infoWindow = "<div>";

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        infoWindow += processAddress(entity);

        if (entity.currentStanding) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Standing:</b> ' + entity.currentStanding + '</p>';
        }

        if (entity.process || entity.product) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Evaluating:</b> ' + (entity.process || entity.product) + '</p>';
        }

        if (entity.kpiValue) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Value:</b> ' + entity.kpiValue + '</p>';
        }

        if (entity.dateModified) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Last calculation:</b> ' + entity.dateModified + '</p>';
        }

        if (entity.calculationFrequency) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Frequency:</b> ' + entity.calculationFrequency + '</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };

    var getAlertIconSubcategory = function getAlertIconSubcategory(entity) {
        var result = entity.subCategory;
        switch (entity.category) {
        case "traffic":
            // Icon
            if (result === "carWrongDirection" || result === "carStopped" || result === "injuredBiker") {
                result = "carAccident";
            }
            break;
        case "weather":
            if (result === "heatWave") {
                result = "highTemperature";
            }
            ;
            break;
        case "health":
            if (result === "bumpedPatient") {
                result = "fallenPatient";
            } else if (result === "tropicalCyclone" || result === "hurricane") {
                result = "tornado";
            }
            break;
        default: break;
        }

        return result;
    };

    var renderAlert = function renderAlert(entity, coordinates) {

        var icon, src;
        // Get icon based on category and subcategory
        var severity = entity.serverity || "informational";
        if (severity === "critical") {
            severity = "high";
        }
        var subCategory = getAlertIconSubcategory(entity);
        src = internalUrl('images/alerts/' + entity.category + '/' + subCategory + '_' + severity + '.png');

        icon = {
            anchor: [0.5, 1],
            scale: 0.4,
            src: src
        };
        var poi = {
            id: entity.id,
            icon: icon,
            tooltip: entity.id,
            data: entity,
            title: "Alert - " + entity.category,
            infoWindow: buildAlertWindow.call(this, entity),
            currentLocation: coordinates,
            location: entity.location
        };

        return poi;
    };

    var buildAlertWindow = function buildAlertWindow(entity) {
        var infoWindow = "<div>";
        infoWindow += processAddress(entity);

        if (entity.subCategory != null) {
            // Capitalize first letter and add spaces to undo the camelCase
            var msg = entity.subCategory.charAt(0).toUpperCase() + entity.subCategory.slice(1).replace(/([A-Z])/g, ' $1').trim()
            infoWindow += '<p><b>' + msg + '</b></p>';
        }

        if (entity.serverity) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Severity:</b> ' + entity.severity + '</p>';
        }

        if (entity.description != null) {
            infoWindow += '<p>' + entity.description + '</p>';
        }

        if (entity.dateObserved) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Date observed:</b> ' + entity.dateObserved + '</p>';
        }

        if (entity.alertSource) {
            infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Alert source:</b> ' + entity.alertSource + '</p>';
        }

        infoWindow += "</div>";

        return infoWindow;
    };



    var builders = {
        // Alerts
        "Alert": renderAlert,

        // Civic Issue Tracking
        "Open311:ServiceRequest": renderServiceRequest,

        // Device
        "Device": renderDevice,

        // Environment
        "AirQualityObserved": renderAirQualityObserved,
        "WaterQualityObserved": renderWaterQualityObserved,
        "NoiseLevelObserved": renderNoiseLevelObserved,

        // Indicators
        "KeyPerformanceIndicator": renderKeyPerformanceIndicator,

        // Parking
        "OffStreetParking": renderOffStreetParking,
        "OnStreetParking": renderOnStreetParking,

        // Parks & Gardens
        "Garden": renderGarden,

        // Point Of Interest
        "PointOfInterest": renderPointOfInterest,
        "Beach": renderBeach,
        "Museum": renderMuseum,

        // Street Lighting
        "Streetlight": renderStreetlight,
        "StreetlightGroup": renderStreetlightGroup,
        "StreetlightControlCabinet": renderStreetlightControlCabinet,

        // Transportation
        "Vehicle": renderVehicle,
        "BikeHireDockingStation": renderBikeHireDockingStation,

        // Waste Management
        "WasteContainer": renderWasteContainer,
        "WasteContainerIsle": renderWasteContainerIsle,

        // Weather
        "WeatherForecast": renderWeatherForecast,
        "WeatherObserved": renderWeatherObserved
    };


    /* TODO
     * this if is required for testing, but we have to search a cleaner way
     */
    if (window.MashupPlatform != null) {
        MashupPlatform.wiring.registerCallback("entityInput", processIncomingData);
    }

    /* test-code */
    window.processIncomingData = processIncomingData;
    /* end-test-code */

})();
