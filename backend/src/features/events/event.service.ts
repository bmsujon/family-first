import mongoose, { Types } from 'mongoose';
import Event, { IEvent } from '../../models/Event';
import Family from '../../models/Family';
import { AppError } from '../../utils/AppError';

// --- Interfaces for Service Functions --- 

// Data needed to create an event
interface CreateEventData {
    familyId: string | Types.ObjectId;
    title: string;
    startTime: Date | string;
    endTime: Date | string;
    description?: string;
    allDay?: boolean;
    participants?: (string | Types.ObjectId)[];
    location?: string;
    category?: string;
    createdById: string | Types.ObjectId; // User performing the action
}

// Options for fetching events
interface GetEventsOptions {
    familyId: string | Types.ObjectId;
    requestingUserId: string | Types.ObjectId;
    startDate?: Date | string; // Optional: Filter events starting after this date
    endDate?: Date | string;   // Optional: Filter events ending before this date
    // Add other filters later (e.g., category, participant)
}

// Data needed to delete an event
interface DeleteEventOptions {
    eventId: string | Types.ObjectId;
    familyId: string | Types.ObjectId; // Need familyId for context/permissions
    requestingUserId: string | Types.ObjectId;
}

// Data for updating an event (similar to create, but all fields optional)
interface UpdateEventData {
    title?: string;
    startTime?: Date | string;
    endTime?: Date | string;
    description?: string;
    allDay?: boolean;
    participants?: (string | Types.ObjectId)[];
    location?: string;
    category?: string;
}

// Options for updating an event
interface UpdateEventOptions {
    eventId: string | Types.ObjectId;
    familyId: string | Types.ObjectId;
    requestingUserId: string | Types.ObjectId;
    updateData: UpdateEventData;
}

// Options for fetching a single event
interface GetEventByIdOptions {
    eventId: string | Types.ObjectId;
    familyId: string | Types.ObjectId; // Need familyId for context/permissions
    requestingUserId: string | Types.ObjectId;
}

// --- Helper: Check Family Membership --- 
const checkFamilyMembership = async (familyId: string | Types.ObjectId, userId: string | Types.ObjectId) => {
    const family = await Family.findById(familyId).select('members').lean();
    if (!family) {
        throw new AppError('Family not found', 404);
    }
    const userIdString = userId.toString();
    if (!family.members || !family.members.some(member => member.userId?.toString() === userIdString)) {
        throw new AppError('User does not have permission for this family', 403);
    }
    return family; // Return family if needed elsewhere
};

// --- Service Functions --- 

/**
 * Creates a new event for a specific family.
 * @param data - Data for the new event, including familyId and createdById.
 * @returns The newly created event document.
 */
export const createEvent = async (data: CreateEventData): Promise<IEvent> => {
    const { familyId, createdById, title, startTime, endTime, ...eventDetails } = data;

    // 1. Validate IDs
    if (!mongoose.Types.ObjectId.isValid(familyId) || !mongoose.Types.ObjectId.isValid(createdById)) {
        throw new AppError('Invalid Family or User ID format', 400);
    }
    // Basic time validation
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
         throw new AppError('Invalid start or end time format', 400);
    }
    // Only enforce start > end for non-all-day events
    // For all-day events, FullCalendar might send end as the day *after* the last day, adjust if needed
    if (!eventDetails.allDay && start > end) { 
        throw new AppError('End time must be after start time for timed events', 400);
    }
    // Validate participant IDs if provided
    if (eventDetails.participants && eventDetails.participants.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        throw new AppError('Invalid User ID format in participants array', 400);
    }

    // 2. Permission Check: Ensure creator is member of the family
    await checkFamilyMembership(familyId, createdById);
    
    // TODO: Optional: Validate participant IDs are also members of the family?

    // 3. Create Event
    const newEvent = new Event({
        familyId,
        createdBy: createdById,
        title,
        startTime: start,
        // If allDay, store endTime as the start of the *next* day for FC compatibility?
        // Or store it as the same as startTime? Decide consistency.
        // Storing as provided for now, assuming frontend sends correct exclusive end for allDay.
        endTime: end, 
        ...eventDetails,
    });

    await newEvent.save();
    
    // Avoid populating immediately on create unless necessary, fetch requests can populate.
    // await newEvent.populate(['createdBy', 'participants']); 

    // TODO: Emit socket event 'event_created'? 

    return newEvent;
};

/**
 * Retrieves events for a specific family, optionally within a date range.
 * @param options - Options including familyId, requestingUserId, and optional date range.
 * @returns An array of event documents.
 */
export const getEventsByFamily = async (options: GetEventsOptions): Promise<IEvent[]> => {
    const { familyId, requestingUserId, startDate, endDate } = options;

    // 1. Validate IDs
    if (!mongoose.Types.ObjectId.isValid(familyId) || !mongoose.Types.ObjectId.isValid(requestingUserId)) {
        throw new AppError('Invalid Family or User ID format', 400);
    }

    // 2. Permission Check
    await checkFamilyMembership(familyId, requestingUserId);

    // 3. Build Query
    const query: mongoose.FilterQuery<IEvent> = { familyId };

    // Apply date range filtering for events overlapping the range [startDate, endDate)
    // Find events where: (eventStart < endDate) AND (eventEnd > startDate)
    if (startDate || endDate) {
        const dateConditions: any = {};
        if (endDate) {
            // Event must start before the range ends
            dateConditions.startTime = { $lt: new Date(endDate) };
        }
        if (startDate) {
            // Event must end after the range starts
            // Note: For all-day events, the stored end time might be exclusive. 
            // Adjust this logic if storing end times differently for all-day.
            dateConditions.endTime = { $gt: new Date(startDate) };
        }
        // Combine conditions if both dates are present
        if (startDate && endDate) {
             query.$and = [
                 { startTime: { $lt: new Date(endDate) } },
                 { endTime: { $gt: new Date(startDate) } }
             ];
        } else if (startDate) {
            query.endTime = { $gt: new Date(startDate) };
        } else if (endDate) {
             query.startTime = { $lt: new Date(endDate) };
        } 
    }


    // 4. Execute Query
    const events = await Event.find(query)
        .populate([
            { path: 'createdBy', select: 'firstName lastName email' }, // Populate creator details
            // { path: 'participants', select: 'firstName lastName email' } // Populate participant details if needed
        ]) 
        .sort({ startTime: 1 }); // Sort by start time by default

    return events;
};

/**
 * Deletes a specific event.
 * @param options - Options including eventId, familyId, and requestingUserId for permission check.
 * @returns True if deletion was successful.
 */
export const deleteEvent = async (options: DeleteEventOptions): Promise<boolean> => {
    const { eventId, familyId, requestingUserId } = options;

    // 1. Validate IDs
    if (
        !mongoose.Types.ObjectId.isValid(eventId) ||
        !mongoose.Types.ObjectId.isValid(familyId) || 
        !mongoose.Types.ObjectId.isValid(requestingUserId)
    ) {
        throw new AppError('Invalid Event, Family, or User ID format', 400);
    }

    // 2. Permission Check: Ensure requesting user is part of the family
    await checkFamilyMembership(familyId, requestingUserId);

    // 3. Find the event to verify ownership/permissions (optional, but good practice)
    // You might want more granular permissions later (e.g., only creator can delete)
    const eventToDelete = await Event.findOne({ _id: eventId, familyId: familyId }).lean();
    
    if (!eventToDelete) {
        // Event not found or doesn't belong to this family (handled implicitly by findOne)
        throw new AppError('Event not found or access denied', 404); 
    }
    
    // Optional: Add check if requestingUserId is the creator or has specific role
    // if (eventToDelete.createdBy.toString() !== requestingUserId.toString()) {
    //     throw new AppError('Only the event creator can delete this event', 403);
    // }

    // 4. Delete the event
    const result = await Event.deleteOne({ _id: eventId, familyId: familyId });

    if (result.deletedCount === 0) {
        // Should ideally be caught by the findOne check, but good as a safeguard
        throw new AppError('Event not found or could not be deleted', 404);
    }
    
    // TODO: Emit socket event 'event_deleted'?

    return true; // Indicate successful deletion
};

/**
 * Updates a specific event.
 * @param options - Options including eventId, familyId, requestingUserId, and updateData.
 * @returns The updated event document.
 */
export const updateEvent = async (options: UpdateEventOptions): Promise<IEvent> => {
    const { eventId, familyId, requestingUserId, updateData } = options;

    // 1. Validate IDs
    if (
        !mongoose.Types.ObjectId.isValid(eventId) ||
        !mongoose.Types.ObjectId.isValid(familyId) || 
        !mongoose.Types.ObjectId.isValid(requestingUserId)
    ) {
        throw new AppError('Invalid Event, Family, or User ID format', 400);
    }

    // 2. Permission Check: Ensure user is part of the family
    await checkFamilyMembership(familyId, requestingUserId);

    // 3. Validate updateData (e.g., check times, participant IDs if provided)
    let start: Date | undefined;
    let end: Date | undefined;
    if (updateData.startTime) {
        start = new Date(updateData.startTime);
        if (isNaN(start.getTime())) throw new AppError('Invalid start time format', 400);
        updateData.startTime = start; // Store as Date object
    }
    if (updateData.endTime) {
        end = new Date(updateData.endTime);
        if (isNaN(end.getTime())) throw new AppError('Invalid end time format', 400);
        updateData.endTime = end; // Store as Date object
    }
    // Check start/end consistency based on allDay status (if both times are being updated)
    const currentAllDay = (await Event.findById(eventId).select('allDay').lean())?.allDay;
    const newAllDay = updateData.allDay ?? currentAllDay; // Use new allDay if provided, else current
    const startTimeToCheck = start ?? (await Event.findById(eventId).select('startTime').lean())?.startTime;
    const endTimeToCheck = end ?? (await Event.findById(eventId).select('endTime').lean())?.endTime;

    if (!newAllDay && startTimeToCheck && endTimeToCheck && startTimeToCheck > endTimeToCheck) {
         throw new AppError('End time must be after start time for timed events', 400);
    }
    if (updateData.participants && updateData.participants.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        throw new AppError('Invalid User ID format in participants array', 400);
    }
    
    // 4. Find and Update the event
    // Add permission check: ensure user can update (e.g., creator or admin?)
    // For now, any family member can update any event in the family
    const updatedEvent = await Event.findOneAndUpdate(
        { _id: eventId, familyId: familyId }, // Ensure event belongs to the family
        { $set: updateData }, // Apply the updates
        { new: true, runValidators: true } // Return the updated doc, run schema validators
    ).populate(['createdBy', 'participants']); // Populate necessary fields

    if (!updatedEvent) {
        throw new AppError('Event not found or could not be updated', 404);
    }

    // TODO: Emit socket event 'event_updated'?

    return updatedEvent;
};

/**
 * Retrieves a single event by its ID.
 * @param options - Options including eventId, familyId, and requestingUserId.
 * @returns The event document or null if not found/no permission.
 */
export const getEventById = async (options: GetEventByIdOptions): Promise<IEvent | null> => {
    const { eventId, familyId, requestingUserId } = options;

    // 1. Validate IDs
    if (
        !mongoose.Types.ObjectId.isValid(eventId) ||
        !mongoose.Types.ObjectId.isValid(familyId) || 
        !mongoose.Types.ObjectId.isValid(requestingUserId)
    ) {
        throw new AppError('Invalid Event, Family, or User ID format', 400);
    }

    // 2. Permission Check: Ensure user is part of the family
    await checkFamilyMembership(familyId, requestingUserId);

    // 3. Find the event
    // Ensure the event belongs to the specified family
    const event = await Event.findOne({ _id: eventId, familyId: familyId })
        .populate(['createdBy', 'participants']); // Populate necessary fields

    if (!event) {
        // Event not found or doesn't belong to this family
        throw new AppError('Event not found or access denied', 404); 
    }

    return event;
};

// TODO: Add service functions for getEventById, updateEvent later 