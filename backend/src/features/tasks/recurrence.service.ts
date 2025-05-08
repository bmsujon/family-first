import Task, { ITask } from '../../models/Task';
import { RRule } from 'rrule';
import winston from 'winston'; // Optional: for logging
import mongoose from 'mongoose';

// Configure logger (or import existing one)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()],
});

/**
 * Generates instances for recurring tasks based on their RRULE.
 * Typically run by a scheduled job.
 */
export const generateRecurringTasks = async (): Promise<void> => {
    logger.info('Starting recurring task instance generation...');

    const generationWindowDays = 30; // How many days ahead to generate instances for
    const lookAheadDate = new Date();
    lookAheadDate.setDate(lookAheadDate.getDate() + generationWindowDays);

    try {
        // Find all active recurring task templates
        const recurringTemplates = await Task.find({
            recurring: true,
            recurrenceRule: { $nin: [null, ''] }, // Use $nin (not in) to exclude null and empty string
            // We can add other filters here later if needed, e.g.,
            // status: { $ne: 'Completed' }
        }).lean(); // Use .lean() for performance if we don't need Mongoose documents

        logger.info(`Found ${recurringTemplates.length} recurring task templates.`);

        let instancesCreated = 0;

        for (const template of recurringTemplates) {
            if (!template.recurrenceRule) continue; // Should be filtered by query, but double-check
            
            // Use task's original due date as the start (dtstart) for RRULE, or createdAt if no due date
            const dtstart = template.dueDate || template.createdAt;
            const ruleOptions = RRule.parseString(template.recurrenceRule);
            ruleOptions.dtstart = dtstart;
            
            const rule = new RRule(ruleOptions);

            // Calculate occurrences between now and the lookAheadDate
            const now = new Date();
            const occurrences = rule.between(now, lookAheadDate, true); // inc = true

            logger.debug(`Template ${template._id} (${template.title}): Found ${occurrences.length} potential occurrences.`);

            for (const occurrenceDate of occurrences) {
                // Check if an instance for this template and date already exists
                const existingInstance = await Task.findOne({
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
                    const newTaskInstance = new Task({
                        ...template, // Copy most fields from template
                        _id: new mongoose.Types.ObjectId(), // Generate new ID
                        dueDate: occurrenceDate, // Set specific due date for this instance
                        status: 'Pending', // Reset status to Pending
                        recurring: false, // This is an instance, not a template
                        recurrenceRule: undefined, // Clear the rule for the instance
                        recurringTaskId: template._id, // Link back to the template
                        completedAt: undefined, // Reset completion status
                        completedBy: undefined,
                        // Reset other instance-specific fields if needed (e.g., reminders)
                        reminders: [],
                        // Ensure timestamps are handled correctly by Mongoose
                        createdAt: new Date(), 
                        updatedAt: new Date(),
                    });

                    await newTaskInstance.save();
                    instancesCreated++;
                    logger.debug(`Created instance for template ${template._id} due on ${occurrenceDate.toISOString()}`);
                }
            }
        }

        logger.info(`Recurring task generation finished. Created ${instancesCreated} new instances.`);

    } catch (error: any) {
        logger.error('Error during recurring task generation process:', error);
        // Consider more specific error handling or re-throwing if needed by the job runner
    }
}; 