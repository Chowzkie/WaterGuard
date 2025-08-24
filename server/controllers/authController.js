// server/controllers/authController.js
const bcrypt = require("bcryptjs");
const UserModel = require("../models/User");
const jwt = require("jsonwebtoken"); 


// Generate a secret key for signing your JWTs. It's a best practice to
// store this in your .env file.
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

// Login User
exports.loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user in the database
        const user = await UserModel.findOne({ username });
        if (!user) {
            //Return a error for invalid credentials
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check the inputted password against the password stored in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Return the same message for security reasons
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate a JSON Web Token (JWT) 
        // Create a payload for the token that includes the user's ID
        const payload = { 
            userID: user.id,
            username: user.username
        };
        // Sign the token. It will expire in 24 hours.
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

        // FIX: Send a successful response with the token and a user object
        // We select only the data the frontend needs, excluding the password.
        const userWithoutPassword = {
            id: user._id,
            username: user.username,
            name: user.name,
            contact: user.contact
        };

        res.json({
            message: "Login successful",
            token, // Send the token
            user: userWithoutPassword // Send the user data
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error during login" });
    }
};

// Get the user into database
// This function needs a middleware to work.
exports.getUser = async (req, res) => {
    // A JWT authentication middleware will populate req.userID from the token
    if (!req.userID) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await UserModel.findById(req.userID).select("-password");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
};