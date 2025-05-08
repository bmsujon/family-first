import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs'; // Import bcrypt

// Interface defining the structure of the User settings sub-document
interface IUserSettings {
    language?: string;
    notifications?: {
        email?: boolean;
        push?: boolean;
        inApp?: boolean;
    };
    theme?: string;
}

// Interface defining the structure of the User document (including methods, etc.)
export interface IUser extends Document {
    // userId: string; // Managed by MongoDB's _id, but can be added if a separate UUID is strictly needed
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    profilePicture?: string;
    phoneNumber?: string;
    lastLogin?: Date;
    roles: string[];
    settings?: IUserSettings;
    twoFactorEnabled: boolean;
    isVerified: boolean;
    // Timestamps added by mongoose
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSettingsSchema = new Schema<IUserSettings>({
    language: { type: String, default: 'en' }, // Default to English
    notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
    },
    theme: { type: String, default: 'light' }, // Default theme
}, { _id: false }); // No separate _id for the sub-document

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        dateOfBirth: { type: Date },
        profilePicture: { type: String }, // URL to the picture
        phoneNumber: { type: String, trim: true },
        lastLogin: { type: Date },
        roles: {
            type: [String],
            default: ['Secondary User'], // Default role
            // enum: ['Primary User', 'Secondary User', 'Limited Access User', 'Monitored User'] // Consider defining roles later
        },
        settings: { type: UserSettingsSchema, default: () => ({}) },
        twoFactorEnabled: { type: Boolean, default: false },
        isVerified: { type: Boolean, default: false },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt timestamps
    }
);

// Add pre-save hook for password hashing
UserSchema.pre<IUser>('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('passwordHash')) return next();

    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(10);
        // Hash the password using the generated salt
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
        // Pass any errors to the next middleware
        if (error instanceof Error) {
            next(error);
        } else {
            next(new Error('An unknown error occurred during password hashing'));
        }
    }
});

// Add method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User; 