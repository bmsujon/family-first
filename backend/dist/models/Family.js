"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const FamilyMemberSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { _id: false } // No separate _id for the sub-document
);
const FamilySettingsSchema = new mongoose_1.Schema({
    currency: { type: String, default: 'BDT' }, // Default to Taka
    timezone: { type: String, default: 'Asia/Dhaka' }, // Default timezone
}, { _id: false });
const FamilySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [FamilyMemberSchema],
    settings: { type: FamilySettingsSchema, default: () => ({}) },
}, {
    timestamps: true,
});
// Ensure that the creating user is automatically added as a primary member
FamilySchema.pre('save', function (next) {
    if (this.isNew && this.members.length === 0) {
        this.members.push({
            userId: this.createdBy,
            role: 'Primary User', // Explicitly set creator role
            joinedAt: new Date(),
            permissions: [], // Define initial permissions for primary user if needed
        }); // Type assertion might be needed depending on TS config
    }
    next();
});
const Family = mongoose_1.default.model('Family', FamilySchema);
exports.default = Family;
