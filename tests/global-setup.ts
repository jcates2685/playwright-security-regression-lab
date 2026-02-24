import type { FullConfig } from '@playwright/test';
import { request } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';

import { USER_A, USER_B, USER_PW_MUTATOR, USING_DEFAULT_TEST_PASSWORDS, type TestUser } from './fixtures/users';

const BASE_URL = process.env.LAB_BASE_URL ?? 'http://127.0.0.1:3000';
const COMPOSE_FILE = 'env/docker-compose.yml';
const AUTH_DIR = '.auth';

// Match your UI-captured registration payload
const SECURITY_QUESTION_ID = 2;
const SECURITY_ANSWER = 'test';

function decodeJwtPayload(token: string): any {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
}

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

async function ensureUserExists(api: Awaited<ReturnType<typeof request.newContext>>, user: TestUser) {
    const res = await api.post('/api/Users/', {
        data: {
            email: user.email,
            password: user.password,
            passwordRepeat: user.password,
            securityQuestion: { id: SECURITY_QUESTION_ID },
            securityAnswer: SECURITY_ANSWER,
        },
    });

    // 201 = created, 400 = already exists (acceptable)
    if (![201, 400].includes(res.status())) {
        const body = await res.text().catch(() => '');
        throw new Error(`User create failed for ${user.email}: ${res.status()} ${body}`);
    }
}

async function ensureSecurityAnswerExists(api: Awaited<ReturnType<typeof request.newContext>>, user: TestUser) {
    const qRes = await api.get('/rest/user/security-question', {
        params: { email: user.email },
    });
    const qBody = await qRes.json().catch(() => null);
    if (qBody?.question?.id) return;

    const loginRes = await api.post('/rest/user/login', {
        data: { email: user.email, password: user.password },
    });
    if (!loginRes.ok()) {
        const body = await loginRes.text().catch(() => '');
        throw new Error(`Login failed for ${user.email}: ${loginRes.status()} ${body}`);
    }

    const loginBody = await loginRes.json().catch(() => null);
    const token = loginBody?.authentication?.token;
    const userId = decodeJwtPayload(token ?? '')?.data?.id;
    if (!userId) {
        throw new Error(`Could not determine user id from login token for ${user.email}`);
    }

    const answerRes = await api.post('/api/SecurityAnswers/', {
        data: {
            UserId: userId,
            answer: SECURITY_ANSWER,
            SecurityQuestionId: SECURITY_QUESTION_ID,
        },
    });

    // 201 = created, 400/409 = already exists depending on backend path/state.
    if (![201, 400, 409].includes(answerRes.status())) {
        const body = await answerRes.text().catch(() => '');
        throw new Error(`SecurityAnswer create failed for ${user.email}: ${answerRes.status()} ${body}`);
    }
}

async function login(api: Awaited<ReturnType<typeof request.newContext>>, user: TestUser) {
    const loginRes = await api.post('/rest/user/login', {
        data: { email: user.email, password: user.password },
    });

    if (!loginRes.ok()) {
        const body = await loginRes.text().catch(() => '');
        throw new Error(`Login failed for ${user.email}: ${loginRes.status()} ${body}`);
    }
}

async function loginAndSaveState(user: TestUser, storagePath: string) {
    const api = await request.newContext({ baseURL: BASE_URL });

    await ensureUserExists(api, user);
    await ensureSecurityAnswerExists(api, user);
    await login(api, user);

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
    } catch (e: any) {
        const msg = String(e?.message ?? e);

        // Only “repair” on the common failure mode.
        // If anything else fails, we want to see it.
        const looksLikeBadCreds = msg.includes('401') && msg.toLowerCase().includes('invalid email or password');

        if (!looksLikeBadCreds) throw e;

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
        throw new Error(
            `Refusing to run with default test passwords against non-local BASE_URL: ${BASE_URL}. Set USER_*_PASSWORD env vars.`,
        );
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
