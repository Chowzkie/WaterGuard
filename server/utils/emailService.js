// utils/emailService.js
const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Set in .env
                pass: process.env.EMAIL_PASS, // Set in .env
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: subject,
            text: text,
        });

        console.log("Email sent successfully to:", email);
        return true;
    } catch (error) {
        console.error("Email send error:", error);
        return false;
    }
};

module.exports = sendEmail;