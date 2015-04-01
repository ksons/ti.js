var assert = require("assert");
var Map = require('es6-map');
var Type = require('./typeinfo');
var Syntax = require("estraverse").Syntax;
var Error = require("./errors.js");

/**
 * @param {Scope?} parent
 * @param opt
 * @constructor
 */
var Scope = function (parent, opt) {
    opt = opt || {};

    if (parent) {
        assert.ok(parent instanceof Scope);
    }

    /**
     * @type Scope
     */
    this.parent = parent;

    /**
     * @type {Map}
     */
    this.bindings = new Map();

    Object.defineProperties(this, {
        isGlobal: {value: !parent}
    });

};

Scope.prototype = {
    getGlobalScope: function () {
        if (this.parent) {
            return this.parent.getGlobalScope();
        }
        return this;
    },

    declares: function (identifier) {
        return this.bindings.has(identifier);
    },

    /**
     * @param identifier
     * @returns {TypeInfo|undefined}
     */
    get: function (identifier) {
        var result = this.bindings.get(identifier);
        if (result == undefined && this.parent) {
            return parent.get(identifier);
        }
        return result;
    },

    declare: function (name, info) {
        this.bindings.set(name, info);
    },

    type: function (node) {
        if (isVariable(node)) {
            var definition = this.get(node.name);
            if(!definition) {
                Error.throwError(node, "ReferenceError: " + node.name + " is not defined")
            }
            return new Type.Info(definition);
        }
        return Type.fromAnnotation(node);
    }


};

function isVariable(node) {
    return node.type == Syntax.Identifier && node.name != "undefined";
}


module.exports = {
    createScope: function () {
        return new Scope();
    },

    createStandardScope: function () {
        var result = new Scope();
        result.declare("Math", Type.Info.createObjectReference(Type.System.getPredefinedObject("Math")));
        return result;
    }
};
