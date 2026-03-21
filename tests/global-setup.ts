import type { FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';

import { USER_A, USER_B, USER_PW_MUTATOR, USING_DEFAULT_TEST_PASSWORDS, type TestUser } from './fixtures/users';
import { ensureSecurityAnswerExists, ensureUserExists, loginViaApi, newLabApiContext } from './support/api/lab-auth';

const BASE_URL = process.env.LAB_BASE_URL ?? 'http://127.0.0.1:3000';
const COMPOSE_FILE = 'env/docker-compose.yml';
const AUTH_DIR = '.auth';

function run(cmd: string) {
    execSync(cmd, { stdio: 'inherit' });
}

function isLocalLabUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

async function waitForServer(url: string, timeoutMs = 60_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url, { method: 'GET' });
            if (res.ok) return;
        } catch {
            // ignore and retry
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Server not reachable at ${url} within ${timeoutMs}ms`);
}

async function loginAndSaveState(user: TestUser, storagePath: string) {
    const api = await newLabApiContext(BASE_URL);

    await ensureUserExists(api, user);
    await ensureSecurityAnswerExists(api, user);
    await loginViaApi(api, user);

    // Save auth state (cookies/localStorage tokens)
    await api.storageState({ path: storagePath });

    await api.dispose();
}

/**
 * Tries to seed + login. If login fails (most commonly: user exists with different password),
 * it will reset the lab DB once and retry.
 */
async function seedWithOneRepairAttempt(user: TestUser, storagePath: string) {
    try {
        await loginAndSaveState(user, storagePath);
        return;
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);

        // Only “repair” on the common failure mode.
        // If anything else fails, we want to see it.
        const looksLikeBadCreds = msg.includes('401') && msg.toLowerCase().includes('invalid email or password');

        if (!looksLikeBadCreds) throw error;

        // Repair path: wipe volumes (fresh DB), restart, retry once
        run(`docker compose -f ${COMPOSE_FILE} down -v`);
        run(`docker compose -f ${COMPOSE_FILE} up -d`);
        await waitForServer(BASE_URL);

        // retry once
        await loginAndSaveState(user, storagePath);
    }
}

export default async function globalSetup(_config: FullConfig) {
    if (USING_DEFAULT_TEST_PASSWORDS && !isLocalLabUrl(BASE_URL)) {
        throw new Error(`Refusing to run with default test passwords against non-local BASE_URL: ${BASE_URL}. Set USER_*_PASSWORD env vars.`);
    }

    if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR);

    // Ensure lab is up
    run(`docker compose -f ${COMPOSE_FILE} up -d`);
    await waitForServer(BASE_URL);

    // Seed users and save their auth state (repair once if stale user/passwords exist)
    await seedWithOneRepairAttempt(USER_A, `${AUTH_DIR}/userA.json`);
    await seedWithOneRepairAttempt(USER_B, `${AUTH_DIR}/userB.json`);
    await seedWithOneRepairAttempt(USER_PW_MUTATOR, `${AUTH_DIR}/pwMutator.json`);
}
