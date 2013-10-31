#!/usr/bin/env node

/** @see https://github.com/omgtehlion/jscollect */

var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var http = require("http");
var url = require("url");

var urlfinder = require("./lib/urlfinder");

/*=========================================================================*/

function freezeRemote(filePaths, remote, callback) {
    var urlObj = url.parse(remote, false, true);
    var basePath = urlObj.pathname + (urlObj.search || "");
    var await = 0;
    for (var itemPath in filePaths) {
        var item = filePaths[itemPath];
        if (item.freezed) {
            continue;
        }
        await++;
        var req = http.request({
                method: "HEAD",
                host: urlObj.hostname,
                port: urlObj.port || 80,
                path: basePath + item.hashedName
            }, function(res) {
                if (res.statusCode === 200) {
                    this.freezed = remote + this.hashedName;
                }
                await--;
                if (!await) {
                    await--; // in case we’ve completed syncronously
                    callback();
                }
            }.bind(item)
        );
        req.end();
    }
    if (await === 0) {
        callback();
    }
}

function freezeLocal(filePaths, prefix, fPath, context) {
    for (var itemPath in filePaths) {
        var item = filePaths[itemPath];
        if (item.freezed) {
            continue;
        }
        item.freezed = prefix + item.hashedName;
        var destPath = getAbsPath(item.freezed, context.root, fPath);
        if (!fs_fileExistsSync(destPath)) {
            fs_mkdirRecursiveSync(path.dirname(destPath));
            fs.writeFileSync(destPath, fs.readFileSync(itemPath));
        }
    }
}

function canHandle(urlStr) {
    return !((urlStr.lastIndexOf("//", 0) === 0) || /^\w+:/.test(urlStr));
}

function calcHash(filePath) {
    var hash = crypto.createHash("sha1");
    hash.update(fs.readFileSync(filePath));
    // CPAN’s sha1_base64 does not append padding:
    var digest = hash.digest("base64").replace(/=+$/g, "");
    // url-safe: http://www.faqs.org/rfcs/rfc3548.html
    digest = digest.replace(/\+/g, "-").replace(/\//g, "_");
    // strip leading '-' and '+'
    digest = digest.replace(/^[-+]+/, "");
    // replaces from blacklist
    context.blacklist.forEach(function(itm) {
        digest = digest.replace(itm.tmpl, itm.repl)
    });
    return digest;
}

function getAbsPath(urlStr, root, relativeTo) {
    return urlStr.charAt(0) === "/" ? path.resolve(root, urlStr.substr(1)) : path.resolve(path.dirname(relativeTo), urlStr);
}

function fs_existsSync(itemPath) {
    // TODO: fs.existsSync
    try {
        fs.statSync(itemPath);
        return true;
    } catch (ex) {
        return false;
    }
}

function fs_fileExistsSync(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    } catch (ex) {
        return false;
    }
}

function fs_mkdirRecursiveSync(dirPath) {
    if (!dirPath || fs_existsSync(dirPath))
        return;
    fs_mkdirRecursiveSync(path.dirname(dirPath));
    fs.mkdirSync(dirPath);
}

function writeFreezed(fPath, parsedFile, filePaths, context) {
    parsedFile.forEach(function(item) {
        if (Buffer.isBuffer(item)) {
            context.write(item);
            return;
        }
        try {
            switch (item.type) {
                case "url":
                case "imgLoader":
                    var hash = filePaths[getAbsPath(item.url, context.root, fPath)];
                    var urlStr = (hash && hash.freezed) || item.url;
                    if (item.type === "url")
                        context.write("url(" + urlStr + ")");
                    else
                        context.write("'" + urlStr + "'");
                    break;
                default:
                    throw item.type;
                    break;
            }
        } catch(ex) {
            console.error("------------");
            console.error(JSON.stringify(item));
            throw ex;
        }
    });
}

function processFile(fPath, context) {
    var parsedFile = urlfinder.getParsed(fPath);

    var candidates = parsedFile.filter(function(item) {
        return !Buffer.isBuffer(item)
            && (item.type === "url" || item.type === "imgLoader")
            && canHandle(item.url);
    });

    var filePaths = {};
    candidates.forEach(function(item) {
        var itemPath = getAbsPath(item.url, context.root, fPath);
        if (!filePaths[itemPath] && fs_fileExistsSync(itemPath)) {
            var hash = calcHash(itemPath);
            filePaths[itemPath] = { hash: hash, hashedName: hash + path.extname(itemPath) };
        }
    });

    freezeRemote(filePaths, context.remote, function() {
        freezeLocal(filePaths, context.local, fPath, context);
        writeFreezed(fPath, parsedFile, filePaths, context);
    });
}

/********************************************************************************/

var usage = [
    "Usage: " + path.basename(process.argv[1]) + " [OPTION]... [FILE]...",
    "Freezes images referenced in css FILE and updates references.",
    "",
    "Options:",
    "  -r, --remote URL         specify remote server location where to check image location",
    "  -l, --local PREFIX       specify local directory to freeze images into",
    "  -d, --docroot ROOT       override default document root",
    "                           default is current directory",
    "  -b, --blacklist TEMPLATE blacklist. Example cat:dog,red - cat will replace to dog, and red to 2",
    "  --ycssjs            compatibility mode with YCssJs",
    "  -h, --help          display this help and exit",
    "",
    "Exit status is 0 if OK, 1 if there were problems.",
].join('\n');

var args = process.argv.slice(2);
if (args.length === 0) {
    console.log(usage);
    process.exit(0);
}

var context = {};
context.blacklist = [{
        repl: "~~",
        tmpl: new RegExp("xxx", "gi")
    }, {
        repl: "..",
        tmpl: new RegExp("adv", "gi")
    }, {
        repl: ".~",
        tmpl: new RegExp("ads", "gi")
    }
]
context.write = function(data, enc) { process.stdout.write(data, enc); };
var inFile = "";

for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    var key = /^-(\w|-\w+)(?:\W|$)/.exec(arg);
    if (key && key[1]) {
        switch (key[1]) {
            case "r":
            case "-remote":
                context.remote = args[++i];
                if (context.remote.charAt(context.remote.length - 1) !== '/') {
                    context.remote += '/';
                }
                break;
            case "b":
            case "-blacklist":
                var blacklistArr = args[++i].split(",")
                context.blacklist = []
                for (var i=0; i < blacklistArr.length; i++) {
                    var item = blacklistArr[i].split()
                    context.blacklist.push({
                        repl: item[1] || i,
                        tmpl: new RegExp(item[0], "gi")
                    });
                }
                break;
            case "l":
            case "-local":
                context.local = args[++i];
                if (context.local.charAt(0) !== '/') {
                    context.local = '/' + context.local;
                }
                if (context.local.charAt(context.local.length - 1) !== '/') {
                    context.local += '/';
                }
                break;
            case "d":
            case "-docroot":
                context.root = args[++i];
                break;
            case "-ycssjs":
                context.ycssjs = true;
            case "h":
            case "-help":
                console.log(usage);
                process.exit(0);
                break;
        }
    } else {
        inFile = arg;
    }
}

if (!context.root) {
    context.root = process.cwd();
}
if (inFile) {
    processFile(inFile, context);
} else {
    console.log(usage);
}
