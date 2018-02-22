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

        it("throws an Endpoint Value error if data is not valid JSON data", function () {
            expect(function () {
                processIncomingData("{a}");
            }).toThrowError(MashupPlatform.wiring.EndpointTypeError);
        });

        it("throws an Endpoint Type error if data is not a JSON object", function () {
            expect(function () {
                processIncomingData("5");
            }).toThrowError(MashupPlatform.wiring.EndpointTypeError);
        });

        it("throws an Endpoint Type error if data is not an object", function () {
            expect(function () {
                processIncomingData(5);
            }).toThrowError(MashupPlatform.wiring.EndpointTypeError);
        });

    });

})();
