import type { Page, APIResponse } from '@playwright/test';

/**
 * APIClient provides a centralized abstraction for all API calls
 * This reduces boilerplate in tests and makes the contract explicit
 */
export class APIClient {
    constructor(
        private page: Page,
        private baseURL: string,
    ) {}

    /**
     * Login (used for verifying password changes)
     */
    async login(email: string, password: string): Promise<APIResponse> {
        return this.page.request.post(`${this.baseURL}/rest/user/login`, {
            data: { email, password },
        });
    }

    /**
     * Change password via the insecure GET endpoint
     * NOTE: This is intentionally unsafe and is tested as a security-quality finding.
     */
    async changePasswordViaGET(currentPassword: string, newPassword: string, repeatPassword: string): Promise<APIResponse> {
        return this.page.request.get(`${this.baseURL}/rest/user/change-password`, {
            params: {
                current: currentPassword,
                new: newPassword,
                repeat: repeatPassword,
            },
        });
    }

    /**
     * Change password via POST (secure approach)
     * NOTE: Juice Shop may or may not support this; we keep it for "desired behavior" tests.
     */
    async changePasswordViaPOST(currentPassword: string, newPassword: string, repeatPassword: string): Promise<APIResponse> {
        return this.page.request.post(`${this.baseURL}/rest/user/change-password`, {
            data: {
                current: currentPassword,
                new: newPassword,
                repeat: repeatPassword,
            },
        });
    }

    /**
     * Get security question for password recovery
     */
    async getSecurityQuestion(email: string): Promise<APIResponse> {
        return this.page.request.get(`${this.baseURL}/rest/user/security-question`, {
            params: { email },
        });
    }

    /**
     * Get order tracking information
     */
    async getOrderTracking(orderId: string): Promise<APIResponse> {
        return this.page.request.get(`${this.baseURL}/rest/track-order/${orderId}`);
    }

    /**
     * Get user's basket
     */
    async getBasket(): Promise<APIResponse> {
        return this.page.request.get(`${this.baseURL}/rest/basket`);
    }

    /**
     * Add item to basket
     */
    async addBasketItem(basketId: string, productId: string, quantity: number): Promise<APIResponse> {
        return this.page.request.post(`${this.baseURL}/api/BasketItems/`, {
            data: {
                BasketId: basketId,
                quantity,
                ProductId: productId,
            },
        });
    }

    /**
     * Get available products
     */
    async getProducts(): Promise<APIResponse> {
        return this.page.request.get(`${this.baseURL}/rest/products`);
    }

    /**
     * Get user's orders
     */
    async getOrders(): Promise<APIResponse> {
        return this.page.request.get(`${this.baseURL}/rest/user/orders`);
    }

    /**
     * Get current authenticated user info
     */
    async whoAmI() {
        const res = await this.page.request.get(`${this.baseURL}/rest/user/whoami`);
        return {
            status: res.status(),
            json: await res.json().catch(() => null),
        };
    }
}
