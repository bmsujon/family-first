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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const validator_1 = __importDefault(require("validator")); // Import validator library
const InvitationSchema = new mongoose_1.Schema({
    familyId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            validator: (value) => validator_1.default.isEmail(value),
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
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
});
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
const Invitation = mongoose_1.default.model('Invitation', InvitationSchema);
exports.default = Invitation;
