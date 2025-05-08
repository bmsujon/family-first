import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface defining the structure of a Family member sub-document
interface IFamilyMember {
    userId: Types.ObjectId; // Reference to the User document
    role: string; // e.g., 'Primary User', 'Co-manager'
    joinedAt: Date;
    permissions: string[];
}

// Interface defining the structure of the Family settings sub-document
interface IFamilySettings {
    currency?: string;
    timezone?: string;
}

// Interface defining the structure of the Family document
export interface IFamily extends Document {
    // familyId: string; // Managed by MongoDB's _id
    name: string;
    createdBy: Types.ObjectId; // Reference to the User who created the family
    members: Types.DocumentArray<IFamilyMember>;
    settings?: IFamilySettings;
    // Timestamps added by mongoose
    createdAt: Date;
    updatedAt: Date;
}

const FamilyMemberSchema = new Schema<IFamilyMember>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User', // Reference to the User model
            required: true,
        },
        role: {
            type: String,
            required: true,
            // Define allowed roles
            enum: ['Primary User', 'Admin', 'Member'], 
            default: 'Member', // Default role for invited/added members
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
        permissions: {
            type: [String],
            default: [],
        },
    },
    { _id: false } // No separate _id for the sub-document
);

const FamilySettingsSchema = new Schema<IFamilySettings>(
    {
        currency: { type: String, default: 'BDT' }, // Default to Taka
        timezone: { type: String, default: 'Asia/Dhaka' }, // Default timezone
    },
    { _id: false }
);

const FamilySchema = new Schema<IFamily>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        members: [FamilyMemberSchema],
        settings: { type: FamilySettingsSchema, default: () => ({}) },
    },
    {
        timestamps: true,
    }
);

// Ensure that the creating user is automatically added as a primary member
FamilySchema.pre('save', function (next) {
    if (this.isNew && this.members.length === 0) {
        this.members.push({
            userId: this.createdBy,
            role: 'Primary User', // Explicitly set creator role
            joinedAt: new Date(),
            permissions: [], // Define initial permissions for primary user if needed
        } as IFamilyMember); // Type assertion might be needed depending on TS config
    }
    next();
});

const Family = mongoose.model<IFamily>('Family', FamilySchema);

export default Family; 