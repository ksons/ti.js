// Dependencies
//var evaluator = require("../constants/evaluator.js");
var assert = require("assert");
var C = require("./constants.js");
var estraverse = require('estraverse');
var ErrorHandler = require("./errors.js");
var ANNO = require("./typeinfo").ANNO;
var codegen = require('escodegen');
var evaluator = require("./evaluator.js");
var Scope = require("./scope");

// Shortcuts
var Syntax = estraverse.Syntax;
var TYPES = C.TYPES, generateErrorInformation = ErrorHandler.generateErrorInformation, ERROR_TYPES = ErrorHandler.ERROR_TYPES;
var throwError = ErrorHandler.throwError;

var debug = false;


function getTypeInfo(scope, node) {
    if (Array.isArray(node)) {
        return node.map(function (arg) {
            return getTypeInfo(scope, arg);
        });
    }
    return ANNO(node);
}


var handlers = {

    ArrayExpression: function (node, scope) {
        var result = ANNO(node), elements = getTypeInfo(scope, node.elements), elementType = ANNO({});

        result.setType(TYPES.ARRAY);
        elements.forEach(function (element, index) {
            if (!index) {
                elementType.copy(element);
            } else {
                if (!elementType.setCommonType(elementType, element)) {
                    result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "shade.js does not support inhomogenous arrays: [", elements.map(function (e) {
                        return e.getTypeString()
                    }).join(", "), "]"));
                }
            }
        });
    },

    /**
     * @param node
     */
    Literal: function (node) {
        var value = node.raw !== undefined ? node.raw : node.value, result = ANNO(node);

        var number = parseFloat(value);
        if (!isNaN(number)) {
            if (value.toString().indexOf(".") == -1) {
                result.setType(TYPES.INT);
            } else {
                result.setType(TYPES.NUMBER);
            }
        } else if (value === 'true' || value === 'false') {
            result.setType(TYPES.BOOLEAN);
        } else if (value === 'null') {
            result.setType(TYPES.NULL);
        } else {
            result.setType(TYPES.STRING);
        }
        if (!result.isNull()) {
            result.setStaticValue(evaluator.getStaticValue(node));
        }
    },

    /**
     * ExpressionStatement: Just copy the result from the actual expression
     */
    ExpressionStatement: function (node) {
        var result = ANNO(node), expression = ANNO(node.expression);
        result.copy(expression);
    },


    /**
     * ReturnStatement: If return has an argument, copy the TypeInfo
     * form the argument, otherwise it's undefined. Inform the scope on
     * the return type of this return branch.
     */
    ReturnStatement: function (node, scope) {
        var result = ANNO(node), argument = getTypeInfo(scope, node.argument);

        if (argument) {
            result.copy(argument);
        } else {
            result.setType(TYPES.UNDEFINED);
        }
        scope.updateReturnInfo(result);
    },

    /**
     * NewExpression: Find the type of the Callee from
     * the scope and evaluate based on annotated parameters
     */
    NewExpression: function (node, scope) {
        var result = ANNO(node), staticValue;

        // Be on the safe side, assume result is static independently of former annotations
        result.setDynamicValue();

        var entry = scope.getBindingByName(node.callee.name);
        if (entry && entry.hasConstructor()) {
            var constructor = entry.getConstructor();
            var args = getTypeInfo(scope, node.arguments);
            try {
                var extra = constructor.evaluate(result, args, scope);
                result.setFromExtra(extra);
            } catch (e) {
                result.setInvalid(e);
                return;
            }
            if (constructor.computeStaticValue) {
                try {
                    staticValue = constructor.computeStaticValue(result, getTypeInfo(scope, node.arguments), scope);
                    if (staticValue !== undefined) {
                        result.setStaticValue(staticValue);
                    }
                } catch (e) {
                    result.setDynamicValue();
                }
            }
        } else {
            result.setInvalid(generateErrorInformation(node, ERROR_TYPES.REFERENCE_ERROR, node.callee.name, "is not defined"));
        }
    },


    /**
     * UnaryExpression
     */
    UnaryExpression: function (node, scope) {
        var result = ANNO(node), argument = getTypeInfo(scope, node.argument), operator = node.operator;

        //noinspection FallthroughInSwitchStatementJS
        switch (operator) {
            case "!":
                result.setType(TYPES.BOOLEAN);
                if (argument.canObject()) {
                    result.setStaticValue(false); // !obj == false
                    return;
                }
                break;
            case "+":
            case "-":
                if (argument.canInt()) {
                    result.setType(TYPES.INT);
                } else if (argument.canNumber()) {
                    result.setType(TYPES.NUMBER);
                } else {
                    result.setInvalid(generateErrorInformation(node, ERROR_TYPES.NAN_ERROR));
                }
                break;
            case "typeof":
                result.setType(TYPES.STRING);
                if (argument.isValid())
                    result.setStaticValue(argument.getJavaScriptTypeString());
                return;

            case "~":
            case "void":
            case "delete":
            default:
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, operator, "is not supported."));
        }
        if (argument.hasStaticValue()) {
            result.setStaticValue(evaluator.getStaticValue(node));
        } else {
            result.setDynamicValue();
        }
    },

    /**
     * 'Undefined' is an identifier. Variables, names of functions and
     * member properties are handled within parent expressions
     */
    Identifier: function (node) {
        if (node.name === "undefined") {
            ANNO(node).setType(TYPES.UNDEFINED);
        }
    },

    /**
     * BinaryExpression
     */
    BinaryExpression: function (node, scope) {
        //console.log(node.left, node.right);
        var left = getTypeInfo(scope, node.left), right = getTypeInfo(scope, node.right), result = ANNO(node), operator = node.operator, value;

        if (!(left.isValid() && right.isValid())) {
            result.setInvalid();
            return;
        }

        //noinspection FallthroughInSwitchStatementJS
        switch (operator) {
            case "+":
            case "-":
            case "*":
            case "/":
            case "%":
                // int 'op' int => int
                // int / int => number
                if (left.canInt() && right.canInt()) {
                    if (operator == "/")
                        result.setType(TYPES.NUMBER); else
                        result.setType(TYPES.INT);
                }
                // int 'op' number => number
                else if (left.canInt() && right.isNumber() || right.canInt() && left.isNumber()) {
                    result.setType(TYPES.NUMBER);
                }
                // number 'op' number => number
                else if (left.isNumber() && right.isNumber()) {
                    result.setType(TYPES.NUMBER);
                    // int 'op' null => int
                } else if (left.isInt() && right.isNull() || right.isInt() && left.isNull()) {
                    result.setType(TYPES.INT);
                }
                // number 'op' null => number
                else if ((left.isNumber() && right.isNull()) || (right.isNumber() && left.isNull())) {
                    result.setType(TYPES.NUMBER);
                } else {
                    // NaN

                    var message = "";
                    // Special handling for undefined, as this is the main reason for this error
                    if (left.isNullOrUndefined()) {
                        message = codegen.generate(node.left) + " is undefined";
                    } else if (right.isNullOrUndefined()) {
                        message = codegen.generate(node.right) + " is undefined";
                    }
                    result.setInvalid(generateErrorInformation(node, ERROR_TYPES.NAN_ERROR, message));
                }
                break;
            case "===":
            case "!==":
                result.setType(TYPES.BOOLEAN);
                if (left.isUndefined() || right.isUndefined()) {
                    value = left.isUndefined() && right.isUndefined();
                    result.setStaticValue(operator == "===" ? value : !value);
                    return;
                }
                break;
            case "==": // comparison
            case "!=":
            case ">":
            case "<":
            case ">=":
            case "<=":
                result.setType(TYPES.BOOLEAN);
                if (left.isUndefined() || right.isUndefined()) {
                    value = left.isUndefined() && right.isUndefined();
                    result.setStaticValue(operator == "!=" ? !value : value);
                    return;
                }
                break;
            default:
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, operator, "is not supported."));
                return;
        }
        if (left.hasStaticValue() && right.hasStaticValue()) {
            //console.log(left.getStaticValue(), operator, right.getStaticValue());
            result.setStaticValue(evaluator.getStaticValue(node));
        } else {
            result.setDynamicValue();
        }
    },

    UpdateExpression: function (node, scope) {
        var argument = getTypeInfo(scope, node.argument), result = ANNO(node);
        if (argument.canNumber()) {
            result.copy(argument);
            if (node.prefix && argument.hasStaticValue()) {
                if (node.operator == "++") {
                    result.setStaticValue(argument.getStaticValue() + 1)
                } else if (node.operator == "--") {
                    result.setStaticValue(argument.getStaticValue() - 1)
                } else {
                    throw new Error("Operator not supported: " + node.operator);
                }
            }
        } else {
            // e.g. var a = {}; a++;
            result.setInvalid(generateErrorInformation(node, ERROR_TYPES.NAN_ERROR));
        }
    },

    AssignmentExpression: function (node, scope) {
        var right = getTypeInfo(scope, node.right), result = ANNO(node);

        result.copy(right);
        result.setDynamicValue();
        result.clearUniformDependencies();

        // Check, if a assigned variable still has the same type as
        // before and update type of uninitialized variables.
        if (node.left.type == Syntax.Identifier && !context.inDeclaration() && right.isValid()) {
            var name = node.left.name;
            scope.updateTypeInfo(name, right, node);
        }
    },


    MemberExpression: function (node, scope) {
        var resultType = getTypeInfo(scope, node), objectAnnotation = getTypeInfo(scope, node.object), propertyAnnotation = ANNO(node.property);

        if (!objectAnnotation.isValid()) {
            resultType.setInvalid();
            return;
        }

        //console.log("Member", node.object.name, node.property.name, node.computed);
        if (node.computed) {
            if (objectAnnotation.isArray()) {
                // Property is computed, thus it could be a variable
                var propertyType = getTypeInfo(scope, node.property);
                if (!propertyType.canNumber()) {
                    throwError(node, "Expected 'int' or 'number' type for array accessor");
                }
                var elementInfo = objectAnnotation.getArrayElementType();
                resultType.setType(elementInfo.type, elementInfo.kind);
                return;
            } else {
                resultType.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "no array access to object yet"));
                return;
                //Shade.throwError(node, "TypeError: Cannot access member via computed value from object '" + objectAnnotation.getTypeString());
            }
        }
        var propertyName = node.property.name;

        var objectOfInterest = scope.type(node.object);

        objectOfInterest || throwError(node, "ReferenceError: " + node.object.name + " is not defined. Scope: " + scope);

        if (!objectOfInterest.isValid() || objectOfInterest.getType() == TYPES.UNDEFINED) {  // e.g. var a = undefined; a.unknown;
            resultType.setInvalid(generateErrorInformation(node, ERROR_TYPES.TYPE_ERROR, "Cannot read property '" + propertyName + "' of undefined"));
            return;
        }


        if (objectOfInterest.getType() != TYPES.OBJECT) { // e.g. var a = 5; a.unknown;
            resultType.setType(TYPES.UNDEFINED);
            return;
        }

        objectAnnotation.copy(objectOfInterest);

        if (!objectOfInterest.hasProperty(propertyName)) {
            resultType.setType(TYPES.UNDEFINED);
            propertyAnnotation.setType(TYPES.UNDEFINED);
            return;
        }

        var propertyTypeInfo = objectOfInterest.getPropertyInfo(propertyName);
        propertyAnnotation.copy(propertyTypeInfo);
        resultType.copy(propertyAnnotation);
    },

    CallExpression: function (node, scope) {
        var result = ANNO(node), args = getTypeInfo(scope, node.arguments), extra, staticValue;

        if (!args.every(function (arg) {
                return arg.isValid()
            })) {
            result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Not all arguments types of call expression could be evaluated"));
            return;
        }
        // Be on the safe side, assume result is static independently of former annotations
        result.setDynamicValue();

        // Call on an object, e.g. Math.cos()
        if (node.callee.type == Syntax.MemberExpression) {

            var memberExpression = getTypeInfo(scope, node.callee);
            if (!memberExpression.isValid()) {
                result.setInvalid();
                return;
            }

            var object = node.callee.object, propertyName = node.callee.property.name;

            var objectReference = scope.type(object);
            if (!objectReference.isValid()) { // This should already have been handled by parent MemberExpression
                throwError(node, "Internal: No object info for: " + object);
            }

            if (!memberExpression.isFunction()) { // e.g. Math.PI()
                if (objectReference.hasProperty(propertyName)) {
                    result.setInvalid(generateErrorInformation(node, ERROR_TYPES.TYPE_ERROR, "Property '" + propertyName + "' of object #<" + objectReference.getTypeString() + "> is not a function"));
                    ErrorHandler.throwError(node, memberExpression.getTypeString() + " is not a function")
                } else {
                    var msg = (object.type == Syntax.ThisExpression ? "'this'" : objectReference.getTypeString()) + " has no method '" + propertyName + "'";
                    result.setInvalid(generateErrorInformation(node, ERROR_TYPES.TYPE_ERROR, msg));
                    ErrorHandler.throwError(node, "undefined is not a function");
                }
                return;
            }


            var propertyHandler = objectReference.getPropertyInfo(propertyName).info;

            if (typeof propertyHandler.evaluate != "function") {
                throwError(node, "Internal: no handler registered for function '" + propertyName + "'");
            }
            // Evaluate type of call

            try {
                extra = propertyHandler.evaluate(result, args, scope, objectReference, context);
                result.assign(extra);
            } catch (e) {
                result.setInvalid(generateErrorInformation(node, e.message));
                return;
            }

            // If we have a type, evaluate static value
            if (typeof propertyHandler.computeStaticValue != "function") {
                debug && console.warn("No static evaluation exists for function", codegen.generate(node));
                return;
            }
            staticValue = propertyHandler.computeStaticValue(result, args, scope, objectReference, context);
            if (staticValue !== undefined) {
                result.setStaticValue(staticValue);
            }
            return;

        } else if (node.callee.type == Syntax.Identifier) {
            var functionName = node.callee.name;
            var func = scope.getBindingByName(functionName);
            if (!func) {
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.REFERENCE_ERROR, functionName, "is not defined"));
                return;
            }
            if (!func.isFunction()) {
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.TYPE_ERROR, func.getTypeString(), "is not a function"));
                return;
            }
            try {
                extra = context.callFunction(scope.getVariableIdentifier(functionName), args);
                extra && result.setFromExtra(extra);
            } catch (e) {
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Failure in function call: ", e.message));
            }
            return;
        }
        result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Internal:", "Unhandled CallExpression", node.callee.type));
    },

    VariableDeclarator: function (node, scope) {
        var init = node.init ? getTypeInfo(scope, node.init) : null, result = ANNO(node);
        if (init) {
            ANNO(node.init).copy(init);
            result.copy(init);
        }
    },

    VariableDeclaration: function (node, scope) {
        context.setInDeclaration(false);
    },

    LogicalExpression: function (node, scope) {
        var left = getTypeInfo(scope, node.left), right = getTypeInfo(scope, node.right), result = ANNO(node);


        // static: true || false, dynamic: undefined
        var leftBool = left.getStaticTruthValue(), rightBool = right.getStaticTruthValue(), operator = node.operator;

        if (operator === "||") {
            if (leftBool === false) {
                result.copy(right);
                return;
            }
            if (leftBool === true) {
                result.copy(left);
                return;
            }
            // Left is dynamic, let's check right
            if (rightBool === false) {
                // Now the result type is always the one of the left value
                result.copy(left);
                return;
            }
        } else if (operator === "&&") {
            if (leftBool === false) {
                // T(x) == false => x && y == x
                result.copy(left);
                return;
            }
            if (leftBool === true) {
                result.copy(right);
                return;
            }
            // Left is dynamic, let's check right
            if (rightBool === true) {
                // Now the result type is always the one of the left value
                result.copy(left);
                return;
            }
            if (rightBool === false) {
                // Now the result must be false
                result.setType(TYPES.BOOLEAN);
                result.setStaticValue(false);
                return;
            }
        }

        // If we can cast both sides to a common type, it's fine
        if (result.setCommonType(left, right)) {
            return;
        }
        result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Can't evaluate polymorphic logical expression"));
    },

    ConditionalExpression: function (node, scope) {
        var consequent = getTypeInfo(scope, node.consequent), alternate = getTypeInfo(scope, node.alternate), test = getTypeInfo(scope, node.test), result = ANNO(node);

        var testResult = test.getStaticTruthValue();
        if (testResult === true) {
            result.copy(consequent);
        } else if (testResult === false) {
            result.copy(alternate);
        } else {
            if (result.setCommonType(consequent, alternate)) {
                result.setDynamicValue();
            } else {
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Can't evaluate polymorphic conditional expression"))
            }
        }

    }

};

module.exports = function (ast, scope, propagatedConstants) {

    assert.ok(ast, "No node to analyze");
    assert.ok(scope, "No scope to analyze");

    var controller = new estraverse.Controller();

    //context.setConstants(propagatedConstants || null);

    controller.traverse(ast, {
        enter: function (node) {
            if (node.type == Syntax.VariableDeclaration) {
                //context.setInDeclaration(true);
            }
        }, leave: function (node /*, parent */) {
            if (handlers.hasOwnProperty(node.type)) {
                return handlers[node.type].call(this, node, scope);
            }
            return null;
        }
    });

    //context.setConstants(null);
    return ast;
};
