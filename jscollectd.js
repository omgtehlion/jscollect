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

var http = require("http");
var path = require("path");

var jscollect = require("./lib");

/*=========================================================================*/

var enc = "utf8";

var inServerMode = false;
var serverPort;

var options = {
    ycssjsCompat: undefined,
    docrootOverride: undefined,
    subst: undefined
};

function normalizeYCssJs(fPath) {
    var fDir = path.dirname(fPath);
    var fName = path.basename(fPath);
    if (fName.charAt(0) === '_')
        fPath = path.resolve(fDir, fName.substr(1));
    return fPath;
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
    "                     if substituted file does not exists then original file is used",
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
                options.docrootOverride = args[++i];
                break;
            case "-subst":
                var subst = args[++i].split(':');
                if (subst.length !== 2) {
                    console.log("Error: invalid --subst argument, must be PATTERN:REPLACEMENT");
                    process.exit(1);
                }
                options.subst = subst;
                break;
            case "-ycssjs":
                options.ycssjsCompat = normalizeYCssJs;
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
    var mw = jscollect.middleware(options);
    var server = http.createServer(function(req, res) {
        try {
            mw(req, res, next);
        } catch(ex) {
            next(ex);
        }
        function next(err) {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end(err);
            } else if (!res.headerSent) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("File " + req.url + " not found");
            }
        };
    });
    server.listen(serverPort);
} else {
    if (options.subst) {
        console.log("Error: --subst flag is valid only in server mode");
        process.exit(1);
    }
    for (var i = 0; i < plainArgs.length; i++) {
        var fPath = plainArgs[i];
        if (options.ycssjsCompat) {
            fPath = options.ycssjsCompat(fPath);
        }
        jscollect.process(fPath, {
            root: options.docrootOverride || process.cwd(),
            write: function(data, enc) { process.stdout.write(data, enc); }
        });
    }
}
