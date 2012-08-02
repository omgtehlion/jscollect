#!/bin/bash
echo "Run test"
echo "Check not included files"
../../jscollectd.js test-input.js > test-output.js
grep "include("  test-output.js
echo "Finish"
