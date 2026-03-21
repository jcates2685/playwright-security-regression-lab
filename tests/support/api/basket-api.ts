import type { APIRequestContext } from '@playwright/test';

export type BasketLineItem = {
    id: number;
    quantity: number;
};

export type BasketSnapshot = {
    basketId: string;
    products: BasketLineItem[];
};

export type BasketItemMutationResult = {
    status: number;
    text: string;
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

export function mutationResultBasketId(text: string): string {
    const parsed = parseJson(text) as BasketItemMutationResponse | null;
    return String(parsed?.data?.BasketId ?? '');
}

export class BasketApi {
    constructor(
        private api: APIRequestContext,
        private token: string,
    ) {}

    async getSnapshotById(basketId: string, label: string): Promise<BasketSnapshot> {
        const response = await this.api.get(`/rest/basket/${basketId}`, {
            headers: {
                authorization: `Bearer ${this.token}`,
            },
        });
        const text = await response.text();

        if (!response.ok()) {
            throw new Error(`${label} GET /rest/basket/${basketId} failed: ${response.status()} ${text}`);
        }

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

        if (!snapshot.basketId) {
            throw new Error(`${label} basket snapshot did not include a basket id`);
        }

        console.log(`${label} basket snapshot:`, snapshot);
        return snapshot;
    }

    async postRawItemMutation(payload: string): Promise<BasketItemMutationResult> {
        const response = await this.api.post('/api/BasketItems/', {
            headers: {
                authorization: `Bearer ${this.token}`,
                'content-type': 'application/json',
            },
            data: payload,
        });

        return {
            status: response.status(),
            text: await response.text(),
        };
    }
}
