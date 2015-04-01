var Error = require("./errors.js");

module.exports = {
    checkParamCount: function (node, name, allowed, is) {
        if (allowed.indexOf(is) == -1) {
            Error.throwError(node, "Invalid number of parameters for " + name + ", expected " + allowed.join(" or ") + ", found: " + is);
        }
    },

    allArgumentsAreStatic: function (args) {
        return args.every(function (arg) {
            return arg.hasStaticValue()
        });
    },

    allArgumentsCanNumber: function (args) {
        return args.every(function (arg) {
            return arg.canNumber();
        });
    }
};

