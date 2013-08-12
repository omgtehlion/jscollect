/* root: /home/xmm/remusic/node_modules/jscollect/tests/01 */
/* test-input.js: begin [depth 0] */
/* test-include_1.js: begin [depth 1] */
//Success including
/* test-include_1.js: end */
;

if (true) {
    /* test-include_2.js: begin [depth 1] */
//Success including
/* test-include_2.js: end */
; // if
} else if (true) {
    /* test-include_3.js: begin [depth 1] */
//Success including
/* test-include_3.js: end */
; // if in alternate
} else {
    /* test-include_4.js: begin [depth 1] */
//Success including
/* test-include_4.js: end */
; // alternate in alternate
}

for (var i = 0; i < 2; i++) {
    /* test-include_5.js: begin [depth 1] */
//Success including
/* test-include_5.js: end */
; // for
}

while (true) {
    /* test-include_6.js: begin [depth 1] */
//Success including
/* test-include_6.js: end */
; // while 
}

switch ("a") {
    case "b":
        /* test-include_7.js: begin [depth 1] */
//Success including
/* test-include_7.js: end */
; // swithc - case
    default:
        /* test-include_8.js: begin [depth 1] */
//Success including
/* test-include_8.js: end */
; // switch - default
}

var a = /* test-include_9.js: begin [depth 1] */
//Success including
/* test-include_9.js: end */
; // in variable
b = /* test-include_12.js: begin [depth 1] */
//Success including
/* test-include_12.js: end */
; // in variable without declaration
function s() {
    /* test-include_10.js: begin [depth 1] */
//Success including
/* test-include_10.js: end */
; // in function
}
var c = function() {
    /* test-include_11.js: begin [depth 1] */
//Success including
/* test-include_11.js: end */
; // in variable with function
}
/* test-input.js: end */
