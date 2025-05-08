import mongoose, { Document, Schema, Types } from 'mongoose';

// Interface representing the structure of an Event document
export interface IEvent extends Document {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    allDay: boolean;
    familyId: Types.ObjectId; // Reference to the Family model
    createdBy: Types.ObjectId; // Reference to the User model (who created it)
    participants?: Types.ObjectId[]; // Optional: Array of User refs (who is attending)
    location?: string;
    category?: string; // E.g., 'Appointment', 'Birthday', 'Meeting', 'Reminder'
    // recurringRule?: string; // Future enhancement for recurring events
    createdAt: Date;
    updatedAt: Date;
}

// Mongoose Schema for the Event model
const eventSchema: Schema<IEvent> = new Schema(
    {
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
                function (this: IEvent, value: Date): boolean {
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
            type: Schema.Types.ObjectId,
            ref: 'Family',
            required: true,
            index: true, // Index for efficient querying by family
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        participants: [{
            type: Schema.Types.ObjectId,
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
    },
    {
        timestamps: true, // Automatically add createdAt and updatedAt fields
    }
);

// Create and export the Event model
const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event; 