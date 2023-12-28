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

    class Operator {
        constructor(MashupPlatform, _) {
            this.MashupPlatform = MashupPlatform;

            this.builders = {
                // Alerts
                "Alert": this.renderAlert,

                // Civic Issue Tracking
                "Open311:ServiceRequest": this.renderServiceRequest,

                // Device
                "Device": this.renderDevice,

                // Environment
                "AirQualityObserved": this.renderAirQualityObserved,
                "NightSkyQuality": this.renderNightSkyQuality,
                "WaterQualityObserved": this.renderWaterQualityObserved,
                "NoiseLevelObserved": this.renderNoiseLevelObserved,

                // Indicators
                "KeyPerformanceIndicator": this.renderKeyPerformanceIndicator,

                // Parking
                "OffStreetParking": this.renderOffStreetParking,
                "OnStreetParking": this.renderOnStreetParking,

                // Parks & Gardens
                "Garden": this.renderGarden,

                // Point Of Interest
                "PointOfInterest": this.renderPointOfInterest,
                "Beach": this.renderBeach,
                "Museum": this.renderMuseum,

                // Street Lighting
                "Streetlight": this.renderStreetlight,
                "StreetlightGroup": this.renderStreetlightGroup,
                "StreetlightControlCabinet": this.renderStreetlightControlCabinet,

                // Transportation
                "Vehicle": this.renderVehicle,
                "BikeHireDockingStation": this.renderBikeHireDockingStation,

                // Waste Management
                "WasteContainer": this.renderWasteContainer,
                "WasteContainerIsle": this.renderWasteContainerIsle,

                // Weather
                "WeatherForecast": this.renderWeatherForecast,
                "WeatherObserved": this.renderWeatherObserved
            };

            this.units = {
                "GP": "µg/m³",
                "GQ": "mg/m³",
                "M1": "mg/l"
            };

            this.pollutants = [
                "CH4",
                "CO",
                "BEN",
                "EBE",
                "NO",
                "NO2",
                "NOx",
                "O3",
                "PM2.5",
                "PM10",
                "NHMC",
                "SO2",
                "TCH",
                "TOL"
            ];

            this.waterMeasures = [
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

            // Status priority list
            this.availableBikeStatus = ["outOfService", "withIncidence", "full", "almostFull"]; // Working is default one, so no need to have it here

            if (this.MashupPlatform != null) {
                this.MashupPlatform.wiring.registerCallback("entityInput", this.processIncomingData.bind(this));
            }
        }

        parseInputEndpointData(data) {
            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    throw new this.MashupPlatform.wiring.EndpointTypeError();
                }
            }

            if (data == null || typeof data !== "object") {
                throw new this.MashupPlatform.wiring.EndpointTypeError();
            }

            return data;
        };

        processIncomingData(entities) {
            entities = this.parseInputEndpointData(entities);

            if (!Array.isArray(entities)) {
                entities = [entities];
            }

            var pois = entities.map(this.processEntity.bind(this)).filter((poi) => {return poi != null;});
            this.MashupPlatform.wiring.pushEvent("poiOutput", pois);

        };

        processEntity(entity) {
            var coordinates = null;
            // Check if the entity is supported by this operator and log an error otherwise
            if (this.builders[entity.type] != undefined) {
                if (entity.location != null && typeof entity.location === "object") {
                    // GeoJSON format: longitude, latitude[, elevation]
                    // WireCloud: latitude and longitude
                    coordinates = {
                        system: "WGS84",
                        lng: parseFloat(entity.location.coordinates[0]),
                        lat: parseFloat(entity.location.coordinates[1])
                    };

                    return this.entity2poi(entity, coordinates);
                }
            } else {
                this.MashupPlatform.operator.log("Entity type is not supported: " + entity.type);
            }
        };

        entity2poi(entity, coordinates) {
            return this.builders[entity.type].bind(this)(entity, coordinates);
        };

        displayDate(date) {
            var d = date.split("/");

            if (d.length == 1) {
                return moment(d[0], null, this.MashupPlatform.context.get('language')).format('llll');
            } else if (d.length == 2) {
                return "From " + moment(d[0], null, this.MashupPlatform.context.get('language')).format('llll') + " to " + moment(d[1], null, this.MashupPlatform.context.get('language')).format('llll');
            }
        };

        processAddress(entity) {
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

        renderAirQualityObserved(entity, coordinates) {
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
                src: this.internalUrl('images/airquality/' + level + '.png')
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
                infoWindow: this.buildAirQualityObservedInfoWindow(entity),
                currentLocation: coordinates,
                location: entity.location,
                style: style
            };

            return poi;
        };

        renderNightSkyQuality(entity, coordinates) {
            var icon, level, style;

            if (!('skyMagnitude' in entity)) {
                level = "unknown";
                style = {
                    fill: "rgba(172, 172, 172, 0.1)",
                    stroke: "#acacac"
                };
            } else if (entity.skyMagnitude < 17.5) {
                level = "verydeficient";
                style = {
                    fill: "rgba(255, 0, 0, 0.3)",
                    stroke: "rgba(255, 0, 0, 0.9)"
                };
            } else if (entity.skyMagnitude < 18) {
                level = "deficient";
                style = {
                    fill: "rgba(255, 153, 0, 0.3)",
                    stroke: "rgba(255, 153, 0, 0.9)"
                };
            } else if (entity.skyMagnitude < 19) {
                level = "low";
                style = {
                    fill: "rgba(255, 255, 0, 0.3)",
                    stroke: "rgba(255, 255, 0, 0.9)"
                };
            } else if (entity.skyMagnitude < 20) {
                level = "moderate";
                style = {
                    fill: "rgba(0, 255, 0, 0.3)",
                    stroke: "rgba(0, 255, 0, 0.9)"
                };
            } else if (entity.skyMagnitude < 21) {
                level = "good";
                style = {
                    fill: "rgba(61, 133, 198, 0.3)",
                    stroke: "rgba(61, 133, 198, 0.9)"
                };
            } else if (entity.skyMagnitude < 21.4) {
                level = "verygood";
                style = {
                    fill: "rgba(28, 69, 135, 0.3)",
                    stroke: "rgba(28, 69, 135, 0.9)"
                };
            } else {
                level = "excellent";
                style = {
                    fill: "rgba(0, 0, 0, 0.3)",
                    stroke: "rgba(0, 0, 0, 0.9)"
                };
            }

            icon = {
                anchor: [0.5, 1],
                scale: 0.4,
                src: this.internalUrl('images/nightsky/' + level + '.png')
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
                infoWindow: this.buildNightSkyQualityInfoWindow(entity),
                currentLocation: coordinates,
                location: entity.location,
                style: style
            };

            return poi;
        };

        internalUrl(data) {
            var url = document.createElement("a");
            url.setAttribute('href', data);
            return url.href;
        };

        buildAirQualityObservedInfoWindow(entity) {
            var infoWindow = "<div>";

            infoWindow += this.processAddress(entity);

            var date = this.displayDate(entity.dateObserved);
            infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

            infoWindow += '<p><b><i class="fa fa-fw fa-feed"/> Source: </b> ' + entity.source +  "</p>";
            var measures = '<p><b><i class="fa fa-fw fa-list-ul"/> Measures</b>:</p><ul>';
            this.pollutants.forEach((pollutant) => {
                if (pollutant in entity) {
                    // TODO We are missing units, we cannot access this as it is on the "unitCode" attribute metadata
                    measures += '  <li><b>' + pollutant + '</b>: ' + (Math.round(entity[pollutant] * 100) / 100) + '</li>';
                }
            });
            measures += '</ul>';
            infoWindow += measures;
            infoWindow += "</div>";

            return infoWindow;
        };

        buildNightSkyQualityInfoWindow(entity) {
            var infoWindow = "<div>";

            infoWindow += this.processAddress(entity);

            var date = this.displayDate(entity.dateModified); // NightSkyQuality has no dateObserved
            infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

            infoWindow += '<p><b><i class="fa fa-fw fa-feed"/> Source: </b> ' + entity.source +  "</p>";
            var measures = '<p><b><i class="fa fa-fw fa-list-ul"/> Measures</b>:</p><ul>';

            var quality = "<i>Unknown</i>";
            if ('skyMagnitude' in entity) {
                quality = entity.skyMagnitude;
            }

            measures += '  <li><b>Quality</b>: ' + quality + ' ' + "mag•arcsec⁻²" + '</li>';
            measures += '</ul>';
            infoWindow += measures;
            infoWindow += "</div>";

            return infoWindow;
        };

        renderWaterQualityObserved(entity, coordinates) {
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
                src: this.internalUrl('images/waterquality/' + status + '.png')
            };

            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: entity.address || entity.id,
                infoWindow: this.buildWaterQualityObservedWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };


        buildWaterQualityObservedWindow(entity) {
            var infoWindow = "<div>";

            var date = this.displayDate(entity.dateObserved);
            infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

            if (entity.source) {
                infoWindow += '<p><b><i class="fa fa-fw fa-feed"/> Source: </b> ' + entity.source +  "</p>";
            }

            var measures = '<p><b><i class="fa fa-fw fa-list-ul"/> Measures</b>:</p><ul>';
            this.waterMeasures.forEach((measure) => {
                if (entity[measure.name]) {
                    measures += '  <li><b>' + measure.title + '</b>: ' + (Math.round(entity[measure.name] * 10000) / 10000) + ' ' + measure.unit + '</li>';
                }
            });
            measures += '</ul>';
            infoWindow += measures;

            var chems = '<p><b><i class="fa fa-fw fa-list-ul"/> Chemical agents</b>:</p><ul>';
            entity.measurand.forEach((pollutant_text) => {
                var data = pollutant_text.split(",");
                chems += '  <li><b>' + data[0] + '</b>: ' + (Math.round(data[1] * 1000) / 1000) + ' ' + this.units[data[2].trim()] + '</li>';
            });
            chems += '</ul>';
            infoWindow += chems;
            infoWindow += "</div>";

            return infoWindow;
        };

        renderNoiseLevelObserved(entity, coordinates) {
            var icon;

            icon = {
                anchor: [0.5, 1],
                scale: 0.4,
                src: this.internalUrl('images/noiselevel/noise.png')
            };

            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: entity.name || entity.id,
                infoWindow: this.buildNoiseLevelObservedWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildNoiseLevelObservedWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            var date = this.displayDate(entity.dateObserved);
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

        renderOffStreetParking(entity, coordinates) {
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
                src: this.internalUrl('images/parking/' + level + '.png')
            };
            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: entity.name || entity.id,
                infoWindow: this.buildOffStreetParkingInfoWindow(entity),
                currentLocation: coordinates,
                location: entity.location,
                style: style
            };

            return poi;
        };

        buildOffStreetParkingInfoWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }
            infoWindow += this.processAddress(entity);

            var date = moment(entity.dateModified, null, this.MashupPlatform.context.get('language')).format('llll');
            infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

            if (entity.availableSpotNumber != null && entity.totalSpotNumber != null) {
                infoWindow += '<p><i class="fa fa-fw fa-info"/> ' + entity.availableSpotNumber + ' available parking spots out of ' + entity.totalSpotNumber + '</p>';
            } else if (entity.availableSpotNumber) {
                infoWindow += '<p><i class="fa fa-fw fa-info"/> ' + entity.availableSpotNumber + ' available parking spots</p>';
            }

            infoWindow += "</div>";

            return infoWindow;
        };

        renderOnStreetParking(entity, coordinates) {
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
                src: this.internalUrl('images/parking/' + level + '.png')
            };
            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: entity.name || entity.id,
                infoWindow: this.buildOnStreetParkingInfoWindow(entity),
                currentLocation: coordinates,
                location: entity.location,
                style: style
            };

            return poi;
        };

        buildOnStreetParkingInfoWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }
            var date = moment(entity.dateModified, null, this.MashupPlatform.context.get('language')).format('llll');
            infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";

            if (entity.availableSpotNumber != null && entity.totalSpotNumber != null) {
                infoWindow += '<p><i class="fa fa-fw fa-info"/> ' + entity.availableSpotNumber + ' available parking spots out of ' + entity.totalSpotNumber + '</p>';
            } else if (entity.availableSpotNumber) {
                infoWindow += '<p><i class="fa fa-fw fa-info"/> ' + entity.availableSpotNumber + ' available parking spots</p>';
            }

            infoWindow += "</div>";

            return infoWindow;
        };

        renderPointOfInterest(entity, coordinates) {
            var icon = {
                anchor: [0.5, 1],
                scale: 0.4,
                src: this.internalUrl('images/poi/' + entity.category + '.png')
            };
            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: entity.name || entity.id,
                infoWindow: this.buildPointOfInterestInfoWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildPointOfInterestInfoWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }
            infoWindow += this.processAddress(entity);

            var date = moment(entity.dateModified, null, this.MashupPlatform.context.get('language')).format('llll');
            infoWindow += '<p><b><i class="fa fa-fw fa-clock-o"/> Date: </b> ' + date +  "</p>";
            infoWindow += "</div>";

            return infoWindow;
        };

        renderWeatherForecast(entity, coordinates) {
            var type;

            if (entity.weatherType) {
                type = entity.weatherType.replace(/ /g, '');
            } else {
                type = "weather";
            }

            var icon = {
                anchor: [0.5, 0.5],
                scale: 0.5,
                src: this.internalUrl('images/weather/' + type + '.png')
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
                infoWindow: this.buildWeatherForecastInfoWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildWeatherForecastInfoWindow(entity) {
            var infoWindow = "<div>";
            infoWindow += this.processAddress(entity);

            var date = moment(entity.dateObserved, null, this.MashupPlatform.context.get('language')).format('llll');
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

        renderBeach(entity, coordinates) {
            var icon, name;
            icon = {
                anchor: [0.5, 1],
                scale: 0.4,
                src: this.internalUrl('images/beach/' + (entity.occupationRate || "unknown") + '.png')
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
                infoWindow: this.buildBeachWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildBeachWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

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

        renderMuseum(entity, coordinates) {
            var icon, name;
            icon = {
                anchor: [0.5, 1],
                scale: 0.4,
                src: this.internalUrl('images/museum/museum.png')
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
                infoWindow: this.buildMuseumWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildMuseumWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

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

        renderWeatherObserved(entity, coordinates) {
            var type;

            if (entity.weatherType) {
                type = entity.weatherType.replace(/ /g, '');
            } else {
                type = "weather";
            }

            var icon = {
                anchor: [0.5, 0.5],
                scale: 0.5,
                src: this.internalUrl('images/weather/' + type + '.png')
            };
            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: entity.name || entity.stationName || entity.id,
                infoWindow: this.buildWeatherObservedInfoWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildWeatherObservedInfoWindow(entity) {
            var infoWindow = "<div>";
            infoWindow += this.processAddress(entity);

            var date = this.displayDate(entity.dateObserved);
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

        renderDevice(entity, coordinates) {
            var iconSrc;
            if (entity.category.length == 1) {
                iconSrc = this.internalUrl('images/devices/' + entity.category[0] + '.png')
            } else {
                iconSrc = this.internalUrl('images/devices/generic.png')
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
                infoWindow: this.buildDeviceWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildDeviceWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

            var date = moment(entity.dateModified, null, this.MashupPlatform.context.get('language')).format('llll');
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

        renderStreetlight(entity, coordinates) {
            var iconSrc;
            if (entity.status !== "ok") {
                iconSrc = this.internalUrl('images/streetlight/notworking.png');
            } else {
                if (entity.powerState === "off") {
                    iconSrc = this.internalUrl('images/streetlight/off.png');
                } else {
                    iconSrc = this.internalUrl('images/streetlight/on.png');
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
                infoWindow: this.buildStreetlightWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildStreetlightWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

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

        renderStreetlightGroup(entity, coordinates) {
            var iconSrc;
            if (entity.powerState === "on") {
                iconSrc = this.internalUrl('images/streetlight/on.png');
            } else {
                iconSrc = this.internalUrl('images/streetlight/off.png');
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
                infoWindow: this.buildStreetlightGroupWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildStreetlightGroupWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

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

        renderStreetlightControlCabinet(entity,coordinates) {
            var iconSrc;
            iconSrc = this.internalUrl('images/streetlight/cabinet.png');

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
                title: entity.id,
                infoWindow: this.buildStreetlightControlCabinetWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildStreetlightControlCabinetWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

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

        renderWasteContainer(entity, coordinates) {
            var iconSrc;

            if (entity.status === "ok") {
                iconSrc = this.internalUrl('images/waste/ok.png');
            } else {
                iconSrc = this.internalUrl('images/waste/bad.png');
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
                infoWindow: this.buildWasteContainerWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildWasteContainerWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

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

        renderWasteContainerIsle(entity, coordinates) {
            var icon = {
                anchor: [0.5, 1],
                scale: 0.4,
                src: this.internalUrl('images/waste/ok.png')
            };
            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: entity.name || entity.id,
                infoWindow: this.buildWasteContainerIsleWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildWasteContainerIsleWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

            if (entity.category) {
                infoWindow += '<p><i class="fa fa-fw fa-info"/> Isle features: ' + entity.features.join(", ") + '</p>';
            }

            if (entity.containers) {
                infoWindow += '<p><i class="fa fa-fw fa-info"/> Number of containers: ' + entity.containers.length + '</p>';
            }

            infoWindow += "</div>";

            return infoWindow;
        };

        renderServiceRequest(entity, coordinates) {
            var src;
            if (entity.status === "open") {
                src = this.internalUrl('images/civicissues/open.png');
            } else if (entity.status === "closed") {
                src = this.internalUrl('images/civicissues/closed.png');
            } else {
                src = this.internalUrl('images/civicissues/civicissues.png');
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
                infoWindow: this.buildServiceRequestWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildServiceRequestWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

            if (entity.status) {
                infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Request status:</b> ' + entity.status + ": " + entity.status_notes + '</p>';
            }

            if (entity.agency_responsible) {
                infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Responsible:</b> ' + entity.agency_responsible + '</p>';
            }

            infoWindow += "</div>";

            return infoWindow;
        };

        renderGarden(entity, coordinates) {
            var icon, name;

            name = entity.name;
            if (entity.alternateName) {
                name += " (" + entity.alternateName + ")";
            }
            icon = {
                anchor: [0.5, 1],
                scale: 0.4,
                src: this.internalUrl('images/garden/garden.png')
            };
            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: name || entity.id,
                infoWindow: this.buildGardenWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildGardenWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

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

        renderVehicle(entity, coordinates) {
            var icon, title, vehicleStatus;

            // serviceStatus is not required
            if (entity.serviceStatus == null || entity.serviceStatus.trim() == '') {
                vehicleStatus = 'onRoute';
            } else {
                vehicleStatus = entity.serviceStatus.split(",")[0];
            }

            icon = {
                anchor: [0.5, 1],
                scale: 0.4,
                src: this.internalUrl('images/vehicle/' + entity.vehicleType + "-" + vehicleStatus + '.png')
            };

            title = "";
            var id = entity.vehiclePlateIdentifier || entity.vehicleIdentificationNumber || null;
            if (entity.name) {
                title = entity.name + " (" + id + ")";
            } else {
                title = id;
            }

            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: title || entity.id,
                infoWindow: this.buildVehicleWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildVehicleWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

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

        renderBikeHireDockingStation(entity, coordinates) {
            var icon;
            var status = "working"

            // Search for the top priority icon-ready status
            if (entity.status) {
                this.availableBikeStatus.some((s) => {
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
                src: this.internalUrl('images/bikestation/' + status + '.png')
            };
            var poi = {
                id: entity.id,
                icon: icon,
                tooltip: entity.id,
                data: entity,
                title: entity.name || entity.id,
                infoWindow: this.buildBikeHireDockingStationWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildBikeHireDockingStationWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

            if (entity.status) {
                infoWindow += '<p><i class="fa fa-fw fa-info"/> <b>Status:</b> ' + entity.status.join(', ') + '</p>';
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

        renderKeyPerformanceIndicator(entity, coordinates) {
            var icon, src;

            // Get icon based on currentStanding
            src = this.internalUrl('images/kpi/' + (entity.currentStanding || "undefined").replace(/\s+/, '') + '.png');

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
                infoWindow: this.buildKeyPerformanceIndicatorWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildKeyPerformanceIndicatorWindow(entity) {
            var infoWindow = "<div>";

            if (entity.description != null) {
                infoWindow += '<p>' + entity.description + '</p>';
            }

            infoWindow += this.processAddress(entity);

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

        getAlertIconSubcategory(entity) {
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

        renderAlert(entity, coordinates) {

            var icon, src;
            // Get icon based on category and subcategory
            var severity = entity.serverity || "informational";
            if (severity === "critical") {
                severity = "high";
            }
            var subCategory = this.getAlertIconSubcategory(entity);
            src = this.internalUrl('images/alerts/' + entity.category + '/' + subCategory + '_' + severity + '.png');

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
                infoWindow: this.buildAlertWindow(entity),
                currentLocation: coordinates,
                location: entity.location
            };

            return poi;
        };

        buildAlertWindow(entity) {
            var infoWindow = "<div>";
            infoWindow += this.processAddress(entity);

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
    }

    window.CoNWeT_NGSI_Datamodel2POI_op = Operator

})();