jscollect
=========
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
