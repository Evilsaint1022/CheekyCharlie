const DotDB = require("dotdatabase").default;

const db = {

    economy: new DotDB("./src/Utilities/Storage/economy.json"),
    config: new DotDB("./src/Utilities/Storage/config.json"),

}

module.exports = db;