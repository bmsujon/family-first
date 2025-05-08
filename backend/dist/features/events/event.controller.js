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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEventHandler = exports.deleteEventHandler = exports.getEventByIdHandler = exports.getEventsHandler = exports.createEventHandler = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const EventService = __importStar(require("./event.service"));
const AppError_1 = require("../../utils/AppError");
// @desc    Create a new event for a family
// @route   POST /api/families/:familyId/events
// @access  Protected (Requires login and family membership)
exports.createEventHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { familyId } = req.params;
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const createdById = req.user._id;
    const { title, startTime, endTime, description, allDay, participants, location, category } = req.body;
    // Basic validation (service handles more specific validation)
    if (!title || !startTime) { // endTime might not be needed if allDay
        throw new AppError_1.AppError('Missing required fields: title, startTime', 400);
    }
    if (!allDay && !endTime) {
        throw new AppError_1.AppError('End time is required for non-all-day events', 400);
    }
    const eventData = {
        familyId: familyId,
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
    const newEvent = yield EventService.createEvent(eventData);
    res.status(201).json(newEvent);
}));
// @desc    Get events for a specific family
// @route   GET /api/families/:familyId/events
// @access  Protected (Requires login and family membership)
exports.getEventsHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { familyId } = req.params;
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id;
    const { startDate, endDate } = req.query;
    const options = {
        familyId: familyId,
        requestingUserId: requestingUserId,
        startDate: startDate,
        endDate: endDate,
    };
    const events = yield EventService.getEventsByFamily(options);
    res.status(200).json(events);
}));
// @desc    Get a single event by ID
// @route   GET /api/families/:familyId/events/:eventId
// @access  Protected (Requires login, family membership)
exports.getEventByIdHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId, familyId } = req.params;
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id;
    const options = {
        eventId: eventId,
        familyId: familyId,
        requestingUserId: requestingUserId
    };
    // Service handles permission check and fetching
    const event = yield EventService.getEventById(options);
    // Service throws 404 if not found/no access, so if we get here, event is valid
    res.status(200).json(event);
}));
// @desc    Delete a specific event
// @route   DELETE /api/families/:familyId/events/:eventId 
// @access  Protected (Requires login, family membership)
exports.deleteEventHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId, familyId } = req.params;
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id;
    const options = {
        eventId: eventId,
        familyId: familyId,
        requestingUserId: requestingUserId
    };
    yield EventService.deleteEvent(options);
    res.status(200).json({ message: 'Event deleted successfully' });
}));
// @desc    Update a specific event
// @route   PUT /api/families/:familyId/events/:eventId
// @access  Protected (Requires login, family membership)
exports.updateEventHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId, familyId } = req.params;
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id;
    const updateData = req.body; // Get updates from request body
    // Basic check: ensure there's data to update
    if (Object.keys(updateData).length === 0) {
        throw new AppError_1.AppError('No update data provided', 400);
    }
    const options = {
        eventId: eventId,
        familyId: familyId,
        requestingUserId: requestingUserId,
        updateData: updateData, // Pass the request body as update data
    };
    // Service handles validation, permissions, and update
    const updatedEvent = yield EventService.updateEvent(options);
    res.status(200).json(updatedEvent); // Return the updated event
}));
// TODO: Add handler for getEventById later 
