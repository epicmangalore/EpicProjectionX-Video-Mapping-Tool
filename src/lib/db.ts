import Dexie, { Table } from 'dexie';

export interface FileRecord {
    id: string;
    blob: Blob;
    timestamp: number;
}

export interface DBProject {
    id?: number;
    name: string;
    data: string;
    createdAt: number;
    updatedAt: number;
}

export interface DBAsset {
    id?: number;
    projectId: number;
    type: string;
    url: string;
    name: string;
}

class ProjectionXDB extends Dexie {
    files!: Table<FileRecord>;
    projects!: Table<DBProject>;
    assets!: Table<DBAsset>;

    constructor() {
        super('ProjectionXDB');
        this.version(1).stores({
            files: 'id, timestamp',
            projects: '++id, name, updatedAt',
            assets: '++id, projectId'
        });
    }
}

export const db = new ProjectionXDB();
