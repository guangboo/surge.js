// surge.js
// 2013, Theo, https://github.com/guangboo/surge.js
// Licensed under the MIT license.

(function(global) {
    var surge = global.surge = { };
    
    surge.version = '0.1 dev';
    surge.author = 'Theo <guangboo49@gmail.com>';
    surge.debug = false;
    surge.__builtins = {};
    
    surge.compile = _compiler.compile;
    surge.get_template = _compiler.get;
    
    surge.register = function(name, func){ this.__builtins[name] = func; return this;};
    var escapeMap = {
        '<' : '&lt;',
        '>' : '&gt;',
        '"' : '&#39;',
        "'" : '&quot;',
        '&' : '&amp;'
    };
    
    surge.register('trim', function(a) { 
            if (typeof a == 'string')
                a.replace(/^\s+|\s+$/g, '');
            return a; 
        }).register('ltrim', function(a) { 
            if (typeof a == 'string') 
                return a.replace(/^\s+/, ''); 
            return a; 
        }).register('rtrim', function(a) {
            if(typeof a == 'string')
                return a.replace(/\s+$/, '');
            return a;
        }).register('add', function(a) {
            if(typeof a == 'number' && arguments.length > 1){
                var sum = a;
                for(var i = 1; i < arguments.length; i++){
                    sum += parseFloat(arguments[i]);
                }
                return sum;
            }
            return a;
        }).register('addslashes', function(a) {
            if(typeof a == 'string')
                return a.replace(/(\'|\")/g, '\\$1');
            return a;
        }).register('capfirst', function(a) {
            if(typeof a == 'string')
                return a.replace(/^([a-z])/, function(m) { return m.toUpperCase(); });
            return a;
        }).register('cut', function(a, cc) {
            if(typeof a == 'string') {
                if(!!cc) {
                    return a.replace(new RegExp(cc, 'g'), '');
                }
            }
            return a;
        }).register('default', function(a, v){
            if(!!a && (!(a instanceof Array) || a.length > 0)) return a;
            else return v;
        }).register('sort', function(a, v){
            if(a instanceof Array && a.length > 0) {
                if(typeof v == 'undefined'){
                    if(typeof a[0] == 'string') {
                        return a.sort();
                    } else if(typeof a[0] == 'number' || typeof a[0] == 'boolean'){
                        return a.sort(function(a, b) { return a - b; });
                    } else {
                        for(var p in a[0]) { v = p; break; }
                        if(typeof v == 'undefined')
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
                        }
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
                return a.replace(/^(?:\w([^\S]*)\s+)|(?:\s+\w([^\S]*))/g, function(m){ return m.toLowerCase(); })
                        .replace(/^(?:(\w)[^\S]*\s+)|(?:\s+(\w)[^\S]*)/g, function(m){ return m.toUpperCase(); });
            return a;
        });
    
})(this);