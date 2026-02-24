import type { Browser, BrowserContext, Page } from '@playwright/test';
import { request } from '@playwright/test';
import type { TestUser } from './users';
import { dismissOverlays } from '../support/ui/overlays';

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

function normalizeBaseURL(baseURL: string): string {
    // Remove trailing slash to avoid double slashes when building URLs
    return baseURL.replace(/\/+$/, '');
}

async function ensureUserExists(baseURL: string, user: TestUser) {
    const api = await request.newContext({ baseURL });

    const res = await api.post('/api/Users/', {
        data: {
            email: user.email,
            password: user.password,
            passwordRepeat: user.password,
            securityQuestion: { id: SECURITY_QUESTION_ID },
            securityAnswer: SECURITY_ANSWER,
        },
    });

    // 201 = created, 400 = already exists (idempotent)
    if (![201, 400].includes(res.status())) {
        const body = await res.text().catch(() => '');
        await api.dispose();
        throw new Error(`User create failed for ${user.email}: ${res.status()} ${body}`);
    }

    await ensureSecurityAnswerExists(api, user);

    await api.dispose();
}

async function loginViaUI(page: Page, baseURL: string, user: TestUser) {
    await page.goto(`${baseURL}/#/login`);
    await dismissOverlays(page);

    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);
    await page.locator('#loginButton').click();
    await page.waitForLoadState('networkidle');
}

export async function newAuthedContext(browser: Browser, baseURL: string, user: TestUser): Promise<{ context: BrowserContext; page: Page }> {
    const url = normalizeBaseURL(baseURL);

    // Seed user via API (no UI registration), then login via UI
    await ensureUserExists(url, user);
    const context = await browser.newContext();
    const page = await context.newPage();

    await loginViaUI(page, url, user);

    return { context, page };
}
