import { test, expect } from '@playwright/test';
import { newAuthedApiContext } from '../../fixtures/sessions';
import { USER_PW_MUTATOR } from '../../fixtures/users';
import { AccountApi } from '../../support/api/account-api';

test.describe.serial('SCN-02: Change Password - API error handling', () => {
    test('EVIDENCE (API): wrong current password can trigger server 500 on direct request', { tag: '@evidence-pass' }, async ({ baseURL }) => {
        const { api } = await newAuthedApiContext(baseURL!, USER_PW_MUTATOR);
        const accountApi = new AccountApi(api);

        const res = await accountApi.changePasswordViaGet({
            current: 'definitely-wrong-password',
            next: 'test9',
            repeat: 'test9',
        });
        expect(res.url()).toMatch(/current=|new=|repeat=/i);
        expect(res.status()).toBe(500);

        await api.dispose();
    });

    test('EVIDENCE (API): missing current password can trigger server 500 on direct request', { tag: '@evidence-pass' }, async ({ baseURL }) => {
        const { api } = await newAuthedApiContext(baseURL!, USER_PW_MUTATOR);
        const accountApi = new AccountApi(api);

        const res = await accountApi.changePasswordViaGet({
            next: 'test9',
            repeat: 'test9',
        });
        expect(res.url()).toMatch(/new=|repeat=/i);
        expect(res.status()).toBe(500);

        await api.dispose();
    });
});
