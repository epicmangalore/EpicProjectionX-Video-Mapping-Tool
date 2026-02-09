// Storage Cleanup Utility
// Run this in the browser console to clear old video files from IndexedDB

import { db } from '@/lib/db';

export async function getStorageInfo() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(2);
        const percentUsed = ((estimate.usage || 0) / (estimate.quota || 1) * 100).toFixed(2);

        console.log(`Storage: ${usedMB}MB / ${quotaMB}MB (${percentUsed}%)`);
        return estimate;
    }
}

export async function clearOldFiles(daysOld = 7) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const oldFiles = await db.files.where('timestamp').below(cutoffTime).toArray();

    console.log(`Found ${oldFiles.length} files older than ${daysOld} days`);

    if (oldFiles.length > 0) {
        await db.files.where('timestamp').below(cutoffTime).delete();
        console.log(`Deleted ${oldFiles.length} old files`);
    }

    await getStorageInfo();
}

export async function clearAllFiles() {
    const count = await db.files.count();
    console.log(`Clearing ${count} files from IndexedDB...`);
    await db.files.clear();
    console.log('All files cleared');
    await getStorageInfo();
}

// Quick fix: Clear all files
// Run in console: clearAllFiles()
