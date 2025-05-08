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
// Mongoose Schema for the Event model
const eventSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true,
        maxlength: [150, 'Event title cannot exceed 150 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Event description cannot exceed 1000 characters'],
    },
    startTime: {
        type: Date,
        required: [true, 'Event start time is required'],
    },
    endTime: {
        type: Date,
        required: [true, 'Event end time is required'],
        // Basic validation: end time should be after start time
        validate: [
            function (value) {
                return this.startTime <= value;
            },
            'End time must be after start time'
        ],
    },
    allDay: {
        type: Boolean,
        default: false,
    },
    familyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Family',
        required: true,
        index: true, // Index for efficient querying by family
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    participants: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        }],
    location: {
        type: String,
        trim: true,
        maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    category: {
        type: String,
        trim: true,
        maxlength: [50, 'Category cannot exceed 50 characters'],
        // Consider enum later if categories become fixed
    },
    // recurringRule: { type: String } // Future enhancement
}, {
    timestamps: true, // Automatically add createdAt and updatedAt fields
});
// Create and export the Event model
const Event = mongoose_1.default.model('Event', eventSchema);
exports.default = Event;
