import mongoose, { Schema, Document, Types } from 'mongoose';

// Export constants for use in other files
export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Blocked'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

// Interface for Task Reminders (if needed as a sub-document)
interface ITaskReminder {
    time: Date;
    sent: boolean;
}

// Interface defining the structure of the Task document
export interface ITask extends Document {
    // taskId: string; // Managed by MongoDB's _id
    familyId: Types.ObjectId; // Reference to the Family
    title: string;
    description?: string;
    category?: string; // e.g., 'Health', 'Education', 'Household' (FR5.6)
    priority: string;
    status: string;
    dueDate?: Date;
    completedAt?: Date;
    completedBy?: Types.ObjectId; // Reference to User
    assignedTo: Types.ObjectId[]; // Array of User references
    createdBy: Types.ObjectId; // Reference to User
    recurring: boolean;
    recurrenceRule?: string; // e.g., RRULE string (use a library like rrule.js later)
    recurringTaskId?: Types.ObjectId; // Link to the original recurring task template
    reminders?: ITaskReminder[];
    attachments?: string[]; // Array of URLs
    // Timestamps added by mongoose
    createdAt: Date;
    updatedAt: Date;
}

const TaskReminderSchema = new Schema<ITaskReminder>(
    {
        time: { type: Date, required: true },
        sent: { type: Boolean, default: false },
    },
    { _id: false }
);

const TaskSchema = new Schema<ITask>(
    {
        familyId: {
            type: Schema.Types.ObjectId,
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
            enum: TASK_PRIORITIES,
            default: 'Medium',
        },
        status: {
            type: String,
            enum: TASK_STATUSES,
            default: 'Pending',
            index: true,
        },
        dueDate: { type: Date, index: true }, // Index for querying/sorting by due date
        completedAt: { type: Date },
        completedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedTo: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        recurring: { type: Boolean, default: false },
        recurrenceRule: { type: String }, // Store RRULE string, parsing/logic handled elsewhere
        recurringTaskId: {
            type: Schema.Types.ObjectId,
            ref: 'Task',
            required: false,
            index: true, // Index for finding generated instances
        },
        reminders: [TaskReminderSchema],
        attachments: { type: [String], default: [] }, // Array of URLs
    },
    {
        timestamps: true,
    }
);

const Task = mongoose.model<ITask>('Task', TaskSchema);

export default Task; 