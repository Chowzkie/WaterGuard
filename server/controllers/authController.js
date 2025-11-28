const bcrypt = require("bcryptjs");
const UserModel = require("../models/User");
const jwt = require("jsonwebtoken"); 
const { validateUsername, validateEmail, validateName, validatePassword } = require( "../validator/userValidator");
const cloudinary = require("../config/cloudinaryConfig")
const fs = require("fs")
const {createUserlog} = require('../helpers/createUserlog')


// Load secret key from environment variables or fallback to a default (only for development)
const JWT_SECRET = process.env.JWT_SECRET || 'Waterguard@2025';

/**
 * @desc    Login User
 * @route   POST /api/auth/login
 * @access  Public
 * Function to authenticate a user, generate a JWT, and initiate a session.
 */
exports.loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // --- User Lookup ---
        // Query the database for a user with the provided username
        const user = await UserModel.findOne({ username });
        
        if (!user) {
            // If no user is found, return a generic error to prevent user enumeration attacks
            return res.status(401).json({ message: "Please check your username and password." });
        }

        // --- Password Verification ---
        // Use bcrypt to compare the plaintext password from the request 
        // with the hashed password stored in the database.
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            // Return the same generic error message for security consistency
            return res.status(401).json({ message: "Please check your username and password." });
        }

        // --- Token Generation ---
        // Create a payload object containing non-sensitive user identification data
        const payload = { 
            userID: user.id,
            username: user.username,
            name: user.name,
            profileImage: user.profileImage
        };
        
        // Sign the JWT with the secret key. 
        // Set expiration to 24 hours to enforce periodic re-authentication.
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

        // --- Response Preparation ---
        // Construct a user object that excludes sensitive fields (like the password hash)
        // for use by the frontend application.
        const userWithoutPassword = {
            id: user._id,
            username: user.username,
            name: user.name,
            contact: user.contact
        };

        // --- Audit Logging ---
        // Record the successful login event
        await createUserlog(user._id, `${user.username} logged in to the System`, "Login")

        // Return success response with the JWT and user details
        res.json({
            message: "Login successful!",
            token, 
            user: userWithoutPassword 
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "An error occurred during login. Please try again." });
    }
};

/**
 * @desc    Logout User
 * @route   POST /api/auth/logout
 * @access  Private
 * Function to log the logout event. 
 * Note: JWT invalidation is typically handled on the client side (deleting the token).
 */
exports.logoutUser = async (req, res) => {
  try {
    // Retrieve user ID extracted by the auth middleware
    const userId = req.userID;

    if (!userId) return res.status(400).json({ msg: "User ID required" });

    // Verify user exists
    const user = await UserModel.findById(userId);

    if (!user) return res.status(404).json({ msg: "User not found" });

    // Log the logout action
    await createUserlog(user._id, `User ${user.username} logged out`, "Logout");

    res.json({ msg: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ msg: "Server error" });
  }
}

/**
 * @desc    Get User Data
 * @route   GET /api/auth/user
 * @access  Private
 * Function to retrieve the currently authenticated user's profile.
 * Relies on middleware to populate req.userID.
 */
exports.getUser = async (req, res) => {
    // Ensure request is authenticated (redundant if middleware is used properly, but good for safety)
    if (!req.userID) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Fetch user data, explicitly excluding the password field
    const user = await UserModel.findById(req.userID).select("-password");
    
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
};

/**
 * @desc    Update User Name
 * @route   PUT /api/auth/update-name
 * @access  Private
 * Function to update the display name of the user.
 */
exports.updateName = async (req, res) => {
    const { name } = req.body;
    const userID = req.userID;

    // Basic input check
    if (!name) {
        return res.status(400).json({ message: "No name provided for the update." });
    }
    
    // --- Validation ---
    // Use external validator to check format requirements
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
        return res.status(400).json({ message: nameValidation.message });
    }

    try {
        // Retrieve current user data
        const user = await UserModel.findById(userID);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if the new name is actually different
        if (name === user.name) {
            return res.status(200).json({ message: "Name is already up to date." });
        }

        const oldname = user.name; // Cache old name for logging
        user.name = name; // Apply update

        // --- Database Storage ---
        await user.save();
        
        // Log the specific change made
        await createUserlog(userID, `Changed name fron ${oldname} to ${name}`)

        // Return updated user object (without password)
        const updatedUser = await UserModel.findById(userID).select("-password");
        return res.status(200).json(updatedUser); 

    } catch (error) {
        console.error("Error updating name:", error);
        res.status(500).json({ message: "Server error during name update." });
    }
};

/**
 * @desc    Update Username
 * @route   PUT /api/auth/update-username
 * @access  Private
 * Function to update the user's login identifier.
 * Includes checks for uniqueness to prevent duplicates.
 */
exports.updateUsername = async (req, res) => {
    const { username } = req.body;
    const userID = req.userID;

    // Basic input check
    if (!username) {
        return res.status(400).json({ message: "No username provided for the update." });
    }
    
    // --- Validation ---
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
        return res.status(400).json({ message: usernameValidation.message });
    }

    try {
        // Retrieve user
        const user = await UserModel.findById(userID);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if identical
        if (username === user.username) {
            return res.status(200).json({ message: "Username is already up to date." });
        }
        
        // --- Uniqueness Check ---
        // Ensure the requested username is not already in use by another account
        const existingUsername = await UserModel.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({ message: "Username is already taken." });
        }

        const oldUsername = user.username; // Cache old value
        user.username = username; // Apply update
        
        // --- Database Storage ---
        await user.save();
        
        // Log the change
        await createUserlog(userID, `Changed username from ${oldUsername} to ${username}`);

        const updatedUser = await UserModel.findById(userID).select("-password");
        return res.status(200).json(updatedUser);

    } catch (error) {
        console.error("Error updating username:", error);
        res.status(500).json({ message: "Server error during username update." });
    }
};

/**
 * @desc    Update Email Address
 * @route   PUT /api/auth/update-email
 * @access  Private
 */
exports.updateEmail = async (req, res) => {
    const { email } = req.body;
    const userID = req.userID;
    
    if (!email) {
        return res.status(400).json({ message: "No email provided for the update." });
    }
    
    // --- Validation ---
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        return res.status(400).json({ message: emailValidation.message });
    }

    try {
        const user = await UserModel.findById(userID);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (email === user.email) {
            return res.status(200).json({ message: "Email is already up to date." });
        }
        
        // --- Uniqueness Check ---
        const existingEmail = await UserModel.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ message: "Email address is already taken." });
        }

        const oldEmail = user.email;
        user.email = email;
        
        await user.save();
        
        await createUserlog(userID, `Changed email from ${oldEmail} to ${email}`);

        const updatedUser = await UserModel.findById(userID).select("-password");
        return res.status(200).json(updatedUser);

    } catch (error) {
        console.error("Error updating email:", error);
        res.status(500).json({ message: "Server error during email update." });
    }
};

/**
 * @desc    Update Password
 * @route   PUT /api/auth/update-password
 * @access  Private
 * Function to handle secure password changes.
 * Requires verification of current password before allowing update.
 */
exports.updatePassword = async(req,res) => {
    const {currentPassword, newPassword, confirmPassword} = req.body
    const userID = req.userID
    
    // Confirm new passwords match
    if(newPassword !== confirmPassword){
        return res.status(400).json({message: "New password does not match in Confirmation"})
    }
    
    // --- Validation ---
    // Validate complexity requirements (e.g., length, special chars)
    const passwordValidation = validatePassword(newPassword);
    if(!passwordValidation.isValid){
        return res.status(400).json({message: passwordValidation.message})
    }

    try{
        const user = await UserModel.findById(userID);
        
        // Prevent reusing the exact same password
        if(newPassword === currentPassword){
            return res.status(400).json({message: "password should not be the same"})
        }
        
        // --- Verification ---
        // Authenticate the user by verifying the current password matches the hash
        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if(!isMatch){
            return res.status(401).json({ message: "Invalid current password." });
        }

        // --- Hashing ---
        // Generate a new salt and hash the new password before storage
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt)
        
        // --- Database Storage ---
        await user.save()
        
        // Log the security event
        await createUserlog(userID, `Changed password`);

        return res.status(200).json({ message: "Password updated successfully." });

    }catch (error){
        console.error("Error updating password", error)
        res.status(500).json({message :"server error during password update"})
    }
}

/**
 * @desc    Upload Profile Image
 * @route   POST /api/auth/:userId/upload-image
 * @access  Private
 * Function to handle file uploads to Cloudinary and update user profile URL.
 */
exports.uploadProfileImage = async (req, res) => {
    try {
        console.log("Starting image upload process...");

        // Check if Multer middleware successfully processed the file
        if (!req.file) {
            console.log("Error: No file provided in the request.");
            return res.status(400).json({ message: 'No image file was provided.' });
        }
        
        const userId = req.params.userId;
        const imagePath = req.file.path;

        console.log(`Received file path from Multer: ${imagePath}`);

        // --- Cloud Upload ---
        // Upload the local temporary file to Cloudinary storage service
        console.log("Attempting to upload file to Cloudinary...");
        const result = await cloudinary.uploader.upload(imagePath);
        console.log("Successfully uploaded to Cloudinary. URL:", result.secure_url);

        // --- Cleanup ---
        // Delete the temporary file from the server's filesystem to save space
        try {
            fs.unlinkSync(imagePath);
            console.log("Successfully deleted temporary file.");
        } catch (unlinkError) {
            console.error("Failed to delete temporary file:", unlinkError);
        }

        // --- Database Update ---
        // Find user and update the profileImage field with the new Cloudinary URL
        const user = await UserModel.findByIdAndUpdate(
            userId,
            { profileImage: result.secure_url },
            { new: true }
        );

        if (!user) {
            console.log(`User not found with ID: ${userId}`);
            return res.status(404).json({ message: 'User not found' });
        }

        await createUserlog(userId, `Updated profile image`);

        console.log("User document updated successfully.");
        res.status(200).json({
            message: 'Profile image uploaded and URL saved successfully!',
            user,
        });
    } catch (error) {
        console.error("An internal server error occurred:", error);
        res.status(500).json({ message: 'Failed to upload image', error: error.message });
    }
};