var nonSpaceRegex = /\S/;
    
function isWhiteSpace(str) {
    return !nonSpaceRegex.test(str);
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
                            scanner.skipTo('#}');
                        }
                    }
                    break;
            }
        }
        if(tag_stack.length > 0){
            throw 'Syntax Error, \"' + tag_stack.join() + '\" need endtag signed.';
        }
        codes.push('} return _html.join(""); }');
        console.log(codes.join(''));
        return eval('(' + codes.join('') + ')');
    }
};