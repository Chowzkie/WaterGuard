const mongoose = require("mongoose");

const UserScheme = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    email: String,
    profileImage: String,
    
    resetPasswordOTP: String,
    resetPasswordExpires: Date 
})

const UserModel = mongoose.model("User", UserScheme)

module.exports = UserModel;