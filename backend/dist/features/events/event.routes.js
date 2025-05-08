"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const event_controller_1 = require("./event.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const router = express_1.default.Router({ mergeParams: true }); // Ensure mergeParams is true
// Route definitions for /api/families/:familyId/events
router.route('/')
    .post(authMiddleware_1.protect, authMiddleware_1.checkFamilyMembership, event_controller_1.createEventHandler) // POST to create an event
    .get(authMiddleware_1.protect, authMiddleware_1.checkFamilyMembership, event_controller_1.getEventsHandler); // GET to retrieve events for the family
// Route definitions for /api/families/:familyId/events/:eventId
router.route('/:eventId')
    .get(authMiddleware_1.protect, authMiddleware_1.checkFamilyMembership, event_controller_1.getEventByIdHandler) // GET a single event
    .put(authMiddleware_1.protect, authMiddleware_1.checkFamilyMembership, event_controller_1.updateEventHandler) // PUT to update an event
    .delete(authMiddleware_1.protect, authMiddleware_1.checkFamilyMembership, event_controller_1.deleteEventHandler); // DELETE an event
exports.default = router;
