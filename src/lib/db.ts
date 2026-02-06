import Dexie, { Table } from "dexie";

export interface DBProject {
    id?: number;
    name: string;
    data: string; // JSON stringified project data
    thumbnail?: string; // Base64 image
    createdAt: number;
    updatedAt: number;
}

export interface DBAsset {
    id?: number;
    projectId: number;
    assetId: string;
    name: string;
    type: string;
    data: Blob; // Actual file data
    createdAt: number;
}

export class ProjectionXDatabase extends Dexie {
    projects!: Table<DBProject, number>;
    assets!: Table<DBAsset, number>;

    constructor() {
        super("ProjectionXDB");

        this.version(1).stores({
            projects: "++id, name, createdAt, updatedAt",
            assets: "++id, projectId, assetId, name, type, createdAt",
        });
    }
}

export const db = new ProjectionXDatabase();
