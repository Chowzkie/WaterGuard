const bcrypt = require("bcryptjs");
const UserModel = require("../models/User");
const jwt = require("jsonwebtoken"); 
const { validateUsername, validateContact, validateName, validatePassword } = require( "../validator/userValidator");
const cloudinary = require("../config/cloudinaryConfig")
const fs = require("fs")
const {createUserlog} = require('../helpers/createUserlog')


// call the .env file 
const JWT_SECRET = process.env.JWT_SECRET || 'Waterguard@2025';



// Login User
exports.loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user in the database
        const user = await UserModel.findOne({ username });
        if (!user) {
            //Return a error for invalid credentials
            return res.status(401).json({ message: "Please check your username and password." });
        }

        // Check the inputted password against the password stored in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Return the same message for security reasons
            return res.status(401).json({ message: "Please check your username and password." });
        }

        // Generate a JSON Web Token (JWT) 
        // Create a payload for the token that includes the user's ID
        const payload = { 
            userID: user.id,
            username: user.username,
            name: user.name,
            profileImage: user.profileImage
        };
        // Sign the token. It will expire in 24 hours.
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

        // Send a successful response with the token and a user object
        // select only the data the frontend needs, excluding the password.
        const userWithoutPassword = {
            id: user._id,
            username: user.username,
            name: user.name,
            contact: user.contact
        };

        // call the helper to store the log after successful login
        await createUserlog(user._id, `${user.username} logged in to the System`, "Login")

        res.json({
            message: "Login successful!",
            token, // Send the token
            user: userWithoutPassword // Send the user data
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "An error occurred during login. Please try again." });
    }
};
// Logout user
exports.logoutUser = async (req, res) => {
  try {
    const userId = req.userID;

    if (!userId) return res.status(400).json({ msg: "User ID required" });

    const user = await UserModel.findById(userId);

    if (!user) return res.status(404).json({ msg: "User not found" });

    await createUserlog(user._id, `User ${user.username} logged out`, "Logout");

    res.json({ msg: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ msg: "Server error" });
  }
}

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
// Update the name of user
exports.updateName = async (req, res) => {
    const { name } = req.body;
    const userID = req.userID;
    // check if there is a name
    if (!name) {
        return res.status(400).json({ message: "No name provided for the update." });
    }
    // validate name using the helper
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
        return res.status(400).json({ message: nameValidation.message });
    }
    try {
        //find the id(name to the database)
        const user = await UserModel.findById(userID);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // check if the inputted name is equal to the name in the db
        if (name === user.name) {
            return res.status(200).json({ message: "Name is already up to date." });
        }

        const oldname = user.name; // use to store the old name
        user.name = name; // update the name in the db to the new name

        //Saving data to the DB
        await user.save();
        //Call the helper for changing 
        await createUserlog(userID, `Changed name fron ${oldname} to ${name}`)

        const updatedUser = await UserModel.findById(userID).select("-password");
        return res.status(200).json(updatedUser); 

    } catch (error) {
        console.error("Error updating name:", error);
        res.status(500).json({ message: "Server error during name update." });
    }
};
// update the username
exports.updateUsername = async (req, res) => {
    const { username } = req.body;
    const userID = req.userID;

    // check if there is a username provided
    if (!username) {
        return res.status(400).json({ message: "No username provided for the update." });
    }
    // validate the username using the helper
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
        return res.status(400).json({ message: usernameValidation.message });
    }

    try {
        // find the user in db
        const user = await UserModel.findById(userID);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        //check if the updated username is equal to the db username
        if (username === user.username) {
            return res.status(200).json({ message: "Username is already up to date." });
        }
        
        const existingUsername = await UserModel.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({ message: "Username is already taken." });
        }

        const oldUsername = user.username; //store the oldusername
        user.username = username; // update the old username to new username
         // Saving the data to the DB
        await user.save();
        // call the helper for changing
        await createUserlog(userID, `Changed username from ${oldUsername} to ${username}`);

        const updatedUser = await UserModel.findById(userID).select("-password");
        return res.status(200).json(updatedUser);

    } catch (error) {
        console.error("Error updating username:", error);
        res.status(500).json({ message: "Server error during username update." });
    }
};
// update contact
exports.updateContact = async (req, res) => {
    const { contact } = req.body;
    const userID = req.userID;
    // find if there is a contact in body
    if (!contact) {
        return res.status(400).json({ message: "No contact provided for the update." });
    }
    // validate the contact using the helper
    const contactValidation = validateContact(contact);
    if (!contactValidation.isValid) {
        return res.status(400).json({ message: contactValidation.message });
    }

    try {
        //find the user in db
        const user = await UserModel.findById(userID);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        //check if the contact in db is equal to the inputted contact
        if (contact === user.contact) {
            return res.status(200).json({ message: "Contact is already up to date." });
        }
        
        const existingContact = await UserModel.findOne({ contact });
        if (existingContact) {
            return res.status(409).json({ message: "Contact number is already taken." });
        }

        const oldContact = user.contact; //store the old contact in db
        user.contact = contact; // update the old contact to the new in db
        //call the helper for changing
        await user.save();
        await createUserlog(userID, `Changed contact from ${oldContact} to ${contact}`);

        const updatedUser = await UserModel.findById(userID).select("-password");
        return res.status(200).json(updatedUser);

    } catch (error) {
        console.error("Error updating contact:", error);
        res.status(500).json({ message: "Server error during contact update." });
    }
};
// update password
exports.updatePassword = async(req,res) => {
    const {currentPassword, newPassword, confirmPassword} = req.body
    const userID = req.userID
    //check if there is a new password
    if(newPassword !== confirmPassword){
        return res.status(400).json({message: "New password does not match in Confirmation"})
    }
    //validate the password using the helper
    const passwordValidation = validatePassword(newPassword);
    if(!passwordValidation.isValid){
        return res.status(400).json({message: passwordValidation.message})
    }
    try{
        // fint the user in db
        const user = await UserModel.findById(userID);
        //Check if new password is the same as the current password
        if(newPassword === currentPassword){
            return res.status(400).json({message: "password should not be the same"})
        }
        //Authentucate the current password
        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if(!isMatch){
            return res.status(401).json({ message: "Invalid current password." });
        }

        //hash the new password to be update in database
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt)
        await user.save()
        
        //Calls helper for password change
        await createUserlog(userID, `Changed password`);

        return res.status(200).json({ message: "Password updated successfully." });

    }catch (error){
        console.error("Error updating password", error)
        res.status(500).json({message :"server error during password update"})
    }
}
//update the user profile
exports.uploadProfileImage = async (req, res) => {
    try {
        console.log("Starting image upload process...");

        // Check if the file was successfully received by Multer
        if (!req.file) {
            console.log("Error: No file provided in the request.");
            return res.status(400).json({ message: 'No image file was provided.' });
        }
        
        const userId = req.params.userId;
        const imagePath = req.file.path;

        console.log(`Received file path from Multer: ${imagePath}`);

        // Upload the temporary file to Cloudinary
        console.log("Attempting to upload file to Cloudinary...");
        const result = await cloudinary.uploader.upload(imagePath);
        console.log("Successfully uploaded to Cloudinary. URL:", result.secure_url);

        // Once uploaded, delete the temporary file from your server
        try {
            fs.unlinkSync(imagePath);
            console.log("Successfully deleted temporary file.");
        } catch (unlinkError) {
            console.error("Failed to delete temporary file:", unlinkError);
        }

        // Find the user and update the profileImage field
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