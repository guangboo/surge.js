/**
 *  Surge Runtime
 *  This contains only the code from surge.js that is needed after a template is compiled
 *  This way, templates can be compiled on the backend and sent to the client with just this runtime for rendering
 *  2015 Randy Valis
 */
(function(factory) {

  // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
  // We use `self` instead of `window` for `WebWorker` support.
  var root = (typeof self == 'object' && self.self == self && self) ||
            (typeof global == 'object' && global.global == global && global);

  // AMD.
  if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      root.surge = factory(root, exports);
    });

  // Next for Node.js or CommonJS.
  } else if (typeof exports !== 'undefined') {
    factory(root, exports);

  // Finally, as a browser global.
  } else {
    factory(root, {});
  }

}(function(root, surge) {
    root.surge = surge;

    surge.version = '0.2.4 Alpha';
    surge.debug = true;
    var _ = surge.__builtins = {};

    surge.register = function(name, func){ if(/^[_a-zA-Z]\w*/.test(name)) { this.__builtins[name] = func; return this; } throw '"' + name + '" is not valid filter name.'; };

    var regex_trim = /^\s+|\s+$/g,
        regex_for = /(\w+)\s+in\s+(.*)/,
        regex_with = /((?:\w+)\s*=\s*(?:[\w\.]+))+/g;
        regex_number = /[-+\.\d]/,
        regex_const_string = /^(['"]).*\1$/;

    var escapeMap = {
        '<' : '&lt;',
        '>' : '&gt;',
        '"' : '&#39;',
        "'" : '&quot;',
        '&' : '&amp;'
    };

    if(!String.prototype.hasOwnProperty('trim'))
        String.prototype.trim = function(){ return this.replace(regex_trim, ''); };

    function is_true(a) { return !!a && (!(a instanceof Array) || a.length > 0); }
    function is_constant(a) { return regex_number.test(a[0]) || regex_const_string.test(a); }

    surge.is_true = is_true;

    surge.register('trim', function(a) {
        if (typeof a === 'string')
            return a.trim();
        return a;
    }).register('ltrim', function(a) {
        if (typeof a === 'string')
            return a.replace(/^\s+/, '');
        return a;
    }).register('rtrim', function(a) {
        if(typeof a === 'string')
            return a.replace(/\s+$/, '');
        return a;
    }).register('add', function(a) {
        if(typeof a === 'number' && arguments.length > 1){
            var sum = a;
            for(var i = 1; i < arguments.length; i++){
                sum += parseFloat(arguments[i]);
            }
            return sum;
        }
        return a;
    }).register('capfirst', function(a) {
        if(typeof a === 'string')
            return a.replace(/^([a-z])/, function(m) { return m.toUpperCase(); });
        return a;
    }).register('cut', function(a, cc) {
        if(typeof a === 'string') {
            if(!!cc) {
                return a.replace(new RegExp(cc, 'g'), '');
            }
        }
        return a;
    }).register('default', function(a, v){
        if(is_true(a)) return a;
        else return v;
    }).register('sort', function(a, v){
        if(a instanceof Array && a.length > 0) {
            if(typeof v === 'undefined'){
                if(typeof a[0] === 'string') {
                    return a.sort();
                } else if(typeof a[0] === 'number' || typeof a[0] === 'boolean'){
                    return a.sort(function(a, b) { return a - b; });
                } else {
                    for(var p in a[0]) { v = p; break; }
                    if(typeof v === 'undefined')
                        return a;
                }
            }

            if(a[0].hasOwnProperty(v)) {
                var by = function(name){
                    return function(o, p){
                        var a1, b;
                        if (typeof o === "object" && typeof p === "object" && o && p) {
                            a1 = o[name];
                            b = p[name];
                            if (a1 === b) {
                                return 0;
                            }
                            if (typeof a1 === typeof b) {
                                return a1 < b ? -1 : 1;
                            }
                            return typeof a1 < typeof b ? -1 : 1;
                        }
                        else {
                            throw ("error");
                        }
                    };
                };
                return a.sort(by(v));
            }
        }
        return a;
    }).register('reverse', function(a, v){
        return surge.__builtins.sort(a, v).reverse();
    }).register('escape', function(a){
        return a.replace(/[<>'"]|&(?!amp;)/g, function(m){return escapeMap[m];});
    }).register('length', function(a){
        if(typeof a === 'string' || a instanceof Array)
            return a.length;
        return a;
    }).register('lower', function(a){
        if(typeof a === 'string') return a.toLowerCase();
        return a;
    }).register('upper', function(a){
        if(typeof a === 'string') return a.toUpperCase();
        return a;
    }).register('striptags', function(a){
        if(typeof a === 'string')
            return a.replace(/<(?:.|\s)*?>/g, '');
        return a;
    }).register('title', function(a){
        if(typeof a === 'string')
            return a.replace(/\B(\w*)/g, function(m){ return m.toLowerCase(); })
                    .replace(/\b(\w)|\b(\w)/g, function(m){ return m.toUpperCase(); });
        return a;
    }).register('truncate', function(a, i){
        if(typeof a === 'string') {
            if(a.length > i)
                return a.substring(0, i - 3) + '...';
            return a;
        }
        return a;
    });
}));
