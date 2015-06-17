// surge.js
// 2013, Theo <guangboo49@gmail.com>, https://github.com/guangboo/surge.js
// Licensed under the MIT license.
(function(global) {
    var surge = global.surge = { };
    
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
    }).register('truncate', function(a, i){
        if(typeof a === 'string') {
            if(a.length > i)
                return a.substring(0, i - 3) + '...';
            return a;
        }
        return a;
    });
    
    function isWhiteSpace(str) { return !/\S/.test(str); }

    function Scanner(src) {
        this.source = src;
        this.position = 0;
        this.length = src.length;
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
    var space_map = {9:'\\t',13:'\\r',10:'\\n'};
    function escap_str(token){
        return token.replace(/("|')/g, '\\$1').replace(/(\t|\r|\n)/g, function(m){ return space_map[m.charCodeAt()]; });
    }

    surge.get_template = function(id){
        var tmplt;
        if(_cache.hasOwnProperty(id)) {
            tmplt = _cache[id];
        } else if('document' in global) {
            var ele = document.getElementById(id);
            if(ele) {
                var src = ele.value || ele.innerHTML;
                tmplt = surge.compile(src.trim());
                _cache[id] = tmplt;
            }
        }
        return tmplt;
    };
    
    surge.compile = function(source) {
        var scanner = new Scanner(source);
        scanner.skipWhiteSpace();
        var c, c2, c3;
        var pos, pos2;
        var codes = '';
        codes += 'var _html = "";var _ = surge.__builtins;';
        var var_index = 1;
        var var_name;
        var tag_stack = [], var_stack = [];
        
        function has_var(v) {
            return var_stack.indexOf(v) !== -1;
        }
        
        function parse_filter(src) {
            var fi = src.lastIndexOf('|');
            if(fi > 0) {
                var p1 = src.substr(0, fi);
                var p2 = src.substr(fi + 1);
                var val = parse_filter(p1);
                var fa = p2.split(':');
                var f = "_." + fa[0].trim();
                if(fa.length > 1)
                    return f + '(' + val + ',' + fa[1].trim() + ')';
                return f + '(' + val + ')';
            } else {
                src = src.trim();
                if(is_constant(src) || has_var(src.split('.')[0]))
                    return src;
                else {
                    return 'context.' + src;
                }
            }
        }
        
        pos2 = scanner.position;
        
        while(!scanner.eos()){
            pos = scanner.position;
            c = scanner.pop();
            switch(c) {
                case '{':
                    if(!scanner.eos()) {
                        if(pos > pos2) {
                            codes += '_html+="' + escap_str(scanner.copy(pos2, pos)) + '";';
                        }
                        pos2 = scanner.position;
                        c2 = scanner.pop();
                        if (c2 === '{') {
                            c3 = scanner.pop();
                            if(c3 != '{') {
                                pos = scanner.position;
                                pos2 = scanner.skipTo('}}');
                                if(pos2 != -1) {
                                    var token = scanner.copy(pos - 1, pos2 - 2).trim();
                                    var v = parse_filter(token);
                                    codes += '_html+=' + v + ';';
                                } else {
                                    throw 'Syntax Error, "}}" is required.';
                                }
                            }
                        } else if(c2 === '%') {
                            scanner.skipWhiteSpace();
                            var word = scanner.readWord();
                            scanner.skipWhiteSpace();
                            pos = scanner.position;
                            
                            pos2 = scanner.skipTo('%}');
                            if(pos2 > -1) {
                                var token = scanner.copy(pos, pos2 - 2).trim();
                                if(word == 'if' || word == 'elif'){
                                    var parts = token.split(/\s*(and|or|\(|\))\s*/g);
                                    var cs = [];
                                    for(var i = 0; i < parts.length; i++){
                                        var p = parts[i];
                                        
                                        if(is_constant(p)){
                                            cs.push(p);
                                        } else if(!(/and|or|\(|\)/.test(p))){
                                            var ps = p.split(/(==|>=|<=|<|>)/);
                                            var v = '';
                                            if(ps.length > 1) {
                                                v = '(';
                                                for(var j = 0; j < ps.length; j++){
                                                    var psi = ps[j];
                                                    if(is_constant(psi) || /==|>=|<=|<|>/.test(psi)) {
                                                        v += psi;
                                                    } else {
                                                        v += parse_filter(psi);
                                                    }
                                                }
                                                v += ')';
                                                cs.push(v);
                                            }else{
                                                v = parse_filter(p);
                                                cs.push('surge.is_true(' + v + ')');
                                            }
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
                                        codes +='if(' + cs.join('') + '){';
                                    }else{
                                        codes += '} else if(' + cs.join('') + '){';
                                    }
                                } else if(word == 'else'){
                                    codes += '} else {';
                                } else if(word == 'endfor' || word == 'endif' || word == 'endwith'){
                                    var exp_tag = tag_stack.pop();
                                    if(word === 'end' + exp_tag){
                                        codes += '}';
                                        if(word === 'endfor' || word === 'endwith') var_stack.pop();
                                    } else {
                                        throw 'Syntax Error, Block tag ' + exp_tag + ' required end' + exp_tag + ' as endtag sign.';
                                    }
                                } else if(word == 'for'){
                                    tag_stack.push('for');
                                    var_name = '$var_' + (var_index++);
                                    
                                    if(regex_for.test(token)) {
                                        var v = parse_filter(RegExp.$2);
                                         var stmpt = 'var ' + var_name + '=' + v + ';',
                                            iIndex='i'+var_name,jIndex='j'+var_name;
                                        stmpt += 'for(var '+iIndex+'=0,'+jIndex+'=' + var_name + '.length;'+iIndex+'<'+jIndex+';'+iIndex+'++){var '+ RegExp.$1 + '='+var_name+'['+iIndex+'];';
                                        var_stack.push(RegExp.$1);
                                        codes += stmpt;
                                    } else {
                                        throw 'Syntax error for "for" expression.';
                                    }
                                } else if(word == 'with'){
                                    tag_stack.push('with');
                                    var parts = token.match(regex_with);
                                    codes += '{';
                                    for(var i = 0; i < parts.length; i++){
                                        var ps = parts[i].split('=');
                                        var v1 = ps[0].trim(), v2 = parse_filter(ps[1].trim());
                                        codes += 'var ' + v1 + '=' + v2 + ';';
                                        var_stack.push(v1);
                                    }
                                }
                            }
                        } else if(c2 === '#') {
                            pos2 = scanner.skipTo('#}');
                        } else {
                            codes += '_html+="' + escap_str(scanner.copy(pos, pos2)) + '";';
                        }
                    }
                    break;
            }
        }
        
        if(pos > pos2) {
            codes += '_html += "' + escap_str(scanner.copy(pos2, pos + 1)) + '";';
        }
        
        if(tag_stack.length > 0){
            throw 'Syntax Error, \"' + tag_stack.join() + '\" need endtag signed.';
        }
        codes += ' return _html;';
        return {render:new Function('context', codes)};
    };
})(this);
