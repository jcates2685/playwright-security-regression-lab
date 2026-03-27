import type { APIRequestContext, APIResponse } from '@playwright/test';

export class OrdersApi {
    constructor(private api: APIRequestContext) {}

    async trackOrder(orderId: string): Promise<APIResponse> {
        return this.api.get(`/rest/track-order/${orderId}`);
    }
}
