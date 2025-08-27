const mongoose = require("mongoose");

const UserScheme = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    contact: String
})

const UserModel = mongoose.model("User", UserScheme)

module.exports = UserModel;