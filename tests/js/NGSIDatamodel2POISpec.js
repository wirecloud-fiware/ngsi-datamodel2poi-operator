/* globals MashupPlatform, MockMP, beforeAll, afterAll, beforeEach */

(function () {

    "use strict";

    describe("NGSI Datamodel To PoI operator should", function () {

        var operator, abort_mock, entity_pages, entity_page_i;

        beforeAll(function () {
            window.MashupPlatform = new MockMP({
                type: 'operator',
                inputs: ['entityInput'],
                outputs: ['poiOutput']
            });
        });

        beforeEach(function () {
            MashupPlatform.reset();
        });

        it("throws an Endpoint Value error if data is not valid JSON data", () => {
            expect(function () {
                processIncomingData("{a}");
            }).toThrowError(MashupPlatform.wiring.EndpointTypeError);
        });

        it("throws an Endpoint Type error if data is not a JSON object", () => {
            expect(function () {
                processIncomingData("5");
            }).toThrowError(MashupPlatform.wiring.EndpointTypeError);
        });

        it("throws an Endpoint Type error if data is not an object", () => {
            expect(function () {
                processIncomingData(5);
            }).toThrowError(MashupPlatform.wiring.EndpointTypeError);
        });

        it("process empty lists", () => {
            processIncomingData([]);
            expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', []);
        });

        it("ignores entities without location", () => {
            processIncomingData([{"id": "1", "type": "OffStreetParking"}]);
            expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', []);
        });

        it("ignores entities using an unmanaged type", () => {
            processIncomingData([{
                "id": "1",
                "type": "MyType",
                "location": {
                    "coordinates": [-8.60961198807, 41.150691773],
                    "type": "Point"
                }
            }]);
            expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', []);
        });

        it("minimal Alert", () => {
            // Minimal Alert entity (including location)
            var entity = {
                "id": "1",
                "type": "Alert",
                "category": "traffic",
                "location": {
                    "type": "Point",
                    "coordinates": [
                        -3.712247222222222,
                        40.423852777777775
                    ]
                },
                "dateObserved": "2017-01-02T09:25:55.00Z",
                "alertSource": "https://account.lab.fiware.org/users/8"
            };

            processIncomingData([entity]);
            expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                "id": "1",
                "icon": jasmine.anything(),
                "tooltip": entity.id,
                "data": entity,
                "title": "Alert - traffic",
                "infoWindow": jasmine.anything(),
                "currentLocation": jasmine.anything(),
                "location": jasmine.anything(),
                // TODO "style": jasmine.anything()
            }]);
        });

        it("process Alert entities", () => {
            var entity = {
                "id": "VisualEvent123",
                "type": "Alert",
                "category": "security",
                "subCategory": "robbery",
                "location": {
                    "type": "Point",
                    "coordinates": [
                        -3.712247222222222,
                        40.423852777777775
                    ]
                },
                "dateObserved": "2017-04-25T09:25:55.00Z",
                "description": "Potential robbery in main building",
                "alertSource": "Camera1234",
                "data": {
                    "videoURL": "www.smartsecurity.com/video123.mp4",
                    "initialFrame": "80",
                    "finalFrame": "120"
                },
                "severity" : "informational"
            };

            processIncomingData([entity]);
        });

        describe("process AirQualityObserved entities", () => {

            it("permisive payload", () => {
                // Minimal, although not datamodel compliant, AirQualityObserved entity (including location)
                var entity = {
                    "id": "1",
                    "type": "AirQualityObserved",
                    "location":
                    {
                        "type": "Point",
                        "coordinates":
                        [
                            -3.712247222,
                            40.423852778
                        ]
                    },
                    "CO": 500
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                    "id": "1",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": entity.id,
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything(),
                    "style": jasmine.anything()
                }]);
            });

            it("minimal data", () => {
                // Minimal Alert entity (including location)
                var entity = {
                    "id": "1",
                    "type": "AirQualityObserved",
                    "dateObserved": "2016-11-28T12:00:00.00Z",
                    "location":
                    {
                        "type": "Point",
                        "coordinates":
                        [
                            -3.712247222,
                            40.423852778
                        ]
                    },
                    "CO": 500
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                    "id": "1",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": entity.id,
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything(),
                    "style": jasmine.anything()
                }]);
            });

        });

        describe("process NoiseLevelObserved entities", () => {

            it("permisive payload", () => {
                // Minimal, although not datamodel compliant, NoiseLevelObserved entity (including location)
                var entity = {
                    "id": "1",
                    "type": "NoiseLevelObserved",
                    "location":
                    {
                        "type": "Point",
                        "coordinates":
                        [
                            -3.712247222,
                            40.423852778
                        ]
                    },
                    "LAS": 91.6
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                    "id": "1",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": entity.id,
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything()
                }]);
            });

            it("minimal data", () => {
                // Minimal Alert entity (including location)
                var entity = {
                    "id": "1",
                    "type": "NoiseLevelObserved",
                    "dateObserved": "2016-11-28T12:00:00.00Z",
                    "location":
                    {
                        "type": "Point",
                        "coordinates":
                        [
                            -3.712247222,
                            40.423852778
                        ]
                    },
                    "LAS": 91.6
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                    "id": "1",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": entity.id,
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything()
                }]);
            });

        });

        it("minimal OffStreetParking", () => {
            var entity = {
                "id": "1",
                "type": "OffStreetParking",
                "location": {
                    "coordinates": [-8.60961198807, 41.150691773],
                    "type": "Point"
                },
                "name": "Parque de estacionamento Trindade",
                "category": ["public"],
                "allowedVehicleType": ["car"],
                "chargeType": ["temporaryPrice"],
                "requiredPermit": [],
                "occupancyDetectionType": ["none"]
            };

            processIncomingData([entity]);
            expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                "id": "1",
                "icon": jasmine.anything(),
                "tooltip": entity.id,
                "data": entity,
                "title": "Parque de estacionamento Trindade",
                "infoWindow": jasmine.anything(),
                "currentLocation": jasmine.anything(),
                "location": jasmine.anything(),
                "style": jasmine.anything()
            }]);
        });

        it("process OffStreetParking entities", () => {
            var entity = {
                "id": "1",
                "type": "OffStreetParking",
                "location": {
                    "coordinates": [-8.60961198807, 41.150691773],
                    "type": "Point"
                },
                "name": "Parque de estacionamento Trindade",
                "description": "Municipal car park located near the Trindade metro station and the Town Hall",
                "availableSpotNumber": 100,
                "address": {
                    "streetAddress": "Rua de Fernandes Tomás",
                    "addressLocality": "Porto",
                    "addressCountry": "Portugal"
                },
                "dateModified": "2016-06-02T09:25:55.00Z",
                "totalSpotNumber": 414,
                "category": ["public"],
                "allowedVehicleType": ["car"],
                "chargeType": ["temporaryPrice"],
                "requiredPermit": [],
                "occupancyDetectionType": ["none"]
            };

            processIncomingData([entity]);
        });

        describe("process Vehicle entities", () => {

            const test = (idattr, idvalue) => {
                return () => {
                    var entity = {
                        "id": "vehicle:WasteManagement:1",
                        "type": "Vehicle",
                        "vehicleType": "lorry",
                        "category": ["municipalServices"],
                        "location": {
                            "type": "Point",
                            "coordinates": [ -3.164485591715449, 40.62785133667262 ]
                        },
                        "name": "C Recogida 1",
                        "speed": 50,
                        "cargoWeight": 314,
                        "serviceStatus": "onRoute, garbageCollection",
                        "serviceProvided": ["gargabeCollection", "wasteContainerCleaning"],
                        "areaServed": "Centro",
                        "refVehicleModel": "vehiclemodel:econic"
                    };

                    entity[idattr] = idvalue;

                    processIncomingData([entity]);
                    expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                        "id": "vehicle:WasteManagement:1",
                        "icon": jasmine.anything(),
                        "tooltip": entity.id,
                        "data": entity,
                        "title": "C Recogida 1 (" + idvalue + ")",
                        "infoWindow": jasmine.anything(),
                        "currentLocation": jasmine.anything(),
                        "location": jasmine.anything()
                    }]);

                    var poi = MashupPlatform.wiring.pushEvent.calls.argsFor(0)[1][0];
                    expect(poi.infoWindow).not.toContain("undefined");
                };
            };

            it("using minimal required data", () => {
                var entity = {
                    "id": "vehicle:WasteManagement:1",
                    "type": "Vehicle",
                    "vehicleType": "lorry",
                    "category": ["municipalServices"],
                    "location": {
                        "type": "Point",
                        "coordinates": [ -3.164485591715449, 40.62785133667262 ]
                    },
                    "vehiclePlateIdentifier": "3456ABC"
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                    "id": "vehicle:WasteManagement:1",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": "3456ABC",
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything()
                }]);
            });

            it("using vehiclePlateIdentifier", test("vehiclePlateIdentifier", "3456ABC"));
            it("using vehicleIdentificationNumber", test("vehicleIdentificationNumber", "1M8GDM9AXKP042788"));
        });

        describe("process WaterQualityObserved entities", () => {

            it("permisive WaterQualityObserved", () => {
                // Minimal, although not datamodel compliant, WaterQualityObserved entity (including location)
                var entity = {
                    "id": "1",
                    "type": "WaterQualityObserved",
                    "location":
                    {
                        "type": "Point",
                        "coordinates":
                        [
                            -3.712247222,
                            40.423852778
                        ]
                    },
                    "pH": 7.4
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                    "id": "1",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": entity.id,
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything()
                }]);
            });

            it("minimal WaterQualityObserved", () => {
                // Minimal Alert entity (including location)
                var entity = {
                    "id": "1",
                    "type": "WaterQualityObserved",
                    "dateObservedFrom": "2016-11-28T12:00:00.00Z",
                    "dateObservedTo": "2016-11-28T13:00:00.00Z",
                    "location":
                    {
                        "type": "Point",
                        "coordinates":
                        [
                            -3.712247222,
                            40.423852778
                        ]
                    },
                    "pH": 7.4
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                    "id": "1",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": entity.id,
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything()
                }]);
            });

        });

        describe("process WeatherObserved entities", () => {

            it("permisive payload", () => {
                // Minimal, although not datamodel compliant, WeatherObserved entity (including location)
                var entity = {
                    "id": "1",
                    "type": "WeatherObserved",
                    "location":
                    {
                        "type": "Point",
                        "coordinates":
                        [
                            -3.712247222,
                            40.423852778
                        ]
                    },
                    "temperature": 22
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                    "id": "1",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": entity.id,
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything()
                }]);
            });

            it("minimal data", () => {
                // Minimal Alert entity (including location)
                var entity = {
                    "id": "1",
                    "type": "WeatherObserved",
                    "dateObserved": "2016-11-28T12:00:00.00Z",
                    "location":
                    {
                        "type": "Point",
                        "coordinates":
                        [
                            -3.712247222,
                            40.423852778
                        ]
                    },
                    "temperature": 22
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                    "id": "1",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": entity.id,
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything()
                }]);
            });

        });

        describe("process BikeHireDockingStation entities", () => {

            const test = (attributesToRemove) => {
                return () => {
                    var entity = {
                        "id": "malaga-bici-7",
                        "type": "BikeHireDockingStation",
                        "name": "07-Diputacion",
                        "location": {
                            "coordinates": [-4.43573, 36.699694],
                            "type": "Point"
                        },
                        "availableBikeNumber": 18,
                        "freeSlotNumber": 10,
                        "outOfServiceSlotNumber": 2,
                        "totalSlotNumber": 30,
                        "address": {
                            "streetAddress": "Paseo Antonio Banderas (Diputación)",
                            "addressLocality": "Málaga",
                            "addressRegion": "Málaga",
                            "addressCountry": "Spain"
                        },
                        "description": "Punto de alquiler de bicicletas próximo a Diputación",
                        "dateModified": "2017-05-09T09:25:55.00Z"
                    };

                    attributesToRemove.forEach((attr) => {
                        delete entity[attr];
                    });

                    processIncomingData([entity]);
                    expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', [{
                        "id": "malaga-bici-7",
                        "icon": jasmine.anything(),
                        "tooltip": entity.id,
                        "data": entity,
                        "title": entity.name,
                        "infoWindow": jasmine.anything(),
                        "currentLocation": jasmine.anything(),
                        "location": jasmine.anything()
                    }]);

                    var poi = MashupPlatform.wiring.pushEvent.calls.argsFor(0)[1][0];
                    expect(poi.infoWindow).not.toContain("undefined");
                };
            };

            it("using minimal required data", () => {
                var entity = {
                    "id": "malaga-bici-7",
                    "type": "BikeHireDockingStation",
                    "name": "07-Diputacion",
                    "location": {
                        "coordinates": [-4.43573, 36.699694],
                        "type": "Point"
                    }
                };

                processIncomingData([entity]);
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalledWith('poiOutput', jasmine.any(Array));

                var poi = MashupPlatform.wiring.pushEvent.calls.argsFor(0)[1][0];
                expect(poi).toEqual({
                    "id": "malaga-bici-7",
                    "icon": jasmine.anything(),
                    "tooltip": entity.id,
                    "data": entity,
                    "title": entity.name,
                    "infoWindow": jasmine.anything(),
                    "currentLocation": jasmine.anything(),
                    "location": jasmine.anything()
                });
                expect(poi.infoWindow).not.toContain("undefined");
            });

            it("fully filled", test([]));
            it("without totalSlotNumber", test(["totalSlotNumber"]));
        });

    });

})();
