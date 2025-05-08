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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecurringTasks = void 0;
const Task_1 = __importDefault(require("../../models/Task"));
const rrule_1 = require("rrule");
const winston_1 = __importDefault(require("winston")); // Optional: for logging
const mongoose_1 = __importDefault(require("mongoose"));
// Configure logger (or import existing one)
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.simple(),
    transports: [new winston_1.default.transports.Console()],
});
/**
 * Generates instances for recurring tasks based on their RRULE.
 * Typically run by a scheduled job.
 */
const generateRecurringTasks = () => __awaiter(void 0, void 0, void 0, function* () {
    logger.info('Starting recurring task instance generation...');
    const generationWindowDays = 30; // How many days ahead to generate instances for
    const lookAheadDate = new Date();
    lookAheadDate.setDate(lookAheadDate.getDate() + generationWindowDays);
    try {
        // Find all active recurring task templates
        const recurringTemplates = yield Task_1.default.find({
            recurring: true,
            recurrenceRule: { $nin: [null, ''] }, // Use $nin (not in) to exclude null and empty string
            // We can add other filters here later if needed, e.g.,
            // status: { $ne: 'Completed' }
        }).lean(); // Use .lean() for performance if we don't need Mongoose documents
        logger.info(`Found ${recurringTemplates.length} recurring task templates.`);
        let instancesCreated = 0;
        for (const template of recurringTemplates) {
            if (!template.recurrenceRule)
                continue; // Should be filtered by query, but double-check
            // Use task's original due date as the start (dtstart) for RRULE, or createdAt if no due date
            const dtstart = template.dueDate || template.createdAt;
            const ruleOptions = rrule_1.RRule.parseString(template.recurrenceRule);
            ruleOptions.dtstart = dtstart;
            const rule = new rrule_1.RRule(ruleOptions);
            // Calculate occurrences between now and the lookAheadDate
            const now = new Date();
            const occurrences = rule.between(now, lookAheadDate, true); // inc = true
            logger.debug(`Template ${template._id} (${template.title}): Found ${occurrences.length} potential occurrences.`);
            for (const occurrenceDate of occurrences) {
                // Check if an instance for this template and date already exists
                const existingInstance = yield Task_1.default.findOne({
                    recurringTaskId: template._id,
                    // Check based on the occurrence date (ignoring time might be necessary depending on precision)
                    // For simplicity, check if dueDate falls on the same day
                    dueDate: {
                        $gte: new Date(occurrenceDate.setHours(0, 0, 0, 0)),
                        $lt: new Date(occurrenceDate.setHours(23, 59, 59, 999))
                    }
                });
                if (!existingInstance) {
                    // Create a new task instance
                    const newTaskInstance = new Task_1.default(Object.assign(Object.assign({}, template), { _id: new mongoose_1.default.Types.ObjectId(), dueDate: occurrenceDate, status: 'Pending', recurring: false, recurrenceRule: undefined, recurringTaskId: template._id, completedAt: undefined, completedBy: undefined, 
                        // Reset other instance-specific fields if needed (e.g., reminders)
                        reminders: [], 
                        // Ensure timestamps are handled correctly by Mongoose
                        createdAt: new Date(), updatedAt: new Date() }));
                    yield newTaskInstance.save();
                    instancesCreated++;
                    logger.debug(`Created instance for template ${template._id} due on ${occurrenceDate.toISOString()}`);
                }
            }
        }
        logger.info(`Recurring task generation finished. Created ${instancesCreated} new instances.`);
    }
    catch (error) {
        logger.error('Error during recurring task generation process:', error);
        // Consider more specific error handling or re-throwing if needed by the job runner
    }
});
exports.generateRecurringTasks = generateRecurringTasks;
