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

/**
 * @private
 *
 * This function mixes in unprocessed Buffers into Items array
 */
var makeParsed = function(items, content) {
    var result = [];
    var lastInd = 0;
    items.forEach(function(item) {
        if (lastInd > item.range[0])
            throw "makeParsed: unexpected index " + item.range[0];
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

    function traverseTree(item, calls) {
        if (!item) {
            return calls;
        }
        switch (item.type) {
            case "AssignmentExpression":
                traverseTree(item.right, calls);
                break;
            case "CallExpression":
                if (item.callee.type === "Identifier" && item.callee.name === "include") {
                    var args = item.arguments;
                    if (args.length !== 1 && args[0].type !== "Literal")
                        throw args;
                    calls.push({ func: item.callee.name, arg: args[0].value, range: item.range });
                }
                break;
            case "ExpressionStatement":
                traverseTree(item.expression, calls);
                break;
            case "VariableDeclaration":
                item.declarations.forEach(function(node) {
                    traverseTree(node.init, calls);
                });
                break;
            case "ForStatement":
            case "WhileStatement":
            case "FunctionExpression":
            case "FunctionDeclaration":
                traverseTree(item.body, calls);
                break;
            case "IfStatement":
                traverseTree(item.consequent, calls);
                traverseTree(item.alternate, calls);
                break;
            case "SwitchStatement":
                item.cases.forEach(function(nodes) {
                    nodes.consequent.forEach(function(node) {
                        traverseTree(node, calls);
                    });
                });
                break;
            case "Program":
            case "BlockStatement":
                if (item.body) {
                    item.body.forEach(function(node) {
                        traverseTree(node, calls);
                    });
                }
                break;
        }
        return calls;
    }

    return function(content) {
        var parsed = esprima.parse(content, { range: true });
        var calls = traverseTree(parsed, []);
        return makeParsed(calls, content);
    };
})();

/*=========================================================================*/

var cssFile = (function() {
    // but css is parsed with regexes...
    var stringPat = "(?:(?:'[^'\\r\\n]*')|(?:\"[^\"\\r\\n]*\"))";
    var commentPat = "(?:/\\*[^*]*\\*+(?:[^/][^*]*\\*+)*/)";
    var importPat = "(?:\\@import\\s+(" + urlPat + "|" + stringPat + ");?)";
    var urlPat = "(?:(?:url\\(\\s*" + stringPat + "\\s*\\))|(?:url\\(\\s*[^\\s\\r\\n'\"]*\\s*\\)))";
    // filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src='path/to/image.png',sizingMethod=scale);
    var imgLoaderPat = "(?:AlphaImageLoader\\s*\\(src=\\s*(" + stringPat + ")[^)]*\\))";
    var allRx = new RegExp(commentPat + "|" + importPat + "|" + urlPat + "|" + imgLoaderPat, "g");
    var urlRx = new RegExp("^" + urlPat + "$");
    var imgLoaderRx = new RegExp("^" + imgLoaderPat + "$");

    function parseUrl(url) {
        if (url.lastIndexOf("url(", 0) === 0)
            url = url.replace(/^url\(\s*/, "").replace(/\s*\)$/, "");
        if (url.charAt(0) === "'" || url.charAt(0) === '"')
            url = url.substr(1, url.length - 2);
        // todo: handle escape and unicode http://www.w3.org/TR/css3-syntax/
        return url;
    }

    return function(content) {
        var found = [];
        var m, im;
        while (m = allRx.exec(content)) {
            var item = { range: [m.index, allRx.lastIndex - 1], raw: m[0] };
            if (m[0].lastIndexOf("/*", 0) === 0) {
                // skip comment
            } else if (m[0].charAt(0) === "@") {
                // @import
                item.type = "import";
                item.url = parseUrl(m[1]);
                found.push(item);
            } else if (urlRx.test(m[0])) {
                // url(...)
                item.type = "url";
                item.url = parseUrl(m[0]);
                found.push(item);
            } else if (im = imgLoaderRx.exec(m[0])) {
                // AlphaImageLoader(src='...')
                item.type = "imgLoader";
                item.url = parseUrl(im[1]);
                // move range closer to url
                item.range[0] += m[0].indexOf(im[1]);
                item.range[1] = item.range[0] + im[1].length - 1;
                found.push(item);
            } else {
                console.error(item);
            }
        }
        return makeParsed(found, content);
    };
})();

/*=========================================================================*/

var filetypes = { ".js": jsFile, ".css": cssFile };
var pathToMetadata = {};
var shaToContent = {};

exports.getParsed = function(filePath) {
    // checking in `pathToMetadata`
    var meta = pathToMetadata[filePath];
    var mTime = fs.statSync(filePath).mtime.getTime();
    var binContent;
    if (!meta || meta.mTime !== mTime) {
        var sha1sum = crypto.createHash("sha1");
        binContent = fs.readFileSync(filePath);
        sha1sum.update(binContent);
        meta = pathToMetadata[filePath] = { sha: sha1sum.digest("hex"), mTime: mTime };
        //watchDir(dir);
    }

    // checking in `shaToContent`
    var parsedFile = shaToContent[meta.sha];
    if (!parsedFile) {
        if (!binContent) {
            //throw "no binary content";
            binContent = fs.readFileSync(filePath);
        }
        var parser = filetypes[path.extname(filePath)];
        shaToContent[meta.sha] = parsedFile = parser(binContent.toString("utf-8"));
    }

    return parsedFile;
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
