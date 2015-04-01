var inferExpression = require("./infer_expression.js");
var C = require("./constants.js");
var Scope = require("./scope.js");

var TI = function (ast, opt) {
    opt = opt || {};
    var scope = opt.scope || Scope.createStandardScope();
    return inferExpression(ast, scope);
};

TI.TYPES = C.TYPES;
TI.createStandardScope = Scope.createStandardScope;

module.exports = TI;
