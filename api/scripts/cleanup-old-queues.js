/**
 * Queue Cleanup Script
 *
 * This script completes queue entries that have been in the queue for more than 48 hours.
 * It sets their status to 'completed' and records the endTime to maintain audit trail.
 *
 * Usage:
 *   node api/scripts/cleanup-old-queues.js [--dry-run]
 *   OR
 *   docker exec kiplombe_api node api/scripts/cleanup-old-queues.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview what would be completed without making changes
 */

const pool = require('../config/db');

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run');

async function cleanupOldQueues() {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        console.log('[QUEUE CLEANUP] Starting cleanup of queue entries older than 48 hours...');

        // Find queue entries that are older than 48 hours and not already completed/cancelled
        const [oldQueues] = await connection.execute(
            `SELECT queueId, patientId, ticketNumber, servicePoint, status, arrivalTime, createdAt
             FROM queue_entries
             WHERE status NOT IN ('completed', 'cancelled')
             AND (
                 (arrivalTime IS NOT NULL AND arrivalTime < DATE_SUB(NOW(), INTERVAL 48 HOUR))
                 OR (arrivalTime IS NULL AND createdAt < DATE_SUB(NOW(), INTERVAL 48 HOUR))
             )
             ORDER BY arrivalTime ASC, createdAt ASC`
        );

        console.log(`[QUEUE CLEANUP] Found ${oldQueues.length} queue entries older than 48 hours`);

        if (isDryRun) {
            console.log('[QUEUE CLEANUP] DRY RUN MODE - No changes will be made');
        }

        if (oldQueues.length === 0) {
            console.log('[QUEUE CLEANUP] No old queue entries to clean up.');
            await connection.rollback(); // No transaction needed
            return;
        }

        // Display summary
        const summary = {};
        for (const queue of oldQueues) {
            const servicePoint = queue.servicePoint || 'unknown';
            summary[servicePoint] = (summary[servicePoint] || 0) + 1;
        }

        console.log('[QUEUE CLEANUP] Summary by service point:');
        for (const [servicePoint, count] of Object.entries(summary)) {
            console.log(`  - ${servicePoint}: ${count} entries`);
        }

        if (isDryRun) {
            console.log('\n[QUEUE CLEANUP] DRY RUN - Would complete the following entries:');
            for (const queue of oldQueues.slice(0, 10)) { // Show first 10
                const ageHours = queue.arrivalTime
                    ? Math.round((new Date() - new Date(queue.arrivalTime)) / (1000 * 60 * 60))
                    : Math.round((new Date() - new Date(queue.createdAt)) / (1000 * 60 * 60));
                console.log(`  - Queue ${queue.queueId} (${queue.ticketNumber}) - ${queue.servicePoint} - ${ageHours} hours old`);
            }
            if (oldQueues.length > 10) {
                console.log(`  ... and ${oldQueues.length - 10} more entries`);
            }
            console.log('\n[QUEUE CLEANUP] DRY RUN completed. Run without --dry-run to apply changes.');
            await connection.rollback();
            return;
        }

        // Update each queue entry
        let completedCount = 0;
        let errorCount = 0;

        for (const queue of oldQueues) {
            try {
                const ageHours = queue.arrivalTime
                    ? Math.round((new Date() - new Date(queue.arrivalTime)) / (1000 * 60 * 60))
                    : Math.round((new Date() - new Date(queue.createdAt)) / (1000 * 60 * 60));

                await connection.execute(
                    `UPDATE queue_entries
                     SET status = 'completed',
                         endTime = NOW(),
                         updatedAt = NOW(),
                         notes = CONCAT(
                             COALESCE(notes, ''),
                             CASE WHEN notes IS NOT NULL AND notes != '' THEN ' | ' ELSE '' END,
                             'Auto-completed: Queue entry older than 48 hours (', ?, ' hours old)'
                         )
                     WHERE queueId = ?`,
                    [ageHours, queue.queueId]
                );

                completedCount++;
                console.log(`[QUEUE CLEANUP] Completed queue ${queue.queueId} (${queue.ticketNumber}) - ${queue.servicePoint} - ${ageHours} hours old`);
            } catch (error) {
                errorCount++;
                console.error(`[QUEUE CLEANUP] Error completing queue ${queue.queueId}:`, error.message);
            }
        }

        await connection.commit();

        console.log('\n[QUEUE CLEANUP] Cleanup completed successfully!');
        console.log(`[QUEUE CLEANUP] Total entries processed: ${oldQueues.length}`);
        console.log(`[QUEUE CLEANUP] Successfully completed: ${completedCount}`);
        console.log(`[QUEUE CLEANUP] Errors: ${errorCount}`);

    } catch (error) {
        await connection.rollback();
        console.error('[QUEUE CLEANUP] Error during cleanup:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run the cleanup
cleanupOldQueues()
    .then(() => {
        console.log('[QUEUE CLEANUP] Script finished successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[QUEUE CLEANUP] Script failed:', error);
        process.exit(1);
    });
