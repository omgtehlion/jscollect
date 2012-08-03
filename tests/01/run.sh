#!/bin/bash
echo "Run test"
for i in {1..12}
do
    echo "//Success including" >> test-include_$i.js
    
done

echo "Check not included files"
../../jscollectd.js test-input.js > test-output.js
grep "include("  test-output.js

rm -rf test-include_*

echo "Finish"
