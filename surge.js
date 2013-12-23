// surge.js
// 2013, Theo, https://github.com/guangboo/surge.js
// Licensed under the MIT license.

(function(global) {
    var surge = function() { };
    
    surge.version = '0.1 dev';
    surge.author = 'Theo <guangboo49@gmail.com>';
    suge.debug = false;
    
    var nonSpaceRegex = /\S/;
    
    function isWhiteSpace(str) {
        return !str.test(nonSpaceRegex);
    }
    
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
            this.pos += indx + len;
            return this.pos;
        } else {
            this.pos = this.length;
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
    
    var _compiler = function(){
        var tag_regex = /([^|:=><\s]+)\s*(?:\s*\|\s*(\w+)(?:\s*\:\s*([\w\.\s'",]+)+)?)?/g;
        var for_regex = /(\w+)\s*in\s*([^|:=><\s]+)\s*(?:\s*\|\s*(\w+)(?:\s*\:\s*([\w\.\s'",]+)+)?)?/;
        var with_regex = /((?:\w+)\s*=\s*(?:[\w\.]+))+/g;
        
        var FILTER_SEPARATOR               = '|',
            FILTER_ARGUMENT_SEPARATOR      = ':',
            VARIABLE_ATTRIBUTE_SEPARATOR   = '.',
            BLOCK_TAG_START                = '{%',
            BLOCK_TAG_END                  = '%}',
            VARIABLE_TAG_START             = '{{',
            VARIABLE_TAG_END               = '}}',
            COMMENT_TAG_START              = '{#',
            COMMENT_TAG_END                = '#}';
        var _cache = {};
        
        var get = function(id){
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
        };
        
        var compile = function(source) {
            var scanner = new Scanner(source);
            scanner.skipWhiteSpace();
            var c, c2, c3;
            var pos, pos2;
            var codes = [];
            var html_regs = [];
            codes.push('var _html = [];');
            var var_index = 1;
            var var_name;
            
            while(!scanner.eos()){
                pos = scanner.position;
                c = scanner.pop();
                switch(c) {
                    case '{':
                        if(!scanner.eos()) {
                            if(pos > pos2) {
                                codes.push('_html.push("' + scanner.copy(pos2, pos) + '");');
                            }
                            pos2 = scanner.position;
                            c2 = scanner.pop();
                            if (c2 === '{') {
                                c3 = scanner.pop();
                                if(c3 != '{') {
                                    pos2 = scanner.skipTo('}}');
                                    if(pos2 != -1) {
                                        var token = scanner.copy(pos + 2, pos2 - 2);
                                        var v = token.replace(tag_regex, '$2($1,$3)').replace(/\,\s*\)/g, ')');
                                        codes.push('_html.push(' + v + ');');
                                    } else {
                                        throw 'Syntax Error, "}}" is required.';
                                    }
                                }
                            } else if(c2 === '%') {
                                scanner.skipWhiteSpace();
                                var word = scanner.readWord();
                                scanner.skipWhiteSpace();
                                pos = scanner.skipWhiteSpace();
                                
                                pos3 = scanner.skipTo('%}');
                                if(pos3 > -1) {
                                    var token = scanner.copy(pos + 2, pos3);
                                    if(word == 'if' || word == 'elif'){
                                        var parts = toekn.split(/\s*(and|or|\(|\))\s*/g);
                                        var cs = [];
                                        for(var i = 0; i < parts.length; i++){
                                            var p = parts[i];
                                            if(!(p in ['and', 'or', '(', ')', ''])) {
                                                cs.push('(' + token.replace(tag_regex, '$2($1,$3)').replace(/\,\s*\)/g, ')') + ')');
                                            } else if(p == 'and'){
                                                cs.push('&&');
                                            } else if(p == 'or'){
                                                cs.push('||');
                                            } else {
                                                cs.push(p);
                                            }
                                        }
                                        if(word == 'if') {
                                            codes.push('if(' + cs.join() + '){');
                                        }else{
                                            codes.push('} else if(' + cs.join() + '){');
                                        }
                                    } else if(word == 'else'){
                                        codes.push('} else {');
                                    } else if(word in ['endfor', 'endif', 'endwith']){
                                        codes.push('}');
                                    } else if(word == 'for'){
                                        var_name = '$var_' + (var_index++);
                                        codes.push(token.replace(for_regex, 'var ' + var_name + '=$3($2,$4);for(var i=0;i<' + var_name + '.length;i++){var $1='+var_name+'[i];'));
                                    } else if(word == 'with'){
                                        var parts = token.match(with_regex);
                                        codes.push('{');
                                        for(var i = 0; i < parts.length; i++){
                                            codes.push('var ' + parts[i] + ';');
                                        }
                                    }
                                }
                            } else if(c2 === '#') {
                                scanner.skipTo('#}');
                            }
                        }
                        break;
                }
            }
            return {
                render : function(context) {
                    
                }
            };
        };
    };
    
    surge.compile = _compiler.compile;
    surge.get_template = _compiler.get;
    
    var _builtin = function() { 
        var blocks = {}, filters = [];
        blocks['if'] = function(token) {
            
        };
    };
    
})(this);