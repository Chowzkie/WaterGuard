// createDefaultUser.js
const bcrypt = require("bcryptjs");
const UserModel = require("../models/User.js");

async function createDefaultUser() {
    const userCount = await UserModel.countDocuments();

    if (userCount === 0) {
        const hashedPassword = await bcrypt.hash("password123", 10);
        await UserModel.create({
            name: "Admin",
            username: "Admin123",
            password: hashedPassword,
            email: "ChangeThis@gmail.com"
        });
        console.log("Default user has been created: username:Admin123 password:password123");
    } else {
        console.log("Default user already exists");
    }
}

module.exports = createDefaultUser;