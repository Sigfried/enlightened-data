
/*
 * testing something
 * # supergroup.js
 * Author: [Sigfried Gold](http://sigfried.org)  
 * License: [MIT](http://sigfried.mit-license.org/)  
 *
 * usage examples at [http://sigfried.github.io/blog/supergroup](http://sigfried.github.io/blog/supergroup)
 */
; // jshint -W053

'use strict()';
if (typeof(require) !== "undefined") { // make it work in node or browsers or other contexts
    _ = require('underscore'); // otherwise assume it was included by html file
    require('underscore-unchained'); // adds unchain as an Underscore mixin
    require('1670507/underscoreAddon.js'); // adds mean, median, etc. as mixins
}
var supergroup = (function() {
    var e = {}; // local reference to supergroup namespace
    // @class List
    // @description Native Array of groups with various added methods and properties.
    // Methods described below.
    function List() {}
    // @class Value
    // @description Supergroup Lists are composed of Values which are
    // String or Number objects representing group values.
    // Methods described below.
    function Value() {}

    /* @exported function supergroup.group(recs, dim, opts)
     * @param {Object[]} recs list of records to be grouped
     * @param {string or Function} dim either the property name to
        group by or a function returning a group by string or number
     * @param {Object} [opts]
     * @param {String} opts.childProp='children' If group ends up being
        * hierarchical, this will be the property name of any children
     * @param {String[]} [opts.excludeValues] to exlude specific group values
     * @param {function} [opts.preListRecsHook] run recs through this
        * function before continuing processing
     * @param {function} [opts.dimName] defaults to the value of `dim`.
        * If `dim` is a function, the dimName will be ugly.
     * @return {Array of Values} enhanced with all the List methods
     *
     * Avaailable as _.supergroup, Underscore mixin
     */
    e.group = function(recs, dim, opts) {
        if (_(dim).isArray()) return e.multiDimList(recs, dim, opts); // handoff to multiDimmList if dim is an array
        opts = opts || {};
        recs = opts.preListRecsHook ? opts.preListRecsHook(recs) : recs;
        childProp = opts.childProp || childProp;
        var groups = _.groupBy(recs, dim); // use Underscore's groupBy: http://underscorejs.org/#groupBy
        if (opts.excludeValues) {
            _(opts.excludeValues).each(function(d) {
                delete groups[d];
            });
        }
        var isNumeric = wholeListNumeric(groups); // does every group Value look like a number or a missing value?
        var groups = _.map(_.pairs(groups), function(pair, i) { // setup Values for each group in List
            var rawVal = pair[0];
            var val;
            if(isNumeric) {
                val = makeNumberValue(rawVal); // either everything's a Number
            } else {
                val = makeStringValue(rawVal); // or everything's a String
            }
            /* The original records in this group are stored as an Array in 
             * the records property (should probably be a getter method).
             */
            val.records = pair[1];
            /* val.records is enhanced with Underscore methods for
             * convenience, but also with the supergroup method that's
             * been mixed in to Underscore. So you can group this specific
             * subset like: val.records.supergroup
             * on                                       FIX!!!!!!
             */
            _.unchain(val.records);
            val.dim = (opts.dimName) ? opts.dimName : dim;
            val.records.parentVal = val; // NOT TESTED, NOT USED, PROBABLY WRONG
            if (opts.parent)
                val.parent = opts.parent;
            if (val.parent) {
                if ('depth' in val.parent) {
                    val.depth = val.parent.depth + 1;
                } else {
                    val.parent.depth = 0;
                    val.depth = 1;
                }
            } else {
                val.depth = 0;
            }
            return val;
        });
        groups = makeList(groups);
        groups.records = recs; // NOT TESTED, NOT USED, PROBABLY WRONG
        groups.dim = (opts.dimName) ? opts.dimName : dim;
        groups.isNumeric = isNumeric;
        _(groups).each(function(group) { 
            group.parentList = groups;
        });
        // pointless without recursion
        //if (opts.postListListHook) groups = opts.postListListHook(groups);
        return groups;
    };
    e.multiDimList = function(recs, dims, opts) {
        var groups = e.group(recs, dims[0], opts);
        _.chain(dims).rest().each(function(dim) {
            groups.addLevel(dim, opts);
        });
        return groups;
    };

    List.prototype.asRootVal = function(name, dimName) {
        name = name || 'Root';
        var val = makeValue(name);
        val.records = this; // is this wrong?
        val[childProp]= this;
        val.descendants().each(function(d) { d.depth = d.depth + 1; });
        val.depth = 0;
        val.dim = dimName || 'root';
        return val;
    };
    List.prototype.leafNodes = function(level) {
        return this.invoke('leafNodes').flatten();
    };
    List.prototype.rawValues = function() {
        return _(this).map(function(d) { return d.toString(); });
    };
    List.prototype.lookup = function(query) {
        if (_.isArray(query)) {
            // if group has children, can search down the tree
            var values = query.slice(0);
            var list = this;
            var ret;
            while(values.length) {
                ret = list.singleLookup(values.shift());
                list = ret[childProp];
            }
            return ret;
        } else {
            return this.singleLookup(query);
        }
    };
    List.prototype.singleLookup = function(query) {
        var that = this;
        if (! ('lookupMap' in this)) {
            this.lookupMap = {};
            this.forEach(function(d) {
                that.lookupMap[d] = d;
            });
        }
        if (query in this.lookupMap)
            return this.lookupMap[query];
    };
    List.prototype.flattenTree = function() {
        return _.chain(this)
                    .map(function(d) {
                        var desc = d.descendants();
                        return [d].concat(desc);
                    })
                    .flatten()
                    .filter(_.identity) // expunge nulls
                    .tap(e.addListMethods)
                    .value();
    };
    List.prototype.addLevel = function(dim, opts) {
        _(this).each(function(val) {
            val.addLevel(dim, opts);
        });
    };
    
    function makeList(arr_arg) {
        var arr = [ ];
        arr.push.apply(arr, arr_arg);
        //arr.__proto__ = List.prototype;
        for(var method in List.prototype) {
            Object.defineProperty(arr, method, {
                value: List.prototype[method]
            });
        }
        _.unchain(arr);
        return arr;
    }

    /** Enhance arrays with {@link http://underscorejs.org/ Underscore} functions 
     * that work on arrays. 
     * @param {Array} arr
     * @return {Array} now enhanced
     *
     * Now can call Underscore functions as methods on the array, and if
     * the return value is an array, it will also be enhanced.
     *
     * @example
     * `enlightenedData.addUnderscoreMethods(['a','bb','ccc'])
     *      .pluck('length')
     *      .
     * group.where({foo:bar}).invoke('baz')
     * @returns {whatever the underscore function would return}
     *
     * @memberof enlightenedData 
     */
    /*
    e.addUnderscoreMethods = function(arr) {
        _(e.underscoreMethodsToAddToArrays).each(function(methodName) {
            if (_(arr).has(methodName)) return;
            Object.defineProperty(arr, methodName, {
                value: function() {
                    var part = _.partial(_[methodName], arr);
                    var result = part.apply(null, _.toArray(arguments));
                    if (_.isArray(result)) e.addListMethods(result);
                    return result;
                }});
        });
        return arr;
    };
    e.underscoreMethodsToAddToArrays = [ 
            "each",
            "map",
            "reduce",
            "find",
            "filter",
            "reject",
            "all",
            "every",
            "any",
            "some",
            "contains",
            "invoke",
            "pluck",
            "where",
            "findWhere",
            "max",
            "min",
            "shuffle",
            "sortBy",
            "groupBy",
            "countBy",
            "sortedIndex",
            "size",
            "first",
            "initial",
            "last",
            "rest",
            "compact",
            "flatten",
            "without",
            "uniq",
            "union",
            "intersection",
            "difference",
            "zip",
            "unzip",
            //"object",
            "indexOf",
            "lastIndexOf",
            "chain",
            "result"
            ];
    */
    function makeValue(v_arg) {
        if (isNaN(v_arg)) {
            return makeStringValue(v_arg);
        } else {
            return makeNumberValue(v_arg);
        }
    }
    function StringValue() {}
    //StringValue.prototype = new String;
    function makeStringValue(s_arg) {
        var S = new String(s_arg);
        //S.__proto__ = StringValue.prototype; // won't work in IE10
        for(var method in StringValue.prototype) {
            Object.defineProperty(S, method, {
                value: StringValue.prototype[method]
            });
        }
        return S;
    }
    function NumberValue() {}
    //NumberValue.prototype = new Number;
    function makeNumberValue(n_arg) {
        var N = new Number(n_arg);
        //N.__proto__ = NumberValue.prototype;
        for(var method in NumberValue.prototype) {
            Object.defineProperty(N, method, {
                value: NumberValue.prototype[method]
            });
        }
        return N;
    }
    function wholeListNumeric(groups) {
        var isNumeric = _.every(_.keys(groups), function(k) {
            return      k === null ||
                        k === undefined ||
                        (!isNaN(Number(k))) ||
                        ["null", ".", "undefined"].indexOf(k.toLowerCase()) > -1;
        });
        if (isNumeric) {
            _.each(_.keys(groups), function(k) {
                if (isNaN(k)) {
                    delete groups[k];        // getting rid of NULL values in dim list!!
                }
            });
        }
        return isNumeric;
    }
    var childProp = 'children';

    Value.prototype.extendGroupBy = // backward compatibility
    Value.prototype.addLevel = function(dim, opts) {
        opts = opts || {};
        _.each(this.leafNodes(), function(d) {
            opts.parent = d;
            if (d.in && d.in === "both") {
                d[childProp] = e.diffList(d.from, d.to, dim, opts);
            } else {
                d[childProp] = e.group(d.records, dim, opts);
                if (d.in ) {
                    _(d[childProp]).each(function(c) {
                        c.in = d.in;
                        c[d.in] = d[d.in];
                    });
                }
            }
            d[childProp].parentVal = d; // NOT TESTED, NOT USED, PROBABLY WRONG!!!
        });
    };
    Value.prototype.leafNodes = function(level) {
        var ret = [this];
        if (typeof level === "undefined") {
            level = Infinity;
        }
        if (level !== 0 && this[childProp] && (!level || this.depth < level)) {
            ret = _.flatten(_.map(this[childProp], function(c) {
                return c.leafNodes(level);
            }), true);
        }
        return makeList(ret);
    };
    /*  didn't make this yet, just copied from above
    Value.prototype.descendants = function(level) {
        var ret = [this];
        if (level !== 0 && this[childProp] && (!level || this.depth < level))
            ret = _.flatten(_.map(this[childProp], function(c) {
                return c.leafNodes(level);
            }), true);
        return makeList(ret);
    };
    */
    function delimOpts(opts) {
        if (typeof opts === "string") opts = {delim: opts};
        opts = opts || {};
        if (!_(opts).has('delim')) opts.delim = '/';
        return opts;
    }
    Value.prototype.dimPath = function(opts) {
        opts = delimOpts(opts);
        opts.dimName = true;
        return this.namePath(opts);
    };
    Value.prototype.namePath = function(opts) {
        opts = delimOpts(opts);
        var path = this.pedigree(opts);
        if (opts.noRoot) path.shift();
        if (opts.backwards || this.backwards) path.reverse(); //kludgy?
        if (opts.dimName) path = _(path).pluck('dim');
        if (opts.asArray) return path;
        return path.join(opts.delim);
        /*
        var delim = opts.delim || '/';
        return (this.parent ? 
                this.parent.namePath(_.extend({},opts,{notLeaf:true})) : '') +
            ((opts.noRoot && this.depth===0) ? '' : 
                (this + (opts.notLeaf ? delim : ''))
             )
        */
    };
    Value.prototype.pedigree = function(opts) {
        var path = [];
        if (!(opts && opts.notThis)) path.push(this);
        var ptr = this;
        while ((ptr = ptr.parent)) {
            path.unshift(ptr);
        }
        return path;
        // CHANGING -- HOPE THIS DOESN'T BREAK STUFF (pedigree isn't
        // documented yet)
        if (!(opts && opts.asValues)) return _(path).invoke('toString');
        return path;
    };
    Value.prototype.descendants = function(opts) {
        return this[childProp] ? this[childProp].flattenTree() : undefined;
    };
    Value.prototype.lookup = function(query) {
        if (_.isArray(query)) {
            if (this.toString() === query[0]) {
                query = query.slice(1);
                if (query.length === 0)
                    return this;
            }
        } else if (_.isString(query)) {
            if (this.toString() === query) {
                return this;
            }
        } else {
            throw new Error("invalid param: " + query);
        }
        if (!this[childProp])
            throw new Error("can only call lookup on Values with kids");
        return this[childProp].lookup(query);
    };
    Value.prototype.pct = function() {
        return this.records.length / this.parentList.records.length;
    };

    /** Summarize records by a dimension
     *
     * @param {list} Records to be summarized
     * @param {numericDim} Dimension to summarize by
     *
     * @memberof supergroup
     */
    e.aggregate = function(list, numericDim) { 
        if (numericDim) {
            list = _(list).pluck(numericDim);
        }
        return _(list).reduce(function(memo,num){
                    memo.sum+=num;
                    memo.cnt++;
                    memo.avg=memo.sum/memo.cnt; 
                    memo.max = Math.max(memo.max, num);
                    return memo;
                },{sum:0,cnt:0,max:-Infinity});
    }; 
    /** Compare groups across two similar root notes
     *
     * @param {from} ...
     * @param {to} ...
     * @param {dim} ...
     * @param {opts} ...
     *
     * used by treelike and some earlier code
     *
     * @memberof supergroup
     */
    e.diffList = function(from, to, dim, opts) {
        var fromList = e.group(from.records, dim, opts);
        var toList = e.group(to.records, dim, opts);
        var list = makeList(e.compare(fromList, toList, dim));
        list.dim = (opts && opts.dimName) ? opts.dimName : dim;
        return list;
    };

    /** Compare two groups by a dimension
     *
     * @param {A} ...
     * @param {B} ...
     * @param {dim} ...
     *
     * @memberof supergroup
     */
    e.compare = function(A, B, dim) {
        var a = _(A).map(function(d) { return d+''; });
        var b = _(B).map(function(d) { return d+''; });
        var comp = {};
        _(A).each(function(d, i) {
            comp[d+''] = {
                name: d+'',
                in: 'from',
                from: d,
                fromIdx: i,
                dim: dim
            };
        });
        _(B).each(function(d, i) {
            if ((d+'') in comp) {
                var c = comp[d+''];
                c.in = "both";
                c.to = d;
                c.toIdx = i;
            } else {
                comp[d+''] = {
                    name: d+'',
                    in: 'to',
                    to: d,
                    toIdx: i,
                    dim: dim
                };
            }
        });
        var list = _(comp).values().sort(function(a,b) {
            return (a.fromIdx - b.fromIdx) || (a.toIdx - b.toIdx);
        }).map(function(d) {
            var val = makeValue(d.name);
            _.extend(val, d);
            val.records = [];
            if ('from' in d)
                val.records = val.records.concat(d.from.records);
            if ('to' in d)
                val.records = val.records.concat(d.to.records);
            return val;
        });
        _(list).map(function(d) {
            d.parentList = list; // NOT TESTED, NOT USED, PROBABLY WRONG
            d.records.parentVal = d; // NOT TESTED, NOT USED, PROBABLY WRONG
        });
        return list;
    };

    /** Concatenate two Values into a new one (??)
     *
     * @param {from} ...
     * @param {to} ...
     *
     * @memberof supergroup
     */
    e.compareValue = function(from, to) {
        if (from.dim !== to.dim) {
            throw new Error("not sure what you're trying to do");
        }
        var name = from + ' to ' + to;
        var val = makeValue(name);
        val.from = from;
        val.to = to;
        val.depth = 0;
        val.in = "both";
        val.records = [].concat(from.records,to.records);
        val.records.parentVal = val; // NOT TESTED, NOT USED, PROBABLY WRONG
        val.dim = from.dim;
        return val;
    };
    _.extend(StringValue.prototype, Value.prototype);
    _.extend(NumberValue.prototype, Value.prototype);

    /** Sometimes a List gets turned into a standard array,
     *  e.g., through slicing or sorting or filtering. 
     *  addListMethods turns it back into a List
     *
     * `List` would be a constructor if IE10 supported
     * \_\_proto\_\_, so it pretends to be one instead.
     *
     * @param {Array} Array to be extended
     *
     * @memberof supergroup
     */
    e.addListMethods = function(arr) {
        for(var method in List.prototype) {
            Object.defineProperty(arr, method, {
                value: List.prototype[method]
            });
        }
        _.unchain(arr);
        return arr;
    };
    return e;
}());

_.mixin({supergroup: supergroup.group});

if (typeof exports !== 'undefined') {   // not sure if this is all right
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = _;
    }
    exports._ = _;
} else if (typeof define === 'function' && define.amd) {
    // Register as a named module with AMD.
    define('_', [], function() {
        return nester;
    });
}
