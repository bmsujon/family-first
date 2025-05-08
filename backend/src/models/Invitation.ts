import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'crypto'; // For generating tokens
import validator from 'validator'; // Import validator library

// Interface defining the structure of the Invitation document
export interface IInvitation extends Document {
    familyId: Types.ObjectId; // Reference to the Family document
    email: string; // Email address invited
    role: string; // Role assigned upon acceptance (e.g., 'Parent', 'Child')
    invitedBy: Types.ObjectId; // Reference to the User who sent the invite
    token: string; // Unique, secure token for the invite link
    status: 'pending' | 'accepted' | 'expired' | 'revoked'; // Added 'revoked' status
    expiresAt: Date; // Timestamp for token expiry
    createdAt: Date;
    updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
    {
        familyId: {
            type: Schema.Types.ObjectId,
            ref: 'Family',
            required: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true, // Store emails consistently
            trim: true,
            // Removed match validator
            // match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/, 'Please use a valid email address.'],
            // Added custom validator using the 'validator' library
            validate: {
                validator: (value: string) => validator.isEmail(value),
                message: 'Please use a valid email address.'
            }
        },
        role: {
            type: String,
            required: true,
            // TODO: Add enum validation once roles are finalized
            // enum: ['Parent', 'Child', 'Guardian', 'Relative']
        },
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        token: {
            type: String,
            required: true,
            unique: true, // Ensure tokens are unique
            index: true, // Index for faster lookup
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'accepted', 'expired', 'revoked'],
            default: 'pending',
        },
        expiresAt: {
            type: Date,
            required: true,
            // Expiry logic will be handled when creating the invitation
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

// Example pre-save hook to generate token and set expiry (could also be done in service)
// InvitationSchema.pre<IInvitation>('save', function (next) {
//     if (this.isNew) {
//         // Generate a random token (example - use a more robust method if needed)
//         this.token = crypto.randomBytes(20).toString('hex');
        
//         // Set expiry (e.g., 7 days from now)
//         const expiryDays = 7;
//         this.expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
//     }
//     next();
// });

const Invitation = mongoose.model<IInvitation>('Invitation', InvitationSchema);

export default Invitation; 