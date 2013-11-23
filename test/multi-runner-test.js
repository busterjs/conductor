"use strict";
var buster = require("buster-node");
var bane = require("bane");
var assert = buster.assert;
var refute = buster.refute;
var multiRunner = require("../lib/multi-runner");
var helper = require("./helper");

buster.testCase("Runtime throttler", {
    setUp: function () {
        this.runner = bane.createEventEmitter();
        this.multiRunner = multiRunner.create(this.runner);

        this.firefox = helper.createRuntime(
            this.runner,
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:16.0) Gecko/20100101 Firefox/16.0",
            "3122ebf2-1b5b-44b5-97dd-2ebd2898b95c"
        );

        this.chrome = helper.createRuntime(
            this.runner,
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.94 Safari/537.4",
            "3023ddac-670d-4e32-a99d-25ae32398c11"
        );

        this.listener = this.spy();
    },

    "proxies first suite:start": function () {
        this.multiRunner.on("suite:start", this.listener);
        this.firefox.emit("suite:start");

        assert.calledOnce(this.listener);
        assert.equals(this.listener.args[0][0], {});
    },

    "does not proxy multiple suite:starts": function () {
        this.multiRunner.on("suite:start", this.listener);
        this.firefox.emit("suite:start");
        this.chrome.emit("suite:start");

        assert.calledOnce(this.listener);
    },

    "proxies multiple suite:configurations": function () {
        this.multiRunner.on("suite:configuration", this.listener);
        this.firefox.emit("suite:start");
        this.chrome.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.chrome.emit("suite:configuration", { tests: 3 });

        assert.calledTwice(this.listener);
        assert.match(this.listener.args[0][0], {
            tests: 2,
            runtime: { description: "Firefox" }
        });
        assert.match(this.listener.args[1][0], {
            tests: 3,
            runtime: { description: "Chrome" }
        });
    },

    "proxies only one runner:focus": function () {
        this.multiRunner.on("runner:focus", this.listener);
        this.firefox.emit("suite:start");
        this.chrome.emit("suite:start");
        this.firefox.emit("runner:focus");
        this.chrome.emit("runner:focus");

        assert.calledOnce(this.listener);
    },

    "proxies uncaughtException": function () {
        this.multiRunner.on("uncaughtException", this.listener);
        this.firefox.emit("suite:start");
        this.chrome.emit("suite:start");
        this.firefox.emit("uncaughtException", { ex: 1 });
        this.chrome.emit("uncaughtException", { ex: 2 });

        assert.calledTwice(this.listener);
        assert.match(this.listener.args[0][0], { ex: 1 });
        assert.match(this.listener.args[1][0], { ex: 2 });
    },

    "proxies log": function () {
        this.multiRunner.on("log", this.listener);
        this.firefox.emit("suite:start");
        this.chrome.emit("suite:start");
        this.firefox.emit("log", { level: "log" });
        this.chrome.emit("log", { level: "info" });

        assert.calledTwice(this.listener);
        assert.match(this.listener.args[0][0], { level: "log" });
        assert.match(this.listener.args[1][0], { level: "info" });
    },

    "proxies top-level context:unsupported": function () {
        this.multiRunner.on("context:unsupported", this.listener);
        this.firefox.emit("suite:start");
        this.chrome.emit("suite:start");
        this.firefox.emit("context:unsupported", { unsupported: [1] });
        this.chrome.emit("context:unsupported", { unsupported: [2] });

        assert.calledTwice(this.listener);
        assert.match(this.listener.args[0][0], { unsupported: [1] });
        assert.match(this.listener.args[1][0], { unsupported: [2] });
    },

    "does not immediately proxy context:start": function () {
        this.multiRunner.on("context:start", this.listener);
        this.firefox.emit("suite:start");
        this.chrome.emit("suite:start");
        this.firefox.emit("context:start", { name: "Stuff" });

        refute(this.listener.called);
    },

    "does not immediately proxy sub-context events": function () {
        this.multiRunner.on("context:start", this.listener);
        this.multiRunner.on("context:unsupported", this.listener);
        this.multiRunner.on("test:setUp", this.listener);
        this.multiRunner.on("test:start", this.listener);
        this.multiRunner.on("test:error", this.listener);
        this.multiRunner.on("test:failure", this.listener);
        this.multiRunner.on("test:timeout", this.listener);
        this.multiRunner.on("test:success", this.listener);
        this.multiRunner.on("test:async", this.listener);
        this.multiRunner.on("test:deferred", this.listener);
        this.multiRunner.on("test:tearDown", this.listener);
        this.chrome.emit("suite:start");
        this.firefox.emit("suite:start");
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("context:unsupported", { unsupported: [] });
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.firefox.emit("test:start", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #1" });
        this.firefox.emit("test:tearDown", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #2" });
        this.firefox.emit("test:async", { name: "test #3" });
        this.firefox.emit("test:timeout", { name: "test #3" });
        this.firefox.emit("test:success", { name: "test #4" });
        this.firefox.emit("test:deferred", { name: "test #5" });

        refute(this.listener.called);
    },

    "proxies events when exiting top-level context": function () {
        this.multiRunner.on("context:start", this.listener);
        this.multiRunner.on("context:unsupported", this.listener);
        this.multiRunner.on("test:setUp", this.listener);
        this.multiRunner.on("test:start", this.listener);
        this.multiRunner.on("test:error", this.listener);
        this.multiRunner.on("test:failure", this.listener);
        this.multiRunner.on("test:timeout", this.listener);
        this.multiRunner.on("test:success", this.listener);
        this.multiRunner.on("test:async", this.listener);
        this.multiRunner.on("test:deferred", this.listener);
        this.multiRunner.on("test:tearDown", this.listener);
        this.multiRunner.on("context:end", this.listener);
        this.chrome.emit("suite:start");
        this.firefox.emit("suite:start");
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("context:unsupported", { unsupported: [] });
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.firefox.emit("test:start", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #1" });
        this.firefox.emit("test:tearDown", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #2" });
        this.firefox.emit("test:async", { name: "test #3" });
        this.firefox.emit("test:timeout", { name: "test #3" });
        this.firefox.emit("test:success", { name: "test #4" });
        this.firefox.emit("test:deferred", { name: "test #5" });
        this.firefox.emit("context:end", { name: "Stuff" });

        assert.equals(this.listener.callCount, 12);
    },

    "proxies events continuously with one runtime": function () {
        this.multiRunner.on("context:start", this.listener);
        this.multiRunner.on("context:unsupported", this.listener);
        this.multiRunner.on("test:setUp", this.listener);
        this.multiRunner.on("test:start", this.listener);
        this.multiRunner.on("test:error", this.listener);
        this.multiRunner.on("test:failure", this.listener);
        this.multiRunner.on("test:timeout", this.listener);
        this.multiRunner.on("test:success", this.listener);
        this.multiRunner.on("test:async", this.listener);
        this.multiRunner.on("test:deferred", this.listener);
        this.multiRunner.on("test:tearDown", this.listener);
        this.multiRunner.on("context:end", this.listener);
        this.firefox.emit("suite:start");
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("context:unsupported", { unsupported: [] });
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.firefox.emit("test:start", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #1" });
        this.firefox.emit("test:tearDown", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #2" });
        this.firefox.emit("test:async", { name: "test #3" });
        this.firefox.emit("test:timeout", { name: "test #3" });
        this.firefox.emit("test:success", { name: "test #4" });
        this.firefox.emit("test:deferred", { name: "test #5" });

        assert.equals(this.listener.callCount, 11);
    },

    "switches from continuously to proxied when new runtime joins in": function () {
        this.multiRunner.on("context:start", this.listener);
        this.multiRunner.on("context:unsupported", this.listener);
        this.multiRunner.on("test:setUp", this.listener);
        this.multiRunner.on("test:start", this.listener);
        this.multiRunner.on("test:error", this.listener);
        this.multiRunner.on("test:failure", this.listener);
        this.multiRunner.on("test:timeout", this.listener);
        this.multiRunner.on("test:success", this.listener);
        this.multiRunner.on("test:async", this.listener);
        this.multiRunner.on("test:deferred", this.listener);
        this.multiRunner.on("test:tearDown", this.listener);
        this.multiRunner.on("context:end", this.listener);
        this.firefox.emit("suite:start");
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("context:unsupported", { unsupported: [] });
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.chrome.emit("suite:start"); // <=
        this.firefox.emit("test:start", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #1" });
        this.firefox.emit("test:tearDown", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #2" });
        this.firefox.emit("test:async", { name: "test #3" });
        this.firefox.emit("test:timeout", { name: "test #3" });
        this.firefox.emit("test:success", { name: "test #4" });
        this.firefox.emit("test:deferred", { name: "test #5" });
        this.firefox.emit("context:end", { name: "Stuff" });
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("context:unsupported", { unsupported: [] });
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.firefox.emit("test:start", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #1" });
        this.firefox.emit("test:tearDown", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #2" });
        this.firefox.emit("test:async", { name: "test #3" });
        this.firefox.emit("test:timeout", { name: "test #3" });
        this.firefox.emit("test:success", { name: "test #4" });
        this.firefox.emit("test:deferred", { name: "test #5" });

        assert.equals(this.listener.callCount, 12);
    },

    "does not immediately emit suite:end when multiple runtimes": function () {
        this.multiRunner.on("suite:end", this.listener);
        this.firefox.emit("suite:start");
        this.chrome.emit("suite:start");
        this.firefox.emit("suite:end", {});

        refute.called(this.listener);
    },

    "emits emit suite:end with combined results": function () {
        this.multiRunner.on("suite:end", this.listener);
        this.firefox.emit("suite:start");
        this.chrome.emit("suite:start");
        this.firefox.emit("suite:end", {
            contexts: 2,
            tests: 2,
            errors: 0,
            failures: 0,
            assertions: 2,
            timeouts: 0,
            deferred: 2,
            ok: true
        });

        this.chrome.emit("suite:end", {
            contexts: 2,
            tests: 2,
            errors: 2,
            failures: 2,
            assertions: 2,
            timeouts: 2,
            deferred: 2,
            ok: false
        });

        assert.equals(this.listener.args[0][0], {
            contexts: 4,
            tests: 4,
            errors: 2,
            failures: 2,
            assertions: 4,
            timeouts: 2,
            deferred: 4,
            ok: false
        });
    },

    "stops waiting for runtime after timeout": function () {
        this.multiRunner.on("suite:end", this.listener);

        this.chrome.emit("suite:start"); // <=
        this.firefox.emit("suite:start");
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.firefox.emit("test:start", { name: "test #1" });
        this.firefox.emit("test:error", { name: "test #1" });
        this.firefox.emit("test:tearDown", { name: "test #1" });
        this.firefox.emit("context:end", { name: "Stuff" });
        this.firefox.emit("suite:end", { name: "Stuff" });
        this.chrome.emit("runtime:timeout");

        assert.calledOnce(this.listener);
    },

    "waits for announced runtimes": function () {
        this.multiRunner.expectedRuntimes = 2;
        this.multiRunner.on("suite:end", this.listener);

        this.firefox.emit("suite:start");
        this.firefox.emit("suite:end");
        refute.called(this.listener);

        this.chrome.emit("suite:start");
        this.chrome.emit("suite:end");
        assert.called(this.listener);
    }
});
