var platform = require("platform");

module.exports = {
    createRuntime: function (runner, ua, uuid) {
        var client = platform.parse(ua);

        return {
            emit: function (event, data) {
                data = data || {};
                if (event === "suite:configuration") {
                    data.runtime = client;
                }
                data.uuid = uuid;
                runner.emit(event, data);
            }
        };
    }
};
