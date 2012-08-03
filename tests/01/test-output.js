/* root: /home/rewle/jscollect/tests/01 */
/* test-input.js: begin [depth 0] */
/* test-include_1.js: begin [depth 1] */
//Success including
//Success including
//Success including
/* test-include_1.js: end */


if (true) {
    /* test-include_2.js: begin [depth 1] */
//Success including
//Success including
//Success including
/* test-include_2.js: end */
 // if
} else if (true) {
    include("test-include_3.js"); // if in alternate
} else {
    include("test-include_4.js"); // alternate in alternate
}

for (var i = 0; i < 2; i++) {
    include("test-include_5.js"); // for
}

while (true) {
    include("test-include_6.js"); // while 
}

switch ("a") {
    case "b":
        include("test-include_7.js"); // swithc - case
    default:
        include("test-include_8.js"); // switch - default
}

var a = include("test-include_9.js"); // in variable
b = include("test-include_12.js"); // in variable without declaration
function s() {
    include("test-include_10.js"); // in function
}
var c = function() {
    include("test-include_11.js"); // in variable with function
}
/* test-input.js: end */
