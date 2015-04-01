var TI = require("..");
var helpers = require("./helpers.js");

require('should');

var TYPES = TI.TYPES;
var parseAndInferenceExpression = helpers.parseAndInferenceExpression;


describe('Inference:', function () {
    describe('Object Registry', function () {
        describe('for Math object', function () {
            it("constant Math.PI ? number", function () {
                var exp = parseAndInferenceExpression("Math.PI");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("constantValue", Math.PI);

            });
            it("access unknown property ? undefined", function () {
                var exp = parseAndInferenceExpression("Math.XPI");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.UNDEFINED);
            });
            it("call Math.cos(number) ? number", function () {
                var exp = parseAndInferenceExpression("Math.cos(0.0)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("constantValue", 1);
            });
            it("call Math.atan2(number,number) ? number", function () {
                var exp = parseAndInferenceExpression("Math.atan2(Math.PI, 0)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("constantValue", Math.PI / 2);
            });
            it("call Math.min(number,number,...) ? number", function () {
                var exp = parseAndInferenceExpression("Math.min(Math.PI, 4, -1)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("constantValue", -1);
            });
            it("call Math.floor(number) ? number", function () {
                var exp = parseAndInferenceExpression("Math.floor(5.5)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("constantValue", 5);
            });
            it("Math.cos(number, number): ignore additional parameters", function () {
                var exp = parseAndInferenceExpression("Math.cos(0.0, 2.0)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("constantValue", 1);
            });
            it("Math.cos(string) ? throw invalid parameters type", function () {
                var exp = parseAndInferenceExpression("Math.cos('hallo')");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.INVALID);
            });
            it("throws for unknown method", function () {
                var evaluation = parseAndInferenceExpression.bind(undefined, "Math.foo(5.0)");
                evaluation.should.throw(/undefined is not a function/);
            });
            it("throws calling a property", function () {
                var evaluation = parseAndInferenceExpression.bind(undefined, "Math.PI()");
                evaluation.should.throw(/number is not a function/);
            });
        });
    });

});
