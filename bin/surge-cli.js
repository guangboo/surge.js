var fs = require('fs');
var surge = require('../surge');

if(process.argv.length < 3){
    console.log("Usage: node bin/surge-cli [template.surg] [output.js]");
    console.log("If output.js is not provided, out will be to stdout");
    return;
}

var filename = process.argv[2];
var output_file = process.argv[3];

fs.readFile(filename, {encoding:'utf-8'}, function(err, data){
    var html = surge.compile(data).render;
    html += 'module.exports = anonymous';
    if(output_file) {
        fs.writeFile(output_file, html, function(err){});
    } else {
        process.stdout.write(html);
    }
});
