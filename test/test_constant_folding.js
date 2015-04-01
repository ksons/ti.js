var TI = require("..");
var helpers = require("./helpers.js");

require('should');

var TYPES = TI.TYPES;
var parseAndInferenceExpression = helpers.parseAndInferenceExpression;

describe('Constant folding:', function () {
    describe('Expressions,', function () {


        it("BinaryExpression", function () {
            var exp = parseAndInferenceExpression("5 + 8");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.INT);
            exp.extra.should.have.property("constantValue", 13);
        });

        it("UnaryExpression", function () {
            var exp = parseAndInferenceExpression("-8");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.INT);
            exp.extra.should.have.property("constantValue", -8);
        });

    });

    describe('Variables,', function () {
        it("UnaryExpression", function () {
            var exp = parseAndInferenceExpression("-a", {a: {type: TYPES.NUMBER, constantValue: 8}});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", -8);
        });

        it("BinaryExpression", function () {
            var exp = parseAndInferenceExpression("a + b", {a: {type: TYPES.NUMBER, constantValue: 8}, b: {type: TYPES.NUMBER, constantValue: 8 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 16);
        });

        it("UpdateExpression", function () {
            var exp = parseAndInferenceExpression("++a", {a: {type: TYPES.NUMBER, constantValue: 8}});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 9);
        });

        it("LogicalExpression (or)", function () {
            // Number left false
            var exp = parseAndInferenceExpression("a || b", {a: {type: TYPES.NUMBER, constantValue: 0}, b: {type: TYPES.NUMBER, constantValue: 5 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 5);

            // Number left true
            exp = parseAndInferenceExpression("a || b", {a: {type: TYPES.NUMBER, constantValue: 3}, b: {type: TYPES.NUMBER, constantValue: 5 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 3);

            // Object left false
            exp = parseAndInferenceExpression("a || b", {a: {type: TYPES.OBJECT, constantValue: null}, b: {type: TYPES.NUMBER, constantValue: 8 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 8);

            // Object left true
            exp = parseAndInferenceExpression("a || b", {a: {type: TYPES.OBJECT, constantValue: {} }, b: {type: TYPES.NUMBER, constantValue: 8 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.OBJECT);
            exp.extra.should.have.property("constantValue", {});

            // Object left dynamic => merge types
            exp = parseAndInferenceExpression("a || b", {a: {type: TYPES.NUMBER  }, b: {type: TYPES.BOOLEAN}});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.not.have.property("constantValue");


        });

        it("LogicalExpression (and)", function () {
            // Number left false
            var exp = parseAndInferenceExpression("a && b", {a: {type: TYPES.NUMBER, constantValue: 0}, b: {type: TYPES.NUMBER, constantValue: 5 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 0);

            // Number left false
            exp = parseAndInferenceExpression("a && b", {a: {type: TYPES.NUMBER, constantValue: 1}, b: {type: TYPES.NUMBER, constantValue: 5 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 5);

            // Object left false
            exp = parseAndInferenceExpression("a && b", {a: {type: TYPES.OBJECT, constantValue: null}, b: {type: TYPES.NUMBER, constantValue: 8 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.OBJECT);
            exp.extra.should.have.property("constantValue", null);

            // Object left true
            exp = parseAndInferenceExpression("a && b", {a: {type: TYPES.OBJECT, constantValue: {} }, b: {type: TYPES.NUMBER, constantValue: 8 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 8);

        });


        it("ConditionalExpression", function () {
            // Constant false
            var exp = parseAndInferenceExpression("a ? b : c", {a: {type: TYPES.NUMBER, constantValue: 0}, b: {type: TYPES.NUMBER, constantValue: 1 }, c: {type: TYPES.NUMBER, constantValue: 2 }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 2);

            // Constant true
            exp = parseAndInferenceExpression("a ? b : c", {a: {type: TYPES.OBJECT, constantValue: {}}, b: {type: TYPES.NUMBER, constantValue: 1 }, c: {type: TYPES.BOOLEAN, constantValue: false }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 1);

            // Dynamic, common type
            exp = parseAndInferenceExpression("a ? b : c", {a: {type: TYPES.NUMBER }, b: {type: TYPES.NUMBER, constantValue: 1 }, c: {type: TYPES.BOOLEAN, constantValue: false }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.not.have.property("constantValue");

            // Dynamic, incompatible type
            exp = parseAndInferenceExpression("a ? b : c", {a: {type: TYPES.NUMBER }, b: {type: TYPES.NUMBER, constantValue: 1 }, c: {type: TYPES.OBJECT }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.INVALID);
            exp.extra.should.have.property("error");
            exp.extra.should.not.have.property("constantValue");

        });
    });
});
