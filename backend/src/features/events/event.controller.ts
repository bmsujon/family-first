import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Types } from 'mongoose';
import * as EventService from './event.service';
import { AuthRequest } from '../../middleware/authMiddleware'; // Import AuthRequest for req.user
import { AppError } from '../../utils/AppError';

// @desc    Create a new event for a family
// @route   POST /api/families/:familyId/events
// @access  Protected (Requires login and family membership)
export const createEventHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const createdById = req.user._id as Types.ObjectId;
    const { title, startTime, endTime, description, allDay, participants, location, category } = req.body;

    // Basic validation (service handles more specific validation)
    if (!title || !startTime) { // endTime might not be needed if allDay
        throw new AppError('Missing required fields: title, startTime', 400);
    }
    if (!allDay && !endTime) {
        throw new AppError('End time is required for non-all-day events', 400);
    }

    const eventData = {
        familyId: familyId as string,
        createdById: createdById,
        title,
        startTime,
        endTime: allDay ? startTime : endTime, // Use startTime if allDay
        description,
        allDay,
        participants,
        location,
        category,
    };

    // Service handles permission check and creation
    const newEvent = await EventService.createEvent(eventData);
    res.status(201).json(newEvent);
});

// @desc    Get events for a specific family
// @route   GET /api/families/:familyId/events
// @access  Protected (Requires login and family membership)
export const getEventsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id as Types.ObjectId;
    const { startDate, endDate } = req.query;
    const options = {
        familyId: familyId as string,
        requestingUserId: requestingUserId,
        startDate: startDate as string | undefined, 
        endDate: endDate as string | undefined,
    };
    const events = await EventService.getEventsByFamily(options);
    res.status(200).json(events);
});

// @desc    Get a single event by ID
// @route   GET /api/families/:familyId/events/:eventId
// @access  Protected (Requires login, family membership)
export const getEventByIdHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId, familyId } = req.params;
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id as Types.ObjectId;

    const options = {
        eventId: eventId as string,
        familyId: familyId as string,
        requestingUserId: requestingUserId
    };

    // Service handles permission check and fetching
    const event = await EventService.getEventById(options);
    // Service throws 404 if not found/no access, so if we get here, event is valid
    res.status(200).json(event);
});

// @desc    Delete a specific event
// @route   DELETE /api/families/:familyId/events/:eventId 
// @access  Protected (Requires login, family membership)
export const deleteEventHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId, familyId } = req.params; 
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id as Types.ObjectId;

    const options = {
        eventId: eventId as string,
        familyId: familyId as string,
        requestingUserId: requestingUserId
    };

    await EventService.deleteEvent(options);
    res.status(200).json({ message: 'Event deleted successfully' });
});

// @desc    Update a specific event
// @route   PUT /api/families/:familyId/events/:eventId
// @access  Protected (Requires login, family membership)
export const updateEventHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId, familyId } = req.params;
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id as Types.ObjectId;
    const updateData = req.body; // Get updates from request body

    // Basic check: ensure there's data to update
    if (Object.keys(updateData).length === 0) {
        throw new AppError('No update data provided', 400);
    }

    const options = {
        eventId: eventId as string,
        familyId: familyId as string,
        requestingUserId: requestingUserId,
        updateData: updateData, // Pass the request body as update data
    };

    // Service handles validation, permissions, and update
    const updatedEvent = await EventService.updateEvent(options);
    res.status(200).json(updatedEvent); // Return the updated event
});

// TODO: Add handler for getEventById later 