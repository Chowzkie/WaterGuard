// server/utils/createDefaultUser.js
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
            contact: "09000000000"
        });
        console.log("Default user has been created: username:Admin123 password:password123");
    } else {
        console.log("Default user is already existed");
    }
}

module.exports = createDefaultUser;