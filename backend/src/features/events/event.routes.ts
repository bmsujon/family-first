import express from 'express';
import {
    createEventHandler,
    getEventsHandler,
    deleteEventHandler, // Import the delete handler
    updateEventHandler, // Import the update handler
    getEventByIdHandler, // Import the get handler
    // Import other handlers later: getEventByIdHandler
} from './event.controller';
import { protect, checkFamilyMembership } from '../../middleware/authMiddleware';

const router = express.Router({ mergeParams: true }); // Ensure mergeParams is true

// Route definitions for /api/families/:familyId/events

router.route('/')
    .post(protect, checkFamilyMembership, createEventHandler) // POST to create an event
    .get(protect, checkFamilyMembership, getEventsHandler);   // GET to retrieve events for the family

// Route definitions for /api/families/:familyId/events/:eventId
router.route('/:eventId')
    .get(protect, checkFamilyMembership, getEventByIdHandler) // GET a single event
    .put(protect, checkFamilyMembership, updateEventHandler) // PUT to update an event
    .delete(protect, checkFamilyMembership, deleteEventHandler); // DELETE an event

export default router;