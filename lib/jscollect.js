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

/*=========================================================================*/

var makeParsed = function(items, content) {
    var result = [];
    var lastInd = 0;
    items.forEach(function(item) {
        if (lastInd > item.range[0])
            throw "unexpected index";
        if (lastInd < item.range[0])
            result.push(new Buffer(content.substring(lastInd, item.range[0]), "utf-8"));
        result.push(item);
        lastInd = item.range[1] + 1;
    });
    if (lastInd < content.length)
        result.push(new Buffer(content.substring(lastInd), "utf-8"));
    return result;
}

/*=========================================================================*/

var jsFile = (function() {
    // js is parsed using a real parser:
    var esprima = require("esprima");

    function traverseTree(node, calls) {
        if (!node.body)
            return;
        node.body.forEach(function(item) {
            if (item.type === "ExpressionStatement") {
                var expr = item.expression;
                if (expr.type === "CallExpression" && expr.callee.type === "Identifier") {
                    switch (expr.callee.name) {
                        case "include":
                            var args = expr.arguments;
                            if (args.length !== 1 && args[0].type !== "Literal")
                                throw args;
                            //var ranged = content.substring(item.range[0], item.range[1] + 1);
                            calls.push({ func: expr.callee.name, arg: args[0].value, range: item.range });
                            break;
                    }
                }
            }
            if (item.consequent)
                traverseTree(item.consequent, calls);
        });
        return calls;
    }

    return {
        parse: function(content) {
            var parsed = esprima.parse(content, { range: true });
            var calls = traverseTree(parsed, []);
            return makeParsed(calls, content);
        },
        process: function(fPath, item, context) {
            processFile(path.resolve(path.dirname(fPath), item.arg), context);
        }
    };
})();

/*=========================================================================*/

var cssFile = (function() {
    // but css is parsed with regexes...
    var stringPat = "(?:(?:'[^'\\r\\n]*')|(?:\"[^\"\\r\\n]*\"))";
    var urlPat = "(?:(?:url\\(\\s*" + stringPat + "\\s*\\))|(?:url\\(\\s*[^\\s\\r\\n'\"]*\\s*\\)))";
    var commentPat = "(?:/\\*[^*]*\\*+(?:[^/][^*]*\\*+)*/)";
    var importPat = "(?:\\@import\\s+(" + urlPat + "|" + stringPat + ");?)";
    var allRx = new RegExp(commentPat + "|" + importPat + "|" + urlPat, "g");
    var urlRx = new RegExp("^" + urlPat + "$");

    function parseUrl(url) {
        if (url.lastIndexOf("url(", 0) === 0)
            url = url.replace(/^url\(\s*/, "").replace(/\s*\)$/, "");
        if (url.charAt(0) === "'" || url.charAt(0) === '"')
            url = url.substr(1, url.length - 2);
        // todo: handle escape and unicode http://www.w3.org/TR/css3-syntax/
        return url;
    }

    function canHandle(url) {
        return !((url.lastIndexOf("//", 0) === 0) || /^\w+:/.test(url));
    }

    return {
        parse: function(content) {
            var found = [];
            var m;
            while (m = allRx.exec(content)) {
                if (m[0].lastIndexOf("/*", 0) === 0) {
                    // skip comment
                } else if (m[0].charAt(0) === "@") {
                    // @import
                    var url = parseUrl(m[1]);
                    if (canHandle(url))
                        found.push({ type: "import", url: url, range: [ m.index, allRx.lastIndex - 1 ] });
                } else if (urlRx.test(m[0])) {
                    // url(...)
                    var url = parseUrl(m[0]);
                    if (canHandle(url))
                        found.push({ type: "url", url: url, range: [ m.index, allRx.lastIndex - 1] });
                } else {
                    console.error({ match: m[0] });
                }
            }
            return makeParsed(found, content);
        },
        process: function(fPath, item, context) {
            var dir = path.dirname(fPath);
            var url = item.url;
            url = url.charAt(0) === "/" ? path.resolve(context.root, url.substr(1)) : path.resolve(dir, url);
            if (item.type === "import") {
                processFile(url, context);
            } else if (item.type === "url") {
                url = path.relative(context.root, url);
                context.write("url(/" + url + ") ", "utf-8");
            } else {
                console.error(item.type);
            }
        }
    };
})();

/*=========================================================================*/

var pathToMetadata = {};
var shaToContent = {};

function processFile(fPath, context) {
    if (context.included[fPath])
        return;
    context.included[fPath] = true;

    // checking in `pathToMetadata`
    var meta = pathToMetadata[fPath];
    var mTime = fs.statSync(fPath).mtime.getTime();
    var binContent;
    if (!meta || meta.mTime !== mTime) {
        var sha1sum = crypto.createHash("sha1");
        binContent = fs.readFileSync(fPath);
        sha1sum.update(binContent);
        meta = pathToMetadata[fPath] = { sha: sha1sum.digest("hex"), mTime: mTime };
        //console.log("meta " + JSON.stringify(meta));
        //watchDir(dir);
    }

    // checking in `shaToContent`
    var parsedFile = shaToContent[meta.sha];
    if (!parsedFile) {
        if (!binContent) {
            //throw "no binary content";
            binContent = fs.readFileSync(fPath);
        }
        shaToContent[meta.sha] = parsedFile = context.filetype.parse(binContent.toString("utf-8"));
    }

    var relPath = path.relative(context.root, fPath);
    context.write("/* " + relPath + ": begin [depth " + context.includeStack.length + "] */\n", "utf-8");
    context.includeStack.push(relPath);

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

exports.process = function(filePath, context) {
    context.filetype = filetypes[path.extname(filePath)];
    context.included = {};
    context.includeStack = [];
    context.write("/* root: " + context.root + " */\n", "utf-8");
    processFile(filePath, context);
}

/*=========================================================================*/

//var watchers = {};

//function watchDir(dir) {
//    if (watchers[dir])
//        return;
//    console.error("watchDir: " + dir);
//    watchers[dir] = fs.watch(dir, function(event, filename) {
//        watcherCallback(event, path.resolve(dir, filename));
//    });
//}

//function watcherCallback(event, filename) {
//    delete pathToSha[filename];
//}

/*=========================================================================*/
