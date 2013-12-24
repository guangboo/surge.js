// surge.js
// 2013, Theo, https://github.com/guangboo/surge.js
// Licensed under the MIT license.
(function(global) {
    var surge = global.surge = { };
    
    surge.version = '0.2.1 dev';
    surge.author = 'Theo <guangboo49@gmail.com>';
    surge.debug = false;
    surge.__builtins = {};
    
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
            return a.replace(/\B(\w*)/g, function(m){ return m.toLowerCase(); })
                    .replace(/\b(\w)|\b(\w)/g, function(m){ return m.toUpperCase(); });
        return a;
    });
    
    function isWhiteSpace(str) { return !/\S/.test(str); }

    function Scanner(source) {
        this.source = source;
        this.position = 0;
        this.length = source.length;
    }
    
    Scanner.prototype.eos = function() { return this.position >= this.length; }

    Scanner.prototype.skipWhiteSpace = function() {
        if(this.position >= this.length) return;
        var c = this.source.charAt(this.position);
        
        while(this.position < this.length && isWhiteSpace(c)) {
            this.position += 1;
            c = this.source.charAt(this.position);
        }
    }

    Scanner.prototype.pop = function() { return this.source.charAt(this.position++); }
    Scanner.prototype.back = function(count) {
        if(arguments.length == 0) {
            this.position -= 1;
        }else{
            this.position -= count;
        }
    }

    Scanner.prototype.skipTo = function(to) {
        var substr = this.source.substring(this.position);
        var len = to.length,
            indx = substr.indexOf(to);
        
        if(indx > -1) {
            this.position += indx + len;
            return this.position;
        } else {
            this.position = this.length;
            return -1;
        }
    }

    Scanner.prototype.copy = function(from, to) {
        return this.source.substring(from, to);
    }

    Scanner.prototype.readWord = function(){
        var p = this.position;
        var c = this.source.charAt(this.position++);
        
        while(!this.eos() && !isWhiteSpace(c))
            c = this.source.charAt(this.position++);
        return this.source.substring(p, this.position - 1);
    }

    var _cache = {};

    var _compiler = {
        tag_regex : /([^|:=><\s]+)\s*(?:\s*\|\s*(\w+)(?:\s*\:\s*([\w\.\s'",]+)+)?)?/g,
        for_regex : /(\w+)\s*in\s*([^|:=><\s]+)\s*(?:\s*\|\s*(\w+)(?:\s*\:\s*([\w\.\s'",]+)+)?)?/,
        with_regex : /((?:\w+)\s*=\s*(?:[\w\.]+))+/g,

        get : function(id){
            var tmplt;
            if(_cache.hasOwnProperty(id)) {
                tmplt = _cache[id];
            } else if('document' in global) {
                var ele = document.getElementById(id);
                if(ele) {
                    var src = ele.value || ele.innerHTML;
                    tmplt = compile(src.replace(/^\s*|\s*$/g, ''));
                    _cache[id] = tmplt;
                }
            }
            return tmplt;
        },
        
        compile : function(source) {
            var scanner = new Scanner(source);
            scanner.skipWhiteSpace();
            var c, c2, c3;
            var pos, pos2;
            var codes = [];
            codes.push('function(context) {with(context){');
            codes.push('var _html = [];');
            var var_index = 1;
            var var_name;
            var tag_stack = [], if_nested_stack = [], if_tags = [], if_tag_deep = 0;
            pos2 = scanner.position;
            
            while(!scanner.eos()){
                pos = scanner.position;
                c = scanner.pop();
                switch(c) {
                    case '{':
                        if(!scanner.eos()) {
                            if(pos > pos2) {
                                codes.push('_html.push("' + scanner.copy(pos2, pos).replace(/("|')/g, '\\$1') + '");');
                            }
                            pos2 = scanner.position;
                            c2 = scanner.pop();
                            if (c2 === '{') {
                                c3 = scanner.pop();
                                if(c3 != '{') {
                                    pos = scanner.position;
                                    pos2 = scanner.skipTo('}}');
                                    if(pos2 != -1) {
                                        var token = scanner.copy(pos, pos2 - 2);
                                        var v = token.replace(this.tag_regex, '$2($1,$3)').replace(/\,\s*\)/g, ')');
                                        codes.push('try { _html.push(' + v + '); } catch(e){}');
                                    } else {
                                        throw 'Syntax Error, "}}" is required.';
                                    }
                                }
                            } else if(c2 === '%') {
                                scanner.skipWhiteSpace();
                                var word = scanner.readWord();
                                scanner.skipWhiteSpace();
                                pos = scanner.position
                                
                                pos2 = scanner.skipTo('%}');
                                if(pos2 > -1) {
                                    var token = scanner.copy(pos, pos2 - 2);
                                    if(word == 'if' || word == 'elif'){
                                        var parts = token.split(/\s*(and|or|\(|\))\s*/g);
                                        var cs = [];
                                        //var_name = '$var_' + (var_index++);
                                        for(var i = 0; i < parts.length; i++){
                                            var p = parts[i];
                                            if(!(/and|or|\(|\)/.test(p))){
                                                var v = token.replace(this.tag_regex, '$2($1,$3)').replace(/\,\s*\)/g, ')');
                                                if (/^\([\w\.]+\)$/.test(v)){
                                                    v = v.replace(/^\(|\)$/g, '');
                                                    v = '(!!' + v + ' && (!(' + v + ' instanceof Array) || ' + v + '.length > 0))';
                                                }
                                                cs.push(v);
                                            } else if(p == 'and'){
                                                cs.push('&&');
                                            } else if(p == 'or'){
                                                cs.push('||');
                                            } else {
                                                cs.push(p);
                                            }
                                        }
                                        if(word == 'if') {
                                            tag_stack.push('if');
                                            codes.push('if(' + cs.join() + '){');
                                        }else{
                                            codes.push('} else if(' + cs.join() + '){');
                                        }
                                    } else if(word == 'else'){
                                        codes.push('} else {');
                                    } else if(word == 'endfor' || word == 'endif' || word == 'endwith'){
                                        var exp_tag = tag_stack.pop();
                                        if(word == 'end' + exp_tag){
                                            codes.push('}');
                                        } else {
                                            throw 'Syntax Error, Block tag ' + exp_tag + ' required end' + exp_tag + ' as endtag sign.';
                                        }
                                    } else if(word == 'for'){
                                        tag_stack.push('for');
                                        var_name = '$var_' + (var_index++);
                                        codes.push(token.replace(this.for_regex, 'var ' + var_name + '=$3($2,$4);for(var i=0;i<' + var_name + '.length;i++){var $1='+var_name+'[i];').replace(/\,\s*\)/g, ')'));
                                    } else if(word == 'with'){
                                        tag_stack.push('with');
                                        var parts = token.match(this.with_regex);
                                        codes.push('{');
                                        for(var i = 0; i < parts.length; i++){
                                            codes.push('var ' + parts[i] + ';');
                                        }
                                    }
                                }
                            } else if(c2 === '#') {
                                pos2 = scanner.skipTo('#}');
                            } else {
                                codes.push('_html.push("' + scanner.copy(pos, pos2).replace(/("|')/g, '\\$1') + '");');
                            }
                        }
                        break;
                }
            }
            if(pos > pos2) {
                codes.push('_html.push("' + scanner.copy(pos2, pos + 1).replace(/("|')/g, '\\$1') + '");');
            }
            
            if(tag_stack.length > 0){
                throw 'Syntax Error, \"' + tag_stack.join() + '\" need endtag signed.';
            }
            codes.push('} return _html.join(""); }');
            console.log(codes.join(''));
            return {render:eval('(' + codes.join('') + ')')};
        }
    };
    
    surge.compile = _compiler.compile;
    surge.get_template = _compiler.get;
})(this);