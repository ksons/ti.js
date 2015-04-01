var Map = require('es6-map');
var assign = require('lodash.assign');
var create = require('lodash.create');

var TYPES = require("./constants.js").TYPES;
var CONSTANT_VALUE_PROPERTY = "constantValue";


/**
 * @param {Object?} other
 * @constructor
 */
var TypeInfo = function (other) {
    var info = this.info = other || { type: TYPES.ANY };

    Object.defineProperties(this, {
        type: {get: function() { return info.type }, set: function(e) { info.type = e; }},
        error: {get: function() { return info.error }, set: function(e) { info.error = e; }}
    });
};

TypeInfo.createObjectReference = function (obj) {
    return {
        type: TYPES.OBJECT, ref: obj.id
    }
};


/**
 * @param {TypeInfo} typeInfo
 * @param {Object?} value
 */
TypeInfo.copyStaticValue = function (typeInfo, value) {
    value = value || typeInfo.getStaticValue();
    // We don't have to copy primitive types
    if (!typeInfo.isObject())
        return value;
    /*switch (typeInfo.getKind()) {
     case KINDS.FLOAT2:
     return new Shade.Vec2(value);
     case KINDS.FLOAT3:
     return new Shade.Vec3(value);
     case KINDS.FLOAT4:
     return new Shade.Vec4(value);
     case KINDS.MATRIX3:
     return new Shade.Mat3(value);
     case KINDS.MATRIX4:
     return new Shade.Mat4(value);
     default:
     throw new Error("Can't copy static value of kind: " + typeInfo.getKind());
     } */
};

typeof(TypeInfo.prototype = {
    getType: function () {
        return this.type;
    },

    setKind: function (kind) {
        this.info.kind = kind;
    },

    getKind: function () {
        if (!this.isObject())
            return null;
        return this.info.kind;
    },

    getUserData: function () {
        var extra = this.info;
        if (!extra.userData) extra.userData = {};
        return extra.userData;
    },

    getArrayElementType: function () {
        if (!this.isArray())
            throw new Error("Called getArrayElementType on " + this.type);
        return this.info.elements;
    },

    isOfKind: function (kind) {
        if (!this.isObject()) {
            return false;
        }
        return this.getKind() == kind;
    },

    /**
     * @param {TYPES} type
     * @param {string?} kind
     */
    setType: function (type, kind) {
        this.type = type;
        if (kind)
            this.setKind(kind);
        if (this.isValid())
            this.clearError();
    },

    setInvalid: function (message) {
        this.type = TYPES.INVALID;
        if (message)
            this.setError(message);
    },

    equals: function (other) {
        return this.type == other.type && this.getKind() == other.getKind();
    },

    hasProperty: function (name) {
        if (this.isObject() && this.info.ref) {
            var predefinedType = TypeSystem.getPredefinedObject(this.info.ref);
            return predefinedType.properties.hasOwnProperty(name);
        }
        return false;
    },

    getPropertyInfo: function (name) {
        if (this.isObject() && this.info.ref) {
            var predefinedType = TypeSystem.getPredefinedObject(this.info.ref);
            var property = predefinedType.properties[name];
            if (property) {
                return new TypeInfo(property);
            }
            return null;
        }
        return null;
    },

    isInt: function () {
        return this.type === TYPES.INT;
    },

    isNumber: function () {
        return this.type === TYPES.NUMBER;
    },

    isValid: function () {
        return this.type !== TYPES.INVALID;
    },

    isNullOrUndefined: function () {
        return this.isNull() || this.isUndefined();
    },

    isNull: function () {
        return this.type === TYPES.OBJECT && this.hasStaticValue() && this.getStaticValue() == null;
    },

    isUndefined: function () {
        return this.type === TYPES.UNDEFINED;
    },

    isBool: function () {
        return this.type === TYPES.BOOLEAN;
    },

    isString: function () {
        return this.type === TYPES.STRING;
    },

    isArray: function () {
        return this.type === TYPES.ARRAY;
    },

    isFunction: function () {
        return this.type === TYPES.FUNCTION;
    },

    isObject: function () {
        return this.type === TYPES.OBJECT;
    },

    /*isGlobal: function () {
     return !!this.info.global;
     },

     setGlobal: function (global) {
     var extra = this.info;
     extra.global = global;
     },

     isOutput: function () {
     return !!this.info.output;
     },
     setOutput: function (output) {
     var extra = this.info;
     extra.output = output;
     },*/

    canNumber: function () {
        return this.isNumber() || this.isInt() || this.isBool();
    },

    canInt: function () {
        return this.isInt() || this.isBool();
    },

    canObject: function () {
        return this.isObject() || this.isArray() || this.isFunction();
    },

    setCommonType: function (a, b) {
        if (a.equals(b)) {
            this.copy(a);
            return true;
        }
        if (a.canNumber() && b.canNumber()) {
            this.setType(TYPES.NUMBER);
            return true;
        }
        return false;
    },

    hasStaticValue: function () {
        var extra = this.info;
        if (this.isUndefined())
            return true;
        return extra.hasOwnProperty(CONSTANT_VALUE_PROPERTY);
    },
    setStaticValue: function (v) {
        if (this.isUndefined())
            throw new Error("Can't set constant value: Undefined has value 'undefined'.");
        this.info[CONSTANT_VALUE_PROPERTY] = v;
    },

    getStaticValue: function () {
        if (!this.hasStaticValue()) {
            throw new Error("Node has no static value: " + this);
        }
        if (this.isUndefined())
            return undefined;
        return this.info[CONSTANT_VALUE_PROPERTY];
    },


    setDynamicValue: function () {
        delete this.info[CONSTANT_VALUE_PROPERTY];
    },


    canUniformExpression: function () {
        return this.hasStaticValue() || this.isUniformExpression();
    },

    isUniformExpression: function () {
        var extra = this.info;
        return extra.hasOwnProperty("uniformDependencies")
    }, setUniformDependencies: function () {
        var extra = this.info;
        var dependencies = new Set();
        var args = Array.prototype.slice.call(arguments);
        args.forEach(function (arg) {
            if (Array.isArray(arg))
                dependencies = Set.union(dependencies, arg); else
                dependencies.add(arg);
        });
        extra.uniformDependencies = dependencies.values();
    }, getUniformDependencies: function () {
        var extra = this.info;
        return extra.uniformDependencies || [];
    }, getUniformCosts: function () {
        var extra = this.info;
        return extra.uniformCosts | 0;
    }, setUniformCosts: function (costs) {
        var extra = this.info;
        extra.uniformCosts = costs;
    }, clearUniformDependencies: function () {
        var extra = this.info;
        delete extra.uniformDependencies;
    }, setCall: function (call) {
        var extra = this.info;
        extra.evaluate = call;
    }, getCall: function () {
        return this.info.evaluate;
    }, clearCall: function () {
        var extra = this.info;
        delete extra.evaluate;
    }, assign: function (obj) {
        assign(this.info, obj);
    }, copy: function (other) {
        // TODO: Copy static values
        assign(this.info, other.info);
    }, str: function () {
        var extra = this.info;
        return JSON.stringify(extra, null, 1);
    },

    hasError: function () {
        return this.error != null;
    },

    getError: function () {
        return this.error;
    },

    setError: function (error) {
        this.error = error;
    },

    clearError: function () {
        this.error = null;
    },

    getTypeString: function () {
        if (this.isObject()) {
            return this.isOfKind("any") ? "Object" : ("Object #<" + this.getKind() + ">");
        }
        return this.type;
    },

    /**
     * Get the internal type as JavaScript type
     * @returns {string}
     */
    getJavaScriptTypeString: function () {
        //noinspection FallthroughInSwitchStatementJS
        switch (this.type) {
            case TYPES.INT:
            case TYPES.NUMBER:
                return "number";
            case TYPES.OBJECT:
            case TYPES.ARRAY:
                return "object";
            case TYPES.STRING:
                return "string";
            case TYPES.UNDEFINED:
                return "undefined";
            case TYPES.BOOLEAN:
                return "boolean";
            case TYPES.FUNCTION:
                return "function";

            default:
                // TODO: For debug we use this now, should throw an exception
                return "?" + this.type;
        }
    }, setSource: function (source) {
        var extra = this.info;
        extra.source = source;
    }, getSource: function () {
        return this.info.source;
    }, getStaticProperties: function () {
        // Only bound object have static properties (Math, Shade etc)
        return null;
    }, isDerived: function () {
        return this.info.derived == true;
    }, getStaticTruthValue: function () {
        // !!undefined == false;
        if (this.isNullOrUndefined())
            return false;
        // !!{} == true
        if (this.canObject()) {
            return !this.isNull();
        }
        // In all other cases, it depends on the value,
        // thus we can only evaluate this for static objects
        if (this.hasStaticValue()) {
            return !!this.getStaticValue();
        }
        return undefined;
    }, setSemantic: function (sem) {
        this.info.semantic = sem;
    }, getSemantic: function (sem) {
        return this.info.semantic;
    }, toString: function () {
        return "TypeInfo: " + JSON.stringify(this.info);
    }
});


/**
 * @param {object} extra
 * @extends TypeInfo
 * @constructor
 */
var FunctionAnnotation = function (extra) {
    TypeInfo.call(this, extra);
    this.setType(TYPES.FUNCTION);
};

FunctionAnnotation.prototype = create(TypeInfo.prototype, {
    'constructor': TypeInfo,

    getReturnInfo: function () {
        return this.info.returnInfo;
    },

    setReturnInfo: function (info) {
        this.info.returnInfo = info;
    },

    isUsed: function () {
        return !!this.info.used;
    },

    setUsed: function (v) {
        this.info.used = v;
    }
});

/**
 * Creates TypeInfo for a node. Uses annotation if it already exists, creates annotation otherwise
 * @param node
 * @returns {TypeInfo}
 */
var fromAnnotation = function (node) {
    if (!node.extra) {
        var info = new TypeInfo();
        node.extra = info.info;
        return info;
    }
    return new TypeInfo(node.extra)
};

var TypeSystem = (function () {
    var registry = new Map();
    var result = {
        registerPredefinedObject: function (definition) {
            registry.set(definition.id, definition);
        }, getPredefinedObject: function (name) {
            return registry.get(name);
        }
    };
    result.registerPredefinedObject(require("./std/math.js"));
    return result;
}());

module.exports = {
    Info: TypeInfo, System: TypeSystem, ANNO: fromAnnotation, fromAnnotation: fromAnnotation
};

