import Dexie, { Table } from 'dexie';

export interface FileRecord {
    id: string;
    blob: Blob;
    timestamp: number;
}

class ProjectionXDB extends Dexie {
    files!: Table<FileRecord>;

    constructor() {
        super('ProjectionXDB');
        this.version(1).stores({
            files: 'id, timestamp'
        });
    }
}

export const db = new ProjectionXDB();
