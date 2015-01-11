var busterTest = require("buster-test");
var rampResources = require("ramp-resources");
var path = require("path");
var when = require("when");

var timer, contexts = [], resourceSet = rampResources.createResourceSet();

when(resourceSet.addFileResource("node-test.js")).then(function () {
    resourceSet.loadPath.append("/node-test.js");

    busterTest.testContext.on("create", function (context) {
        console.log(context);
        contexts.push(context);
    });

    resourceSet.loadPath.paths().map(function (p) {
        return path.join(resourceSet.rootPath, p);
    }).forEach(require);
    var runner = busterTest.testRunner.create();

    runner.on(function (event, data) {
        console.log(event, data);
    });

    runner.runSuite(busterTest.testContext.compile(contexts, []));
}).catch(function (e) {
    console.log(e.message, e.stack);
    console.log("O- M- G");
});
