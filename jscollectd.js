#!/usr/bin/env node

/**
 * JS and CSS on-the-fly file merger
 * @see https://github.com/omgtehlion/jscollect
 *
 * dependencies:
 *      node: http://nodejs.org/
 *      esprima.js: https://github.com/ariya/esprima
 * for license information see license.txt
 */

var fs = require("fs");
var http = require("http");
var path = require("path");
var url = require("url");

var jscollect = require("./lib/jscollect");

/*=========================================================================*/

var inServerMode = false;
var ycssjsCompat = false;
var serverPort;
var docrootOverride;
var subst;

/*=========================================================================*/

function normalizeYCssJs(fPath) {
    var fDir = path.dirname(fPath);
    var fName = path.basename(fPath);
    if (fName.charAt(0) === '_')
        fPath = path.resolve(fDir, fName.substr(1));
    return fPath;
}

var contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
}

function writeError(ex, response, fileType) {
    var message = ex.toString();
    switch (fileType) {
        case ".css":
            response.write("body:after {" +
                "display: block;" +
                "background: #fff;" +
                "position: absolute;" +
                "left: 0; top: 0;" +
                "z-index: 99999;" +
                "color: #900;" +
                "border: solid 2px #f00;" +
                "padding: 10px;" +
                "content: " + JSON.stringify(message) + ";" +
            "}\n");
            break;
        default:
            response.write("alert(" + JSON.stringify(message) + ");\n");
            response.write("debugger;");
            break;
    }
}

function substitute(fPath) {
    if (!subst)
        return fPath;
    var result = fPath.replace(subst[0], subst[1]);
    try {
        if (fs.statSync(result).isFile())
            return result;
    } catch (ex) { }
    return fPath;
}

function handleRequest(request, response) {
    try {
        var root = path.resolve(docrootOverride || request.headers["x-documentroot"]);
        var reqUrl = url.parse(request.url);
        var fPath = path.resolve(root, "." + reqUrl.pathname);
        fPath = substitute(fPath);
        if (ycssjsCompat) {
            fPath = normalizeYCssJs(fPath);
        }
        response.writeHead(200, {
            "Content-Type": contentTypes[path.extname(fPath)],
            "Cache-Control": "private, no-cache, no-store, must-revalidate, s-maxage=0",
            "Expires": "Thu, 01 Jan 1970 00:00:00 GMT"
        });
        jscollect.process(fPath, {
            root: root,
            write: function(data, enc) { response.write(data, enc); }
        });
    } catch (ex) {
        writeError(ex, response, path.extname(fPath));
        console.error(ex);
    }
    response.end();
}

/*=========================================================================*/

var usage = [
    "Usage: " + path.basename(process.argv[1]) + " [OPTION]... [FILE]...",
    "Combines files referenced in FILEs into one big script or style.",
    "Can be used on separate files or in server mode.",
    "",
    "Options:",
    "  -p, --port PORT  specify http port to listen to when running in server mode",
    "  --docroot ROOT   override default document root:",
    "                     for separate files default is current directory",
    "                     for server mode default is value of X-DocumentRoot header",
    "  --subst PAT:REP  replaces pattern PAT in input file name with replacement REP",
    "                     valid only in server mode",
    "                     replacement is executed only on file name, not the whole path",
    "                     if substituted file does not exists then original file name used",
    "  --ycssjs         compatibility mode with YCssJs",
    "  -h, --help       display this help and exit",
    //"  --version        output version information and exit",
    "",
    "To use in server mode add this to your nginx conf-file:",
    "location ~* \\.(js|css)(\\?.*)?$ {           # or other location of your js and css assets",
    "    proxy_pass http://localhost:PORT       # change PORT to what you’ve specified in --port",
    "    proxy_set_header X-DocumentRoot $root; # $root should be set to your document root",
    "    gzip off                               # we don’t need gzip in development anyways",
    "}",
    "",
    "Exit status is 0 if OK, 1 if there were problems.",
].join('\n');

var args = process.argv.slice(2);
if (args.length === 0) {
    console.log(usage);
    process.exit(0);
}

var plainArgs = [];
for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    var key = /^-(\w|-\w+)(?:\W|$)/.exec(arg);
    if (key && key[1]) {
        switch (key[1]) {
            case "p":
            case "-port":
                inServerMode = true;
                serverPort = parseInt(args[++i]);
                break;
            case "-docroot":
                docrootOverride = args[++i];
                break;
            case "-subst":
                subst = args[++i].split(':');
                if (subst.length !== 2) {
                    console.log("Error: invalid --subst argument, must be PATTERN:REPLACEMENT");
                    process.exit(1);
                }
                break;
            case "-ycssjs":
                ycssjsCompat = true;
                break;
            case "h":
            case "-help":
                console.log(usage);
                process.exit(0);
                break;
        }
    } else {
        plainArgs.push(arg);
    }
}

/*=========================================================================*/

if (inServerMode) {
    if (plainArgs.length > 0) {
        console.log("Input files are not allowed when running in server mode\n"+
            "Try `" + path.basename(process.argv[1]) + " --help' for more information.");
        process.exit(1);
    }
    var server = http.createServer(handleRequest);
    server.listen(serverPort);
} else {
    if (subst) {
        console.log("Error: --subst flag is valid only in server mode");
        process.exit(1);
    }
    for (var i = 0; i < plainArgs.length; i++) {
        var fPath = plainArgs[i];
        if (ycssjsCompat) {
            fPath = normalizeYCssJs(fPath);
        }
        jscollect.process(fPath, {
            root: docrootOverride || process.cwd(),
            write: function(data, enc) { process.stdout.write(data, enc); }
        });
    }
}
