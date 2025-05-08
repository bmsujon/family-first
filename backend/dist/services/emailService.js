"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInvitationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Ensure environment variables are loaded
// --- Nodemailer Transporter Configuration ---
// Ensure necessary environment variables are set
if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
    console.warn('WARNING: Email service environment variables (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM) are not fully configured. Email sending will likely fail.\nConsider using a service like Mailtrap for development.');
}
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10), // Default to 587 if not set
    secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Optional: Add TLS options if needed, e.g., for self-signed certs in dev
    // tls: {
    //     rejectUnauthorized: false 
    // }
});
// --- Email Sending Function ---
/**
 * Sends an email using the configured transporter.
 * @param mailOptions - Options for the email (from, to, subject, text, html).
 */
const sendEmail = (mailOptions) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verify connection configuration on first use (optional)
        // await transporter.verify(); 
        const info = yield transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        // Preview URL available if using ethereal.email or similar test service
        // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error here usually, just log it. 
        // Failing to send email shouldn't necessarily fail the primary operation (like creating invite).
        // throw new Error('Failed to send email.'); 
    }
});
/**
 * Sends a family invitation email.
 * @param data - Data needed to construct the invitation email.
 */
const sendInvitationEmail = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { toEmail, token, inviterName, familyName, role } = data;
    // Construct the acceptance link (adjust base URL based on environment)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; // Default for local dev
    const acceptLink = `${frontendUrl}/accept-invite?token=${token}`;
    const mailOptions = {
        from: `"FamiFirst App" <${process.env.EMAIL_FROM}>`, // Sender address (use configured address)
        to: toEmail, // Recipient
        subject: `Invitation to Join ${familyName} on FamiFirst`, // Subject line
        text: `Hello,\n\n${inviterName} has invited you to join the family \'${familyName}\' on FamiFirst with the role of ${role}.\n\nPlease click the following link to accept the invitation and register or log in:\n${acceptLink}\n\nThis link will expire in 7 days.\n\nIf you did not expect this invitation, please ignore this email.\n\nThanks,\nThe FamiFirst Team`,
        html: `<p>Hello,</p>
<p>${inviterName} has invited you to join the family '<b>${familyName}</b>' on FamiFirst with the role of <b>${role}</b>.</p>
<p>Please click the following link to accept the invitation and register or log in:</p>
<p><a href="${acceptLink}">${acceptLink}</a></p>
<p>This link will expire in 7 days.</p>
<p><i>If you did not expect this invitation, please ignore this email.</i></p>
<p>Thanks,<br/>The FamiFirst Team</p>`, // HTML body
    };
    yield sendEmail(mailOptions);
});
exports.sendInvitationEmail = sendInvitationEmail;
// Add other email functions here (e.g., password reset) 
