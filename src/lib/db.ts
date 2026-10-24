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

const SCHEMA_V1 = {
    files: 'id, timestamp',
    projects: '++id, name, updatedAt',
    assets: '++id, projectId'
};

const SCHEMA_V2 = {
    ...SCHEMA_V1,
    settings: 'key'
};

function applySchema(database: Dexie) {
    database.version(1).stores(SCHEMA_V1);
    database.version(2).stores(SCHEMA_V2);
    // Keep DB version ahead of legacy/dev schemas (e.g. existing version 12)
    // to avoid VersionError: requested version < existing version.
    database.version(13).stores(SCHEMA_V2);
}

class ProjectXDB extends Dexie {
    files!: Table<FileRecord>;
    projects!: Table<DBProject>;
    assets!: Table<DBAsset>;
    settings!: Table<DBSetting>;

    constructor() {
        super('ProjectXDB');
        applySchema(this);
    }
}

export const db = new ProjectXDB();

const LEGACY_DB_NAME = 'ProjectionXDB';
const LEGACY_PROJECT_KEY = 'projectionx-project-storage';
const PROJECT_KEY = 'projectx-project-storage';

/**
 * One-time migration from the legacy "ProjectionXDB" IndexedDB database.
 * Copies all tables into the new "ProjectXDB" database (renaming the persisted
 * project-store key), then deletes the legacy database. Resolves when done so
 * consumers can gate reads/writes via `dbReady`.
 */
async function migrateLegacyDatabase(): Promise<void> {
    if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return;

    try {
        const instances = await indexedDB.databases();
        if (!instances.some((instance) => instance.name === LEGACY_DB_NAME)) return;

        const legacy = new Dexie(LEGACY_DB_NAME);
        applySchema(legacy);

        const [files, projects, assets, settings] = await Promise.all([
            legacy.table<FileRecord>('files').toArray(),
            legacy.table<DBProject>('projects').toArray(),
            legacy.table<DBAsset>('assets').toArray(),
            legacy.table<DBSetting>('settings').toArray(),
        ]);
        // Auto-increment tables don't embed their primary key; fetch keys explicitly
        const [projectKeys, assetKeys] = await Promise.all([
            legacy.table('projects').toCollection().primaryKeys() as Promise<number[]>,
            legacy.table('assets').toCollection().primaryKeys() as Promise<number[]>,
        ]);
        legacy.close();

        // Rename the persisted project-store key while copying
        for (const row of settings) {
            if (row.key === LEGACY_PROJECT_KEY) row.key = PROJECT_KEY;
        }

        // Only migrate into a fresh database so existing data is never duplicated
        const [fileCount, projectCount, settingCount] = await Promise.all([
            db.files.count(),
            db.projects.count(),
            db.settings.count(),
        ]);

        if (fileCount + projectCount + settingCount > 0) {
            console.warn('[ProjectX] Skipped legacy database migration: ProjectXDB is not empty');
            return;
        }

        if (files.length > 0) await db.files.bulkPut(files);
        if (projects.length > 0) await db.projects.bulkPut(projects, projectKeys);
        if (assets.length > 0) await db.assets.bulkPut(assets, assetKeys);
        if (settings.length > 0) await db.settings.bulkPut(settings);

        await Dexie.delete(LEGACY_DB_NAME);
        console.log('[ProjectX] Migrated legacy ProjectionXDB data');
    } catch (error) {
        console.error('[ProjectX] Legacy database migration failed:', error);
    }
}

export const dbReady: Promise<void> = migrateLegacyDatabase();
