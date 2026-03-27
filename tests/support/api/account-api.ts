import type { APIRequestContext, APIResponse } from '@playwright/test';

export class AccountApi {
    constructor(private api: APIRequestContext) {}

    async changePasswordViaGet(params: { current?: string; next: string; repeat: string }): Promise<APIResponse> {
        const { current, next, repeat } = params;

        return this.api.get('/rest/user/change-password', {
            params: {
                ...(current !== undefined ? { current } : {}),
                new: next,
                repeat,
            },
        });
    }

    async changePasswordViaPost(params: { current?: string; next: string; repeat: string }): Promise<APIResponse> {
        const { current, next, repeat } = params;

        return this.api.post('/rest/user/change-password', {
            data: {
                ...(current !== undefined ? { current } : {}),
                new: next,
                repeat,
            },
        });
    }

    async getSecurityQuestion(email: string): Promise<APIResponse> {
        return this.api.get('/rest/user/security-question', {
            params: { email },
        });
    }
}
