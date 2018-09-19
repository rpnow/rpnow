import { getLocalObject, setLocalObject } from "../models/storage";

const migrations: [string, () => void][] = [
    // ['Copy challenge from old beta', () => {
    //     // do stuff with getLocalObject and setLocalObject
    // }]
];

let alreadyDone = false;

export function migrateOptions() {
    if (alreadyDone) return;
    alreadyDone = true;

    const completedMigrations: string[] = getLocalObject('rpnow.migrations') || [];

    migrations
        .filter(([migrationName, _]) => completedMigrations.indexOf(migrationName) === -1)
        .forEach(([migrationName, migrate]) => {
            console.log('LocalStorage option migration: ' + migrationName);

            migrate();

            completedMigrations.push(migrationName);
            setLocalObject('rpnow.migrations', completedMigrations)
        });
}
