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

export interface DBSetting {
    key: string;
    value: string;
}

class ProjectXDB extends Dexie {
    files!: Table<FileRecord>;
    projects!: Table<DBProject>;
    assets!: Table<DBAsset>;
    settings!: Table<DBSetting>;

    constructor() {
        super('ProjectionXDB');
        this.version(1).stores({
            files: 'id, timestamp',
            projects: '++id, name, updatedAt',
            assets: '++id, projectId'
        });
        this.version(2).stores({
            files: 'id, timestamp',
            projects: '++id, name, updatedAt',
            assets: '++id, projectId',
            settings: 'key'
        });
        // Keep DB version ahead of legacy/dev schemas (e.g. existing version 12)
        // to avoid VersionError: requested version < existing version.
        this.version(13).stores({
            files: 'id, timestamp',
            projects: '++id, name, updatedAt',
            assets: '++id, projectId',
            settings: 'key'
        });
    }
}

export const db = new ProjectXDB();
