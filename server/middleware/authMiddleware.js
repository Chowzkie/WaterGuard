const jwt = require('jsonwebtoken');

// Ensure you have a JWT_SECRET defined in your environment variables.
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

module.exports = (req, res, next) => {
    // Get the token from the Authorization header (e.g., "Bearer YOUR_TOKEN")
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const token = authHeader.replace('Bearer ', '');
        // Verify the token using the secret key
        const decoded = jwt.verify(token, JWT_SECRET);
        // Add the user's ID from the token payload to the request object
        req.userID = decoded.userID; 
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};