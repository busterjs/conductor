var ramp = require("ramp");
var rampResources = require("ramp-resources");
var frameworkExtension = require("/Users/christian/projects/busterjs/modules/buster/lib/buster/framework-extension.js");
var wiringExtension = require("/Users/christian/projects/busterjs/modules/buster/lib/buster/wiring-extension.js");
var resourceSet = rampResources.createResourceSet();
var when = require("when");

when.all([
    resourceSet.addResource({
        path: "src/1.js",
        content: "var life = 42;"
    }),

    resourceSet.addResource({
        path: "test/1-test.js",
        content: "buster.testCase('Life', { 'is 42': function () { buster.assert.equals(life, 42); } });"
    }),

    frameworkExtension.addResources(resourceSet),
    wiringExtension.addResources(resourceSet),

    resourceSet.addResource({
        path: "/buster/configure-test-run.js",
        content: "buster.configureTestRun(" + JSON.stringify({
            failOnNoAssertions: true,
            autoRun: true,
            captureConsole: true
        }) + ");"
    })
]).then(function () {
    resourceSet.loadPath.append("/src/1.js");
    resourceSet.loadPath.append("/test/1-test.js");
    resourceSet.loadPath.append("/buster/configure-test-run.js");
});

var rampClient = ramp.createRampClient("1111", "localhost");
console.log("Created ramp client");

rampClient.createSession(resourceSet, {
    staticResourcesPath: false
}).then(function (sessionInitializer) {
    console.log("Created session");

    sessionInitializer.on(function (event, data) {
        console.log(event, data);
    });

    sessionInitializer.onSlaveDeath(function (e) {
        console.log("Death!");
    });

    sessionInitializer.onSessionAbort(function (e) {
        console.log("Session aborted");
    });

    sessionInitializer.initialize().then(function (sessionClient) {
        sessionClient.on("suite:end", function (event, data) {
            console.log("End session");
            sessionClient.endSession();
            rampClient.destroy();
            process.exit();
        });

        console.log("Session initialized");
        var slaves = sessionClient.getInitialSlaves();
        console.log("Slaves", slaves);
    });

}, function (error) {
    console.log("Failed to connect to server. Not up?");
    process.exit();
});
