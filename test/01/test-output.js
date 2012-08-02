/* root: /home/rewle/jscollect/test/01 */
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[0,6]},"arguments":[{"type":"Literal","value":"test-include_01.js","range":[8,27]}],"range":[0,28]},"range":[0,29]}
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[48,54]},"arguments":[{"type":"Literal","value":"test-include_02.js","range":[56,75]}],"range":[48,76]},"range":[48,77]}
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[108,114]},"arguments":[{"type":"Literal","value":"test-include_03.js","range":[116,135]}],"range":[108,136]},"range":[108,137]}
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[171,177]},"arguments":[{"type":"Literal","value":"test-include_04.js","range":[179,198]}],"range":[171,199]},"range":[171,200]}
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[265,271]},"arguments":[{"type":"Literal","value":"test-include_05.js","range":[273,292]}],"range":[265,293]},"range":[265,294]}
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[325,331]},"arguments":[{"type":"Literal","value":"test-include_06.js","range":[333,352]}],"range":[325,353]},"range":[325,354]}
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[406,412]},"arguments":[{"type":"Literal","value":"test-include_07.js","range":[414,433]}],"range":[406,434]},"range":[406,435]}
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[475,481]},"arguments":[{"type":"Literal","value":"test-include_08.js","range":[483,502]}],"range":[475,503]},"range":[475,504]}
{"type":"ExpressionStatement","expression":{"type":"AssignmentExpression","operator":"=","left":{"type":"Identifier","name":"b","range":[583,583]},"right":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[587,593]},"arguments":[{"type":"Literal","value":"test-include_12.js","range":[595,614]}],"range":[587,615]},"range":[583,615]},"range":[583,616]}
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[672,678]},"arguments":[{"type":"Literal","value":"test-include_10.js","range":[680,699]}],"range":[672,700]},"range":[672,701]}
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"include","range":[745,751]},"arguments":[{"type":"Literal","value":"test-include_11.js","range":[753,772]}],"range":[745,773]},"range":[745,774]}
/* test-input.js: begin [depth 0] */
{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"Identifier","name":"alert","range":[20,24]},"arguments":[{"type":"Literal","value":1,"range":[26,26]}],"range":[20,27]},"range":[20,28]}
/* test-include_01.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_01.js: end */
;

if (true) {
    /* test-include_02.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_02.js: end */
; // if
} else if (true) {
    /* test-include_03.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_03.js: end */
; // if in alternate
} else {
    /* test-include_04.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_04.js: end */
; // alternate in alternate
}

for (var i = 0; i < 2; i++) {
    /* test-include_05.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_05.js: end */
; // for
}

while (true) {
    /* test-include_06.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_06.js: end */
; // while 
}

switch ("a") {
    case "b":
        /* test-include_07.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_07.js: end */
; // swithc - case
    default:
        /* test-include_08.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_08.js: end */
; // switch - default
}

var a = /* test-include_09.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_09.js: end */
; // in variable
b = /* test-include_12.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_12.js: end */
; // in variable without declaration
function s() {
    /* test-include_10.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_10.js: end */
; // in function
}
var c = function() {
    /* test-include_11.js: begin [depth 1] */
//Success including
alert(1);
/* test-include_11.js: end */
; // in variable with function
}
/* test-input.js: end */
