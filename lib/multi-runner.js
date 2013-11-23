"use strict";
var bane = require("bane");

function createRuntime(uuid) {
    return {
        uuid: uuid,
        contexts: 0,
        events: [],
        queue: function (name, data) {
            this.events.push({ name: name, data: data });
        },
        flush: function (emitter) {
            this.events.forEach(function (event) {
                emitter.emit(event.name, event.data);
            });
        }
    };
}

function getRuntime(runtimes, uuid) {
    return runtimes.filter(function (r) {
        return r.uuid === uuid;
    })[0];
}

function proxy(name) {
    return function (e) {
        var rt = getRuntime(this.runtimes, e.uuid);
        if (rt && rt.contexts > 0) {
            rt.queue(name, e);
        } else {
            this.emit(name, e);
        }
    };
}

function endRunWhenDone(runner) {
    var runtimes = runner.runtimes.length;
    if (typeof runner.expectedRuntimes === "number") {
        runtimes = runner.expectedRuntimes;
    }
    var results = runner.results.length + runner.timeouts;
    if (results !== runtimes && runtimes > 0) { return; }

    runner.emit("suite:end", runner.results.reduce(function (res, r) {
        return {
            contexts: (res.contexts || 0) + r.contexts,
            tests: (res.tests || 0) + r.tests,
            errors: (res.errors || 0) + r.errors,
            failures: (res.failures || 0) + r.failures,
            assertions: (res.assertions || 0) + r.assertions,
            timeouts: (res.timeouts || 0) + r.timeouts,
            deferred: (res.deferred || 0) + r.deferred,
            ok: res.ok && r.ok
        };
    }, { ok: true }));
}

function MultiRunner(emitter, options) {
    this.runtimes = [];
    this.results = [];
    this.timeouts = 0;
    this.expectedRuntimes = options.expectedRuntimes;
    emitter.bind(this);
}

module.exports = MultiRunner.prototype = bane.createEventEmitter({
    create: function (emitter, options) {
        return new MultiRunner(emitter, options || {});
    },

    "suite:start": function (e) {
        if (this.runtimes.length === 0) {
            this.emit("suite:start", {});
        }
        this.runtimes.push(createRuntime(e.uuid));
    },

    "suite:configuration": function (e) {
        this.emit("suite:configuration", e);
    },

    "context:unsupported": function (e) {
        var rt = getRuntime(this.runtimes, e.uuid);
        if (rt.contexts === 0) {
            this.emit("context:unsupported", e);
        } else {
            rt.queue("context:unsupported", e);
        }
    },

    "context:start": function (e) {
        var rt = getRuntime(this.runtimes, e.uuid);
        if (this.runtimes.length > 1) {
            rt.queue("context:start", e);
            rt.contexts += 1;
        } else {
            this.emit("context:start", e);
        }
    },

    "test:setUp": proxy("test:setUp"),
    "test:tearDown": proxy("test:tearDown"),
    "test:start": proxy("test:start"),
    "test:error": proxy("test:error"),
    "test:failure": proxy("test:failure"),
    "test:timeout": proxy("test:timeout"),
    "test:success": proxy("test:success"),
    "test:async": proxy("test:async"),
    "test:deferred": proxy("test:deferred"),

    "context:end": function (e) {
        var rt = getRuntime(this.runtimes, e.uuid);
        if (rt) {
            rt.queue("context:end", e);
            rt.contexts -= 1;

            if (rt.contexts <= 0) {
                rt.contexts = 0;
                rt.flush(this);
            }
        } else {
            this.emit("context:end", e);
        }
    },

    "suite:end": function (e) {
        this.results.push(e);
        endRunWhenDone(this);
    },

    "runtime:timeout": function (e) {
        this.timeouts += 1;
        endRunWhenDone(this);
    },

    "runner:focus": function () {
        if (!this.runnerFocus) {
            this.emit("runner:focus");
            this.runnerFocus = true;
        }
    },

    uncaughtException: function (e) {
        this.emit("uncaughtException", e);
    },

    log: function (e) {
        this.emit("log", e);
    }
});
