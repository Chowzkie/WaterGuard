const mongoose = require("mongoose")

const connectDB = async() => {
    try{
        await mongoose.connect(process.env.MONGO_URI); //local db
        console.log("MongoDB connected")
    }catch(err){
        console.error("Database connnection to MongoDB is failed", err.message);
        process.exit(1);
    }
}

module.exports = connectDB