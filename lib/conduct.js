var c = require("cull");
var multiRunner = require("./multi-runner");
var when = require("when");
var bane = require("bane");

module.exports = function (groups, reporter) {
    var d = when.defer();

    var noop = function () {};
    var onError = function (e) { console.log("ERR", e.message); };

    when.all(groups.map(c.func("resolve"))).then(function () {
        var runners = groups.map(function (group) {
            return group.environment.createRunner(group.resourceSet);
        });

        when.all(runners.map(c.func("prepare"))).then(function (runs) {
            var runtimes = c.mapcat(c.func("getRuntimes"), runs);
            var hub = bane.aggregate(runs);
            var multi = multiRunner.create(hub, { expectedRuntimes: runtimes.length });

            reporter.listen(multi);

            when.all(c.map(c.func("run"), runs)).then(noop, onError);
            multi.on("suite:end", d.resolve);
        }, onError);
    }, onError);

    return d.promise;
};