var Syntax = require('estraverse').Syntax;
var ANNO = require("./typeinfo.js").ANNO;


var UnaryFunctions = {
    "!": function (a) {
        return !a;
    }, "-": function (a) {
        return -a;
    }, "+": function (a) {
        return +a;
    }, "typeof": function (a) {
        return typeof a;
    }, "void": function (a) {
        return void a;
    }, "delete": function (a) {
        return true;
    }

};

var BinaryFunctions = {
    "+": function (a, b) {
        return a + b;
    }, "-": function (a, b) {
        return a - b;
    }, "/": function (a, b) {
        return a / b;
    }, "*": function (a, b) {
        return a * b;
    }, "%": function (a, b) {
        return a % b;
    },

    "==": function (a, b) {
        return a == b;
    }, "!=": function (a, b) {
        return a != b;
    }, "===": function (a, b) {
        return a === b;
    }, "!==": function (a, b) {
        return a !== b;
    }, "<": function (a, b) {
        return a < b;
    }, "<=": function (a, b) {
        return a <= b;
    }, ">": function (a, b) {
        return a > b;
    }, ">=": function (a, b) {
        return a >= b;
    }
};


/**
 *
 * @param node
 */
function getStaticValue(node, a, b) {
    if (node.type === Syntax.Literal) {
        var value = node.raw !== undefined ? node.raw : node.value;
        var number = parseFloat(value);
        if (!isNaN(number))
            return number;
        value = node.value;
        switch (value) {
            case "true":
                return true;
            case "false":
                return false;
            case "null":
                return null;
            default:
                return value;
        }
    }
    if (node.type == Syntax.MemberExpression || node.type == Syntax.CallExpression || node.type == Syntax.Identifier || node.type == Syntax.NewExpression || node.type == Syntax.LogicalExpression) {
        return ANNO(node).getStaticValue();
    }
    if (node.type === Syntax.UnaryExpression) {
        if (node.operator == "typeof") {
            return ANNO(node).getStaticValue();
        }
        if (UnaryFunctions.hasOwnProperty(node.operator)) {
            return UnaryFunctions[node.operator](a);
        }
        Shade.throwError(node, "Unknown unary operator: " + node.operator);
    }
    if (node.type === Syntax.BinaryExpression) {
        if (BinaryFunctions.hasOwnProperty(node.operator)) {
            return BinaryFunctions[node.operator](a, b);
        }
        Shade.throwError(node, "Unknown binary operator: " + node.operator);
    }
    Shade.throwError(node, "Evaluating static value for node type: " + node.type);
};


function getStaticTruthValue(node) {
    var aNode = ANNO(node);

    // !!undefined == false;
    if (aNode.isNullOrUndefined())
        return false;
    // !!{} == true
    if (aNode.isObject() || this.isFunction())
        return true;
    // In all other cases, it depends on the value,
    // thus we can only evaluate this for static objects
    if (aNode.hasStaticValue()) {
        return !!aNode.getStaticValue();
    }
    return undefined;
}

module.exports = {
    getStaticValue: getStaticValue, getStaticTruthValue: getStaticTruthValue
};




