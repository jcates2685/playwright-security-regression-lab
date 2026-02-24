import { test, expect } from '@playwright/test';
import { newAuthedContext } from '../../fixtures/sessions';
import { USER_A, USER_B } from '../../fixtures/users';
import { CheckoutPage } from '../../support/pages/checkout-page';

test.describe.serial('SCN-01: Track Order IDOR', () => {
    let capturedOrderId: string | undefined;
    let userATrackOrderBody: unknown;

    test.beforeAll(async ({ browser, baseURL }) => {
        const { context, page } = await newAuthedContext(browser, baseURL!, USER_A);

        const checkout = new CheckoutPage(page);
        await checkout.addFirstItemToBasket();
        await checkout.openCheckout();

        capturedOrderId = await checkout.placeOrder();
        expect(capturedOrderId).toBeTruthy();

        const userATrackOrderResponse = await page.request.get(`${baseURL}/rest/track-order/${capturedOrderId}`);
        expect(userATrackOrderResponse.status()).toBe(200);
        userATrackOrderBody = await userATrackOrderResponse.json();

        await context.close();
    });

    test('evidence: User B can view User A tracked order details', { tag: '@evidence-pass' }, async ({ browser, baseURL }) => {
        const { context, page } = await newAuthedContext(browser, baseURL!, USER_B);
        await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });

        const trackOrderResponsePromise = page.waitForResponse((response) => {
            return response.request().method() === 'GET' && response.url().includes(`/rest/track-order/${capturedOrderId}`);
        });

        await page.evaluate((orderId) => {
            window.location.hash = `#/track-result?id=${orderId}`;
        }, capturedOrderId);

        const trackOrderResponse = await trackOrderResponsePromise;
        expect(trackOrderResponse.status()).toBe(200);
        const userBTrackOrderBody = await trackOrderResponse.json();
        expect(userBTrackOrderBody).toEqual(userATrackOrderBody);

        await context.close();
    });
});
