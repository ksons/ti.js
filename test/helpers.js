var TI = require("..");
var parser = require('esprima');

module.exports = {
    parseAndInferenceExpression: function (code, opt) {
        opt = opt || {};
        var ast = parser.parse(code, {raw: true, loc: opt.loc || false});
        var aast = TI(ast);
        return aast.body[0].expression;
    }
}
