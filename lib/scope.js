var assert = require("assert");
var Map = require('es6-map');
var TypeInfo = require('./typeinfo').TypeInfo;
var TypeSystem = require('./typeinfo').TypeSystem;
var Syntax = require("estraverse").Syntax;

var ANNO = TypeInfo.ANNO;

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
        if (node.type == Syntax.Identifier) {
            return new TypeInfo(this.get(node.name));
        }
        return ANNO(node);
    }


};


module.exports = {
    createScope: function () {
        return new Scope();
    },

    createStandardScope: function () {
        var result = new Scope();
        result.declare("Math", TypeInfo.createObjectReference(TypeSystem.getPredefinedObject("Math")));
        return result;
    }
};
