var TI = require("..");
var parser = require('esprima');


function createScope(obj) {
    var result = TI.createStandardScope();
    for (var variable in obj) {
        result.declare(variable, obj[variable]);
    }
    return result;
}

module.exports = {
    parseAndInferenceExpression: function (code, scope, opt) {
        opt = opt || {};
        var ast = parser.parse(code, {raw: true, loc: opt.loc || false});
        var aast = TI(ast, {scope: createScope(scope)});
        return aast.body[0].expression;
    }

}
