import { test, expect } from '../../fixtures/security';
import { newAuthedApiContext, newAuthedContext } from '../../fixtures/sessions';
import { USER_A } from '../../fixtures/users';
import { OrdersApi } from '../../support/api/orders-api';
import { CheckoutPage } from '../../support/pages/checkout-page';

test.describe.serial('SCN-01: Track Order IDOR', () => {
    let capturedOrderId: string | undefined;
    let userATrackOrderBody: unknown;
    let userATrackOrderText: string | undefined;

    test.beforeAll(async ({ browser, baseURL }) => {
        const { context, page } = await newAuthedContext(browser, baseURL!, USER_A);
        const { api } = await newAuthedApiContext(baseURL!, USER_A);

        try {
            const checkout = new CheckoutPage(page);
            await checkout.addFirstItemToBasket();
            await checkout.openCheckout();

            capturedOrderId = await checkout.placeOrder();
            expect(capturedOrderId).toBeTruthy();

            const ordersApi = new OrdersApi(api);
            const userATrackOrderResponse = await ordersApi.trackOrder(capturedOrderId);
            expect(userATrackOrderResponse.status()).toBe(200);
            userATrackOrderText = await userATrackOrderResponse.text();
            userATrackOrderBody = JSON.parse(userATrackOrderText);

            await context.close();
        } finally {
            await api.dispose();
        }
    });

    test('evidence: User B can view User A tracked order details', { tag: '@evidence-pass' }, async ({ userBPage, baseURL }) => {
        const { page } = userBPage;
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
    });

    test('secure invariant: User B must not access User A tracked order details', { tag: '@secure-invariant-fail' }, async ({ userBApi }) => {
        test.info().annotations.push({
            type: 'expected-on-vulnerable-target',
            description: 'Juice Shop is expected to violate this invariant until track-order authorization is enforced.',
        });

        const ordersApi = new OrdersApi(userBApi.api);
        const trackOrderResponse = await ordersApi.trackOrder(capturedOrderId!);
        const status = trackOrderResponse.status();
        const bodyText = await trackOrderResponse.text();

        expect.soft([401, 403, 404], 'User B should receive an authorization failure or safe not-found response for User A orderId.').toContain(status);
        expect
            .soft(bodyText, 'Unauthorized track-order responses must not expose order metadata such as products, pricing, addressId, or paymentId.')
            .not.toMatch(/products|totalPrice|addressId|paymentId/i);
        expect.soft(bodyText, 'User B must not receive the same order details as User A.').not.toBe(userATrackOrderText);
    });
});
