"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const task_controller_1 = require("./task.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const familyMembershipMiddleware_1 = require("../../middleware/familyMembershipMiddleware");
// TODO: Import middleware to check family membership
// import { checkFamilyMembership } from '../middleware/familyMiddleware'; 
const router = express_1.default.Router({
    mergeParams: true // Important to access :familyId from the parent router (families)
});
// Define common middleware for routes needing family membership check
// const requireFamilyMembership = [protect, checkFamilyMembership]; // Create this middleware later
// --- Middleware applied to all task routes for this family --- 
// Ensure user is logged in AND a member of the family specified in the URL
router.use(authMiddleware_1.protect);
router.use(familyMembershipMiddleware_1.checkFamilyMembership);
// --- Task Routes --- 
// POST /api/families/:familyId/tasks - Create a new task for the family
router.route('/')
    .post(task_controller_1.createTaskHandler)
    .get(task_controller_1.getTasksHandler);
// GET /api/families/:familyId/tasks/:taskId - Get a specific task
// PUT /api/families/:familyId/tasks/:taskId - Update a specific task
// DELETE /api/families/:familyId/tasks/:taskId - Delete a specific task
router.route('/:taskId')
    .get(task_controller_1.getTaskByIdHandler)
    .put(task_controller_1.updateTaskHandler)
    .delete(task_controller_1.deleteTaskHandler);
// PATCH /api/families/:familyId/tasks/:taskId/status
// Update the status of a specific task (e.g., mark complete/incomplete)
router.patch('/:taskId/status', 
// Middleware already applied via router.use()
// protect,               
// checkFamilyMembership, 
task_controller_1.updateTaskStatusHandler);
exports.default = router;
