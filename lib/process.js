/*
Copyright © 2012, Anton Drachev <anton@drachev.com>
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

/** @see https://github.com/omgtehlion/jscollect */

var crypto = require("crypto");
var fs = require("fs");
var path = require("path");

var urlfinder = require("./urlfinder");

/*=========================================================================*/

var jsFile = (function() {
    return {
        parse: function(fPath) {
            return urlfinder.getParsed(fPath);
        },
        process: function(fPath, item, context) {
            processFile(path.resolve(path.dirname(fPath), item.arg), context);
        }
    };
})();

/*=========================================================================*/

var cssFile = (function() {
    function canHandle(url) {
        return url && !((url.lastIndexOf("//", 0) === 0) || /^\w+:/.test(url));
    }

    return {
        parse: function(fPath) {
            return urlfinder.getParsed(fPath);
        },
        process: function(fPath, item, context) {
            if (!canHandle(item.url)) {
                context.write(item.raw, "utf-8");
                return;
            }
            var dir = path.dirname(fPath);
            var url = item.url;
            url = url.charAt(0) === "/" ? path.resolve(context.root, url.substr(1)) : path.resolve(dir, url);
            if (item.type === "import") {
                processFile(url, context);
            } else if (item.type === "url") {
                url = path.relative(context.root, url);
                context.write("url(/" + url + ") ", "utf-8");
            } else if (item.type === "imgLoader") {
                url = path.relative(context.root, url);
                context.write("'/" + url + "' ", "utf-8");
            } else {
                console.error(item.type);
            }
        }
    };
})();

/*=========================================================================*/

function processFile(fPath, context) {
    if (context.included[fPath])
        return;
    context.included[fPath] = true;

    var relPath = path.relative(context.root, fPath);
    context.write("/* " + relPath + ": begin [depth " + context.includeStack.length + "] */\n", "utf-8");
    context.includeStack.push(relPath);

    var parsedFile = context.filetype.parse(fPath);
    parsedFile.forEach(function(item) {
        if (Buffer.isBuffer(item)) {
            context.write(item);
            return;
        }
        try {
            context.filetype.process(fPath, item, context);
        } catch(ex) {
            console.error("------------");
            console.error(JSON.stringify(item));
            throw ex;
        }
    });

    context.includeStack.pop();
    context.write("/* " + relPath + ": end */\n", "utf-8");

    return parsedFile;
}

/*=========================================================================*/
var filetypes = { ".js": jsFile, ".css": cssFile };

module.exports = function(filePath, context) {
    context.filetype = filetypes[path.extname(filePath)];
    context.included = {};
    context.includeStack = [];
    context.write("/* root: " + context.root + " */\n", "utf-8");
    processFile(filePath, context);
}
