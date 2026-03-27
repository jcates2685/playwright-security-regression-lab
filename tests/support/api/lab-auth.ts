import type { APIRequestContext } from '@playwright/test';
import { request } from '@playwright/test';
import type { TestUser } from '../../fixtures/users';

const SECURITY_QUESTION_ID = 2;
const SECURITY_ANSWER = 'test';

type LoginResponseBody = {
    authentication?: {
        token?: unknown;
        bid?: unknown;
    };
};

type SecurityQuestionResponseBody = {
    question?: {
        id?: unknown;
    };
};

type JwtPayload = {
    data?: {
        id?: unknown;
    };
};

function decodeJwtPayload(token: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as JwtPayload;
}

export function normalizeBaseURL(baseURL: string): string {
    return baseURL.replace(/\/+$/, '');
}

export async function newLabApiContext(baseURL: string): Promise<APIRequestContext> {
    return request.newContext({
        baseURL: normalizeBaseURL(baseURL),
        extraHTTPHeaders: {
            accept: 'application/json, text/plain, */*',
        },
    });
}

export async function ensureUserExists(api: APIRequestContext, user: TestUser): Promise<void> {
    const response = await api.post('/api/Users/', {
        data: {
            email: user.email,
            password: user.password,
            passwordRepeat: user.password,
            securityQuestion: { id: SECURITY_QUESTION_ID },
            securityAnswer: SECURITY_ANSWER,
        },
    });

    if (![201, 400].includes(response.status())) {
        const body = await response.text().catch(() => '');
        throw new Error(`User create failed for ${user.email}: ${response.status()} ${body}`);
    }
}

export async function ensureSecurityAnswerExists(api: APIRequestContext, user: TestUser): Promise<void> {
    const questionResponse = await api.get('/rest/user/security-question', {
        params: { email: user.email },
    });
    const questionBody = (await questionResponse.json().catch(() => null)) as SecurityQuestionResponseBody | null;
    if (questionBody?.question?.id) return;

    const { token } = await loginViaApi(api, user);
    const userId = decodeJwtPayload(token)?.data?.id;
    if (!userId) {
        throw new Error(`Could not determine user id from login token for ${user.email}`);
    }

    const answerResponse = await api.post('/api/SecurityAnswers/', {
        data: {
            UserId: userId,
            answer: SECURITY_ANSWER,
            SecurityQuestionId: SECURITY_QUESTION_ID,
        },
    });

    if (![201, 400, 409].includes(answerResponse.status())) {
        const body = await answerResponse.text().catch(() => '');
        throw new Error(`SecurityAnswer create failed for ${user.email}: ${answerResponse.status()} ${body}`);
    }
}

export async function seedUser(baseURL: string, user: TestUser): Promise<void> {
    const api = await newLabApiContext(baseURL);

    try {
        await ensureUserExists(api, user);
        await ensureSecurityAnswerExists(api, user);
    } finally {
        await api.dispose();
    }
}

export async function loginViaApi(api: APIRequestContext, user: TestUser): Promise<{ token: string; basketId: string }> {
    const loginResponse = await api.post('/rest/user/login', {
        data: { email: user.email, password: user.password },
    });

    if (!loginResponse.ok()) {
        const body = await loginResponse.text().catch(() => '');
        throw new Error(`Login failed for ${user.email}: ${loginResponse.status()} ${body}`);
    }

    const loginBody = (await loginResponse.json().catch(() => null)) as LoginResponseBody | null;
    const token = loginBody?.authentication?.token;
    const basketId = loginBody?.authentication?.bid;

    if (!token) {
        throw new Error(`Authentication token not found in login response for ${user.email}`);
    }
    if (!basketId) {
        throw new Error(`Basket id not found in login response for ${user.email}`);
    }

    return {
        token: String(token),
        basketId: String(basketId),
    };
}
