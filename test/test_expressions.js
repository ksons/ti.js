var TI = require("..");
var should = require('should');
var helpers = require("./helpers.js");

var TYPES = TI.TYPES;
var parseAndInferenceExpression = helpers.parseAndInferenceExpression;

describe('Inference:', function () {
    describe('Expressions', function () {
        describe('Literals', function () {
            it("should annotate the type of an INT literal", function () {
                var exp = parseAndInferenceExpression("8");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.INT);
                exp.extra.should.have.property("staticValue", 8);
            });
            it("should annotate the type of a NUMBER literal", function () {
                var exp = parseAndInferenceExpression("7.0");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("staticValue", 7.0);
            });
            it("should annotate the type of a number literal", function () {
                var exp = parseAndInferenceExpression("7.2");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("staticValue", 7.2);
            });
            it("should annotate the type of a boolean literal", function () {
                var exp = parseAndInferenceExpression("true");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.BOOLEAN);
                exp.extra.should.have.property("staticValue", true);
            });
            it("should annotate the type of a string literal", function () {
                var exp = parseAndInferenceExpression("'Hallo'");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.STRING);
                exp.extra.should.have.property("staticValue", "Hallo");
            });
            it("should annotate the type of the 'undefined' literal", function () {
                var exp = parseAndInferenceExpression("undefined");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.UNDEFINED);
                exp.extra.should.not.have.property("staticValue");
            });

        });

        describe('UnaryExpressions', function () {
            it("should annotate !boolean => boolean", function () {
                var exp = parseAndInferenceExpression("!true");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.BOOLEAN);
                exp.extra.should.have.property("staticValue", false);
            });
            it("should annotate !number => boolean", function () {
                var exp = parseAndInferenceExpression("!8.5");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.BOOLEAN);
                exp.extra.should.have.property("staticValue", false);
            });
            it("should annotate !int => boolean", function () {
                var exp = parseAndInferenceExpression("!0");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.BOOLEAN);
                exp.extra.should.have.property("staticValue", true);
            });
            it("should annotate +int => int", function () {
                var exp = parseAndInferenceExpression("+8");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.INT);
                exp.extra.should.have.property("staticValue", 8);
            });
            it("should annotate -int => int", function () {
                var exp = parseAndInferenceExpression("-8");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.INT);
                exp.extra.should.have.property("staticValue", -8);
            });
            it("should annotate -number => number", function () {
                var exp = parseAndInferenceExpression("-8.0");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("staticValue", -8.0);
            });
            it("should annotate -boolean => int", function () {
                var exp = parseAndInferenceExpression("-true");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.INT);
                exp.extra.should.have.property("staticValue", -1);
            });
            it("should annotate typeof number => string", function () {
                var exp = parseAndInferenceExpression("typeof 5");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.STRING);
                exp.extra.should.have.property("staticValue", "number");
            });
        });

        describe('BinaryExpressions', function () {
            describe('with arithmetic operators', function () {
                it("should annotate int + int => int", function () {
                    var exp = parseAndInferenceExpression("8 + 8");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.INT);
                    exp.extra.should.have.property("staticValue", 16);
                });
                it("should annotate int + int => int", function () {
                    var exp = parseAndInferenceExpression("8 * 8");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.INT);
                    exp.extra.should.have.property("staticValue", 64);
                });
                it("should annotate int / int => number", function () {
                    var exp = parseAndInferenceExpression("8 / 16");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.NUMBER);
                    exp.extra.should.have.property("staticValue", 0.5);
                });
                it("should annotate number + int ⇒ number", function () {
                    var exp = parseAndInferenceExpression("8.4 + 8");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.NUMBER);
                    exp.extra.should.have.property("staticValue", 16.4);
                });
                it("should annotate int + number ⇒ number", function () {
                    var exp = parseAndInferenceExpression("8 + 8.4");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.NUMBER);
                    exp.extra.should.have.property("staticValue", 16.4);
                });
                it("should annotate number + number ⇒ number", function () {
                    var exp = parseAndInferenceExpression("8.2 + 8.4");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.NUMBER);
                    exp.extra.should.have.property("staticValue", 16.6);
                });
                it("should annotate number % number ⇒ number", function () {
                    var exp = parseAndInferenceExpression("5.5 % 1.0");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.NUMBER);
                    exp.extra.should.have.property("staticValue", 0.5);
                });

            });
            describe('with comparision operators', function () {
                it("should annotate exp == exp ⇒ boolean", function () {
                    var exp = parseAndInferenceExpression("8.2 == 8.4");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.BOOLEAN);
                    exp.extra.should.have.property("staticValue", false);
                });
                it("should annotate exp < exp ⇒ boolean", function () {
                    var exp = parseAndInferenceExpression("8.2 < 8.4");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.BOOLEAN);
                    exp.extra.should.have.property("staticValue", true);
                });
                it("should annotate undefined === number ⇒ boolean", function () {
                    var exp = parseAndInferenceExpression("undefined === 1.0");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.BOOLEAN);
                    exp.extra.should.have.property("staticValue", false);
                });
                it("should annotate undefined !== number ⇒ boolean", function () {
                    var exp = parseAndInferenceExpression("undefined !== 1.0");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.BOOLEAN);
                    exp.extra.should.have.property("staticValue", true);
                });
                it("should annotate undefined == number ⇒ boolean", function () {
                    var exp = parseAndInferenceExpression("undefined === 1.0");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.BOOLEAN);
                    exp.extra.should.have.property("staticValue", false);
                });
                it("should annotate undefined != number ⇒ boolean", function () {
                    var exp = parseAndInferenceExpression("undefined !== 1.0");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.BOOLEAN);
                    exp.extra.should.have.property("staticValue", true);
                });
                it("should annotate undefined > number ⇒ boolean", function () {
                    var exp = parseAndInferenceExpression("undefined > 1.0");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.BOOLEAN);
                    exp.extra.should.have.property("staticValue", false);
                });
                it("should annotate string == string ⇒ boolean (true)", function () {
                    var exp = parseAndInferenceExpression("'hallo' == 'hallo'");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.BOOLEAN);
                    exp.extra.should.have.property("staticValue", true);
                });
                it("should annotate string == string ⇒ boolean (false)", function () {
                    var exp = parseAndInferenceExpression("'hallo' == 'hallo2'");
                    exp.should.have.property("extra");
                    exp.extra.should.have.property("type", TYPES.BOOLEAN);
                    exp.extra.should.have.property("staticValue", false);
                });


            })
        });

        describe('LogicalExpressions', function () {
            it("should annotate T(a) == T(b) && T(b) != O: a && b ⇒ T(a)", function () {
                var exp = parseAndInferenceExpression("8.2 && 8.4");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
            });
            it("should annotate T(a) == undefined: a || b ⇒ T(b)", function () {
                var exp = parseAndInferenceExpression("undefined || 8");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.INT);
            });
            it("should annotate T(a) == undefined: a && b ⇒ undefined", function () {
                var exp = parseAndInferenceExpression("undefined && true");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.UNDEFINED);
            });
            it("should annotate T(a) == null: a && b ⇒ null", function () {
                var exp = parseAndInferenceExpression("null && true");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NULL);
            });
        });

        describe('ConditionalExpressions', function () {
            it("should annotate T(a) == T(b) && T(b) != O: c ? a : b ⇒ T(a)", function () {
                var exp = parseAndInferenceExpression("5 < 8 ? 4.5 : 3.5");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
            });
            it("should allow simple cast: T(a) == number, T(b) == int: c ? a : b ⇒ number", function () {
                var exp = parseAndInferenceExpression("5 < 8 ? 4.5 : 3");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
            });
            it("should annotate T(c) == undefined: c ? a : b ⇒ T(b)", function () {
                var exp = parseAndInferenceExpression("undefined ? null : 8");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.INT);
            });
        });


        /*describe('with Parameters form outside', function () {
         var exp = parseAndInferenceExpression("a + 5", { a: { type: TYPES.INT }});
         exp.should.have.property("extra");
         exp.extra.should.have.property("type", TYPES.INT);
         });*/
    })
});
