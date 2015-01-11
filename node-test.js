var buster = require("buster");
var life = 42;
console.log("Hello?");

buster.testCase("Imma POC", {
    "life": function () {
        buster.assert.equals(life, 42);
    }
});
