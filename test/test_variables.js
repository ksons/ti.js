var TI = require("..");
var helpers = require("./helpers.js");

require('should');

var TYPES = TI.TYPES;
var parseAndInferenceExpression = helpers.parseAndInferenceExpression;

describe('Inference:', function () {
    describe('Variables,', function () {

        it("should throw if not declared", function () {
            var program = parseAndInferenceExpression.bind(null, "a");
            program.should.throw(/ReferenceError: a is not defined/);
        });

        it("should throw if only subset declared", function () {
            var program = parseAndInferenceExpression.bind(null, "a + b", {a: {type: TYPES.NUMBER}});
            program.should.throw(/ReferenceError: b is not defined/);
        });

        it("should not throw if declared", function () {
            var exp = parseAndInferenceExpression("a", {a: {type: TYPES.NUMBER}});
            exp.should.not.have.property("extra"); // Don't annotate indetifiers
        });

        it("unary expression is annotated", function () {
            var exp = parseAndInferenceExpression("+a", {a: {type: TYPES.NUMBER}});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.not.have.property("constantValue");
        });

        it("binary expression is annotated", function () {
            var exp = parseAndInferenceExpression("a + b", {a: {type: TYPES.NUMBER}, b: {type: TYPES.NUMBER }});
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.not.have.property("constantValue");
        });

    });
});
