"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventById = exports.updateEvent = exports.deleteEvent = exports.getEventsByFamily = exports.createEvent = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Event_1 = __importDefault(require("../../models/Event"));
const Family_1 = __importDefault(require("../../models/Family"));
const AppError_1 = require("../../utils/AppError");
// --- Helper: Check Family Membership --- 
const checkFamilyMembership = (familyId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const family = yield Family_1.default.findById(familyId).select('members').lean();
    if (!family) {
        throw new AppError_1.AppError('Family not found', 404);
    }
    const userIdString = userId.toString();
    if (!family.members || !family.members.some(member => { var _a; return ((_a = member.userId) === null || _a === void 0 ? void 0 : _a.toString()) === userIdString; })) {
        throw new AppError_1.AppError('User does not have permission for this family', 403);
    }
    return family; // Return family if needed elsewhere
});
// --- Service Functions --- 
/**
 * Creates a new event for a specific family.
 * @param data - Data for the new event, including familyId and createdById.
 * @returns The newly created event document.
 */
const createEvent = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { familyId, createdById, title, startTime, endTime } = data, eventDetails = __rest(data, ["familyId", "createdById", "title", "startTime", "endTime"]);
    // 1. Validate IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(familyId) || !mongoose_1.default.Types.ObjectId.isValid(createdById)) {
        throw new AppError_1.AppError('Invalid Family or User ID format', 400);
    }
    // Basic time validation
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError_1.AppError('Invalid start or end time format', 400);
    }
    // Only enforce start > end for non-all-day events
    // For all-day events, FullCalendar might send end as the day *after* the last day, adjust if needed
    if (!eventDetails.allDay && start > end) {
        throw new AppError_1.AppError('End time must be after start time for timed events', 400);
    }
    // Validate participant IDs if provided
    if (eventDetails.participants && eventDetails.participants.some(id => !mongoose_1.default.Types.ObjectId.isValid(id))) {
        throw new AppError_1.AppError('Invalid User ID format in participants array', 400);
    }
    // 2. Permission Check: Ensure creator is member of the family
    yield checkFamilyMembership(familyId, createdById);
    // TODO: Optional: Validate participant IDs are also members of the family?
    // 3. Create Event
    const newEvent = new Event_1.default(Object.assign({ familyId, createdBy: createdById, title, startTime: start, 
        // If allDay, store endTime as the start of the *next* day for FC compatibility?
        // Or store it as the same as startTime? Decide consistency.
        // Storing as provided for now, assuming frontend sends correct exclusive end for allDay.
        endTime: end }, eventDetails));
    yield newEvent.save();
    // Avoid populating immediately on create unless necessary, fetch requests can populate.
    // await newEvent.populate(['createdBy', 'participants']); 
    // TODO: Emit socket event 'event_created'? 
    return newEvent;
});
exports.createEvent = createEvent;
/**
 * Retrieves events for a specific family, optionally within a date range.
 * @param options - Options including familyId, requestingUserId, and optional date range.
 * @returns An array of event documents.
 */
const getEventsByFamily = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const { familyId, requestingUserId, startDate, endDate } = options;
    // 1. Validate IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(familyId) || !mongoose_1.default.Types.ObjectId.isValid(requestingUserId)) {
        throw new AppError_1.AppError('Invalid Family or User ID format', 400);
    }
    // 2. Permission Check
    yield checkFamilyMembership(familyId, requestingUserId);
    // 3. Build Query
    const query = { familyId };
    // Apply date range filtering for events overlapping the range [startDate, endDate)
    // Find events where: (eventStart < endDate) AND (eventEnd > startDate)
    if (startDate || endDate) {
        const dateConditions = {};
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
        }
        else if (startDate) {
            query.endTime = { $gt: new Date(startDate) };
        }
        else if (endDate) {
            query.startTime = { $lt: new Date(endDate) };
        }
    }
    // 4. Execute Query
    const events = yield Event_1.default.find(query)
        .populate([
        { path: 'createdBy', select: 'firstName lastName email' }, // Populate creator details
        // { path: 'participants', select: 'firstName lastName email' } // Populate participant details if needed
    ])
        .sort({ startTime: 1 }); // Sort by start time by default
    return events;
});
exports.getEventsByFamily = getEventsByFamily;
/**
 * Deletes a specific event.
 * @param options - Options including eventId, familyId, and requestingUserId for permission check.
 * @returns True if deletion was successful.
 */
const deleteEvent = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId, familyId, requestingUserId } = options;
    // 1. Validate IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(eventId) ||
        !mongoose_1.default.Types.ObjectId.isValid(familyId) ||
        !mongoose_1.default.Types.ObjectId.isValid(requestingUserId)) {
        throw new AppError_1.AppError('Invalid Event, Family, or User ID format', 400);
    }
    // 2. Permission Check: Ensure requesting user is part of the family
    yield checkFamilyMembership(familyId, requestingUserId);
    // 3. Find the event to verify ownership/permissions (optional, but good practice)
    // You might want more granular permissions later (e.g., only creator can delete)
    const eventToDelete = yield Event_1.default.findOne({ _id: eventId, familyId: familyId }).lean();
    if (!eventToDelete) {
        // Event not found or doesn't belong to this family (handled implicitly by findOne)
        throw new AppError_1.AppError('Event not found or access denied', 404);
    }
    // Optional: Add check if requestingUserId is the creator or has specific role
    // if (eventToDelete.createdBy.toString() !== requestingUserId.toString()) {
    //     throw new AppError('Only the event creator can delete this event', 403);
    // }
    // 4. Delete the event
    const result = yield Event_1.default.deleteOne({ _id: eventId, familyId: familyId });
    if (result.deletedCount === 0) {
        // Should ideally be caught by the findOne check, but good as a safeguard
        throw new AppError_1.AppError('Event not found or could not be deleted', 404);
    }
    // TODO: Emit socket event 'event_deleted'?
    return true; // Indicate successful deletion
});
exports.deleteEvent = deleteEvent;
/**
 * Updates a specific event.
 * @param options - Options including eventId, familyId, requestingUserId, and updateData.
 * @returns The updated event document.
 */
const updateEvent = (options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { eventId, familyId, requestingUserId, updateData } = options;
    // 1. Validate IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(eventId) ||
        !mongoose_1.default.Types.ObjectId.isValid(familyId) ||
        !mongoose_1.default.Types.ObjectId.isValid(requestingUserId)) {
        throw new AppError_1.AppError('Invalid Event, Family, or User ID format', 400);
    }
    // 2. Permission Check: Ensure user is part of the family
    yield checkFamilyMembership(familyId, requestingUserId);
    // 3. Validate updateData (e.g., check times, participant IDs if provided)
    let start;
    let end;
    if (updateData.startTime) {
        start = new Date(updateData.startTime);
        if (isNaN(start.getTime()))
            throw new AppError_1.AppError('Invalid start time format', 400);
        updateData.startTime = start; // Store as Date object
    }
    if (updateData.endTime) {
        end = new Date(updateData.endTime);
        if (isNaN(end.getTime()))
            throw new AppError_1.AppError('Invalid end time format', 400);
        updateData.endTime = end; // Store as Date object
    }
    // Check start/end consistency based on allDay status (if both times are being updated)
    const currentAllDay = (_a = (yield Event_1.default.findById(eventId).select('allDay').lean())) === null || _a === void 0 ? void 0 : _a.allDay;
    const newAllDay = (_b = updateData.allDay) !== null && _b !== void 0 ? _b : currentAllDay; // Use new allDay if provided, else current
    const startTimeToCheck = start !== null && start !== void 0 ? start : (_c = (yield Event_1.default.findById(eventId).select('startTime').lean())) === null || _c === void 0 ? void 0 : _c.startTime;
    const endTimeToCheck = end !== null && end !== void 0 ? end : (_d = (yield Event_1.default.findById(eventId).select('endTime').lean())) === null || _d === void 0 ? void 0 : _d.endTime;
    if (!newAllDay && startTimeToCheck && endTimeToCheck && startTimeToCheck > endTimeToCheck) {
        throw new AppError_1.AppError('End time must be after start time for timed events', 400);
    }
    if (updateData.participants && updateData.participants.some(id => !mongoose_1.default.Types.ObjectId.isValid(id))) {
        throw new AppError_1.AppError('Invalid User ID format in participants array', 400);
    }
    // 4. Find and Update the event
    // Add permission check: ensure user can update (e.g., creator or admin?)
    // For now, any family member can update any event in the family
    const updatedEvent = yield Event_1.default.findOneAndUpdate({ _id: eventId, familyId: familyId }, // Ensure event belongs to the family
    { $set: updateData }, // Apply the updates
    { new: true, runValidators: true } // Return the updated doc, run schema validators
    ).populate(['createdBy', 'participants']); // Populate necessary fields
    if (!updatedEvent) {
        throw new AppError_1.AppError('Event not found or could not be updated', 404);
    }
    // TODO: Emit socket event 'event_updated'?
    return updatedEvent;
});
exports.updateEvent = updateEvent;
/**
 * Retrieves a single event by its ID.
 * @param options - Options including eventId, familyId, and requestingUserId.
 * @returns The event document or null if not found/no permission.
 */
const getEventById = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId, familyId, requestingUserId } = options;
    // 1. Validate IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(eventId) ||
        !mongoose_1.default.Types.ObjectId.isValid(familyId) ||
        !mongoose_1.default.Types.ObjectId.isValid(requestingUserId)) {
        throw new AppError_1.AppError('Invalid Event, Family, or User ID format', 400);
    }
    // 2. Permission Check: Ensure user is part of the family
    yield checkFamilyMembership(familyId, requestingUserId);
    // 3. Find the event
    // Ensure the event belongs to the specified family
    const event = yield Event_1.default.findOne({ _id: eventId, familyId: familyId })
        .populate(['createdBy', 'participants']); // Populate necessary fields
    if (!event) {
        // Event not found or doesn't belong to this family
        throw new AppError_1.AppError('Event not found or access denied', 404);
    }
    return event;
});
exports.getEventById = getEventById;
// TODO: Add service functions for getEventById, updateEvent later 
