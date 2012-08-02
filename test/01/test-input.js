include("test-include_01.js");

if (true) {
    include("test-include_02.js"); // if
} else if (true) {
    include("test-include_03.js"); // if in alternate
} else {
    include("test-include_04.js"); // alternate in alternate
}

for (var i = 0; i < 2; i++) {
    include("test-include_05.js"); // for
}

while (true) {
    include("test-include_06.js"); // while 
}

switch ("a") {
    case "b":
        include("test-include_07.js"); // swithc - case
    default:
        include("test-include_08.js"); // switch - default
}

var a = include("test-include_09.js"); // in variable
b = include("test-include_12.js"); // in variable without declaration
function s() {
    include("test-include_10.js"); // in function
}
var c = function() {
    include("test-include_11.js"); // in variable with function
}
