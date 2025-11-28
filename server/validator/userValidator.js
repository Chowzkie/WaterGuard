const usernameRegex = /^[a-zA-Z0-9_]{5,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.validateName = (name) => {
    if (!name) {
        return { isValid: false, message: "Name is required." };
    }
    // Compare the length of the trimmed string
    if (name.trim().length < 5) {
        return {
            isValid: false,
            message: "Fullname must be at least 5 characters long."
        };
    }
    return { isValid: true };
};

exports.validateUsername = (username) => {
    if (!username) {
        return { isValid: false, message: "Username is required." };
    }
    if (!usernameRegex.test(username)) {
        return {
            isValid: false,
            //  Changed key from 'username' to 'message'
            message: "Username must be 5-20 characters and contain only letters, numbers, and underscores."
        };
    }
    return { isValid: true };
};

exports.validateEmail = (email) => {
    if (!email) {
        return { isValid: false, message: "Email is required." };
    }
    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            message: "Invalid email format. Please provide a valid email address (e.g., user@example.com)."
        };
    }
    return { isValid: true };
};

exports.validatePassword = (newPassword) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if(!newPassword){
        return {isValid: false, message: "Password is required"};
    };
    if(!passwordRegex.test(newPassword)){
        return {
            isValid: false,
            message: "Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)."
        };
    };
    return { isValid: true}
};