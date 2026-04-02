import { test as base, expect, type APIRequestContext, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { newAuthedApiContext, newAuthedContext } from './sessions';
import { makeEphemeralTestUser, type TestUser, USER_A, USER_B, USER_PW_MUTATOR } from './users';

export { expect };

export type AuthedApiSession = {
    user: TestUser;
    api: APIRequestContext;
    token: string;
    basketId: string;
};

export type AuthedPageSession = {
    user: TestUser;
    context: BrowserContext;
    page: Page;
};

type SecurityFixtures = {
    authedApiFor: (user: TestUser) => Promise<AuthedApiSession>;
    authedPageFor: (user: TestUser) => Promise<AuthedPageSession>;
    makeEphemeralUser: (label: string, suffix?: string) => TestUser;
    newEphemeralApiUser: (label: string, suffix?: string) => Promise<AuthedApiSession>;
    userAApi: AuthedApiSession;
    userBApi: AuthedApiSession;
    pwMutatorApi: AuthedApiSession;
    userAPage: AuthedPageSession;
    userBPage: AuthedPageSession;
    pwMutatorPage: AuthedPageSession;
};

function buildFixtureRunKey(testInfo: TestInfo): string {
    const titleKey = testInfo.titlePath
        .join('-')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    return `${testInfo.workerIndex}-${testInfo.retry}-${Date.now()}-${titleKey}`;
}

export const test = base.extend<SecurityFixtures>({
    authedApiFor: async ({ baseURL }, use) => {
        const sessions: AuthedApiSession[] = [];

        await use(async (user: TestUser) => {
            const { api, token, basketId } = await newAuthedApiContext(baseURL!, user);
            const session = { user, api, token, basketId };
            sessions.push(session);
            return session;
        });

        await Promise.allSettled(sessions.map(async ({ api }) => api.dispose()));
    },

    authedPageFor: async ({ baseURL, browser }, use) => {
        const sessions: AuthedPageSession[] = [];

        await use(async (user: TestUser) => {
            const { context, page } = await newAuthedContext(browser, baseURL!, user);
            const session = { user, context, page };
            sessions.push(session);
            return session;
        });

        await Promise.allSettled(sessions.map(async ({ context }) => context.close()));
    },

    makeEphemeralUser: async ({}, use, testInfo) => {
        const runKey = buildFixtureRunKey(testInfo);
        let counter = 0;

        await use((label: string, suffix?: string) => {
            counter += 1;
            const uniqueKey = [runKey, suffix, counter].filter(Boolean).join('-');
            return makeEphemeralTestUser(label, uniqueKey);
        });
    },

    newEphemeralApiUser: async ({ authedApiFor, makeEphemeralUser }, use) => {
        await use(async (label: string, suffix?: string) => {
            return authedApiFor(makeEphemeralUser(label, suffix));
        });
    },

    userAApi: async ({ authedApiFor }, use) => {
        await use(await authedApiFor(USER_A));
    },

    userBApi: async ({ authedApiFor }, use) => {
        await use(await authedApiFor(USER_B));
    },

    pwMutatorApi: async ({ authedApiFor }, use) => {
        await use(await authedApiFor(USER_PW_MUTATOR));
    },

    userAPage: async ({ authedPageFor }, use) => {
        await use(await authedPageFor(USER_A));
    },

    userBPage: async ({ authedPageFor }, use) => {
        await use(await authedPageFor(USER_B));
    },

    pwMutatorPage: async ({ authedPageFor }, use) => {
        await use(await authedPageFor(USER_PW_MUTATOR));
    },
});
