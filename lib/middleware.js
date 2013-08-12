/**
 * Connect-like middleware for jscollect
 */

/*
Copyright © 2013, Anton Drachev <anton@drachev.com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var fs = require("fs");
var path = require("path");
var url = require("url");

var jscollect_process = require("./process");

/*=========================================================================*/

var enc = "utf8";

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

module.exports = function(options) {
    options = options || {};

    function substitute(fPath) {
        if (!options.subst)
            return fPath;
        var result = fPath.replace(options.subst[0], options.subst[1]);
        try {
            if (fs.statSync(result).isFile())
                return result;
        } catch (ex) { }
        return fPath;
    }

    function jscollectMw(req, res, next) {
        // get requested path:
        var root = path.resolve(options.docrootOverride || req.headers["x-documentroot"]);
        var reqUrl = url.parse(req.url);
        var fPath = path.resolve(root, "." + reqUrl.pathname);

        // some rewriting:
        fPath = substitute(fPath);
        if (options.ycssjsCompat) {
            fPath = options.ycssjsCompat(fPath);
        }

        // delegate 404 and unhandled files to the next handler
        var ctype = contentTypes[path.extname(fPath)];
        if (!ctype || !fs.existsSync(fPath)) {
            return next();
        }

        res.writeHead(200, {
            "Content-Type": ctype,
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
            "Expires": "Thu, 01 Jan 1970 00:00:00 GMT"
        });
        try {
            jscollect_process(fPath, {
                root: root,
                write: function(data, enc) { res.write(data, enc); }
            });
        } catch (ex) {
            writeError(ex, res, path.extname(fPath));
        }
        res.end();
    }
    return jscollectMw;
};
