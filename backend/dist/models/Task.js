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
exports.TASK_PRIORITIES = exports.TASK_STATUSES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Export constants for use in other files
exports.TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Blocked'];
exports.TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const TaskReminderSchema = new mongoose_1.Schema({
    time: { type: Date, required: true },
    sent: { type: Boolean, default: false },
}, { _id: false });
const TaskSchema = new mongoose_1.Schema({
    familyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Family', // Reference to the Family model
        required: true,
        index: true, // Index for querying tasks by family
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    priority: {
        type: String,
        enum: exports.TASK_PRIORITIES,
        default: 'Medium',
    },
    status: {
        type: String,
        enum: exports.TASK_STATUSES,
        default: 'Pending',
        index: true,
    },
    dueDate: { type: Date, index: true }, // Index for querying/sorting by due date
    completedAt: { type: Date },
    completedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    assignedTo: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    recurring: { type: Boolean, default: false },
    recurrenceRule: { type: String }, // Store RRULE string, parsing/logic handled elsewhere
    recurringTaskId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Task',
        required: false,
        index: true, // Index for finding generated instances
    },
    reminders: [TaskReminderSchema],
    attachments: { type: [String], default: [] }, // Array of URLs
}, {
    timestamps: true,
});
const Task = mongoose_1.default.model('Task', TaskSchema);
exports.default = Task;
