import type { APIRequestContext, Browser, BrowserContext, Page } from '@playwright/test';
import type { TestUser } from './users';
import { loginViaApi, newLabApiContext, normalizeBaseURL, seedUser } from '../support/api/lab-auth';
import { dismissOverlays } from '../support/ui/overlays';

async function loginViaUI(page: Page, baseURL: string, user: TestUser) {
    await page.goto(`${baseURL}/#/login`);
    await dismissOverlays(page);

    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);
    await page.locator('#loginButton').click();
    await page.waitForLoadState('networkidle');

    // Navigate to home page and wait for products to load
    await page.goto(`${baseURL}/`);
    // Wait for product cards to be visible - ensures products API has responded and rendered
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15_000 });
}

export async function newAuthedContext(browser: Browser, baseURL: string, user: TestUser): Promise<{ context: BrowserContext; page: Page }> {
    const url = normalizeBaseURL(baseURL);

    // Seed user via API (no UI registration), then login via UI
    await seedUser(url, user);
    const context = await browser.newContext();
    const page = await context.newPage();

    await loginViaUI(page, url, user);

    return { context, page };
}

export async function newAuthedApiContext(baseURL: string, user: TestUser): Promise<{ api: APIRequestContext; token: string; basketId: string }> {
    const url = normalizeBaseURL(baseURL);

    await seedUser(url, user);
    const api = await newLabApiContext(url);
    const { token, basketId } = await loginViaApi(api, user);

    return { api, token, basketId };
}
