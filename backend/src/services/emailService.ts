import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

// Interface for email options
interface MailOptions {
    from: string; // sender address
    to: string; // list of receivers
    subject: string; // Subject line
    text: string; // plain text body
    html: string; // html body
}

// --- Nodemailer Transporter Configuration ---
// Ensure necessary environment variables are set
if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
    console.warn('WARNING: Email service environment variables (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM) are not fully configured. Email sending will likely fail.\nConsider using a service like Mailtrap for development.');
}

const transporter = nodemailer.createTransport({
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
const sendEmail = async (mailOptions: MailOptions): Promise<void> => {
    try {
        // Verify connection configuration on first use (optional)
        // await transporter.verify(); 
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        // Preview URL available if using ethereal.email or similar test service
        // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error here usually, just log it. 
        // Failing to send email shouldn't necessarily fail the primary operation (like creating invite).
        // throw new Error('Failed to send email.'); 
    }
};

// --- Specific Email Functions ---

interface SendInvitationEmailData {
    toEmail: string;
    token: string;
    inviterName: string;
    familyName: string;
    role: string;
}

/**
 * Sends a family invitation email.
 * @param data - Data needed to construct the invitation email.
 */
export const sendInvitationEmail = async (data: SendInvitationEmailData): Promise<void> => {
    const { toEmail, token, inviterName, familyName, role } = data;
    
    // Construct the acceptance link (adjust base URL based on environment)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; // Default for local dev
    const acceptLink = `${frontendUrl}/accept-invite?token=${token}`;

    const mailOptions: MailOptions = {
        from: `"FamiFirst App" <${process.env.EMAIL_FROM}>`, // Sender address (use configured address)
        to: toEmail, // Recipient
        subject: `Invitation to Join ${familyName} on FamiFirst`, // Subject line
        text: 
`Hello,\n\n${inviterName} has invited you to join the family \'${familyName}\' on FamiFirst with the role of ${role}.\n\nPlease click the following link to accept the invitation and register or log in:\n${acceptLink}\n\nThis link will expire in 7 days.\n\nIf you did not expect this invitation, please ignore this email.\n\nThanks,\nThe FamiFirst Team`,
        html: 
`<p>Hello,</p>
<p>${inviterName} has invited you to join the family '<b>${familyName}</b>' on FamiFirst with the role of <b>${role}</b>.</p>
<p>Please click the following link to accept the invitation and register or log in:</p>
<p><a href="${acceptLink}">${acceptLink}</a></p>
<p>This link will expire in 7 days.</p>
<p><i>If you did not expect this invitation, please ignore this email.</i></p>
<p>Thanks,<br/>The FamiFirst Team</p>`, // HTML body
    };

    await sendEmail(mailOptions);
};

// Add other email functions here (e.g., password reset) 