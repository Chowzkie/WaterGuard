const mongoose = require("mongoose")

const connectDB = async() => {
    try{
        await mongoose.connect("mongodb+srv://WaterGuard:p1hv6uI5qM6qK6Hu@cluster0.euoms4a.mongodb.net/User");
        console.log("MongoDB connected")
    }catch(err){
        console.error("Database connnection to MongoDB is failed", err.message);
        process.exit(1);
    }
}

module.exports = connectDB