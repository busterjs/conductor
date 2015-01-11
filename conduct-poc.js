var browserEnv = require("../buster-browser-environment/lib/buster-browser-environment");
var rampResources = require("ramp-resources");
var resourceSet = rampResources.createResourceSet();

var multiRunner = require("./lib/multi-runner");
var when = require("when");

when.all([
    resourceSet.addResource({
        path: "src/1.js",
        content: "var life = 42;"
    }),

    resourceSet.addResource({
        path: "test/1-test.js",
        content: "buster.testCase('Life', { 'is 42': function () { buster.assert.equals(life, 42); } });"
    })
]).then(function () {
    resourceSet.loadPath.append("/src/1.js");
    resourceSet.loadPath.append("/test/1-test.js");
});

var runner = browserEnv.createRunner(resourceSet);
var reporter = require("buster-test").reporters.brief.create();
reporter.listen(multiRunner.create(runner));

// mr.on(function (event, data) {
//     console.log(event, data);
// });

process.on("SIGINT", function () {
    runner.stop(function () {
        process.exit();
    });
});

runner.prepare({ port: "1111", host: "localhost" }).then(function (run) {
    //console.log(run.getRuntimes());

    run.start().then(function () {
        //console.log("All done, thanks for playing");
    }, function () {
        console.log("Run failed");
    });
}, function (e) {
    console.log("Oh noes", e.message);
    process.exit();
});
