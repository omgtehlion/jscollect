jscollect
=========
JS and CSS utils set

### What is included

#### jscollectd.js
On-the-fly file merger.

This tool finds all calls of `include('path/to/a/file.js');` in your JavaScripts and embeds
thier content in place of invocation.

In CSS it will find all `@import('path/to/another.css')` statements and do the same thing.
All paths to images and other resources will be rewritten accordingly.

#### freeze.js
Tool for “freezing” images in css files.

### How to use

Use `npm install jscollect` to get the latest version.

```
Usage: jscollectd.js [OPTION]... [FILE]...
Combines files referenced in FILEs into one big script or style.
Can be used on separate files or in server mode.

Options:
  -p, --port PORT  specify http port to listen to when running in server mode
  --docroot ROOT   override default document root:
                     for separate files default is current directory
                     for server mode default is value of X-DocumentRoot header
  --ycssjs         compatibility mode with YCssJs
  -h, --help       display this help and exit

To use in server mode add this to your nginx conf-file:
location ~* \.(js|css)(\?.*)?$ {           # or other location of your js and css assets
    proxy_pass http://localhost:PORT       # change PORT to what you’ve specified in --port
    proxy_set_header X-DocumentRoot $root; # $root should be set to your document root
    gzip off                               # we don’t need gzip in development anyways
}

Exit status is 0 if OK, 1 if there were problems.
```

```
Usage: freeze.js [OPTION]... [FILE]...
Freezes images referenced in css FILE and updates references.

Options:
  -r, --remote URL    specify remote server location where to check image location
  -l, --local PREFIX  specify local directory to freeze images into
  -d, --docroot ROOT  override default document root:
                        default is current directory
  --ycssjs            compatibility mode with YCssJs
  -h, --help          display this help and exit
,
Exit status is 0 if OK, 1 if there were problems.
```
