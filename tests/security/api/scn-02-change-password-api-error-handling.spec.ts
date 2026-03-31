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

    test('secure invariant (API): wrong current password must return a controlled 4xx response', { tag: '@secure-invariant-fail' }, async ({ baseURL }) => {
        test.info().annotations.push({
            type: 'expected-on-vulnerable-target',
            description: 'Juice Shop is expected to violate this invariant until invalid current-password handling returns a controlled 4xx response.',
        });

        const { api } = await newAuthedApiContext(baseURL!, USER_PW_MUTATOR);
        const accountApi = new AccountApi(api);

        try {
            const res = await accountApi.changePasswordViaGet({
                current: 'definitely-wrong-password',
                next: 'test9',
                repeat: 'test9',
            });
            const bodyText = await res.text();

            expect.soft([400, 401, 403], 'Wrong current password must return a controlled 4xx response, not a server error.').toContain(res.status());
            expect.soft(bodyText, 'Invalid-input responses must not leak a server stack trace.').not.toMatch(/stack/i);
        } finally {
            await api.dispose();
        }
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

    test('secure invariant (API): missing current password must return a controlled 4xx response', { tag: '@secure-invariant-fail' }, async ({ baseURL }) => {
        test.info().annotations.push({
            type: 'expected-on-vulnerable-target',
            description: 'Juice Shop is expected to violate this invariant until missing current-password handling returns a controlled 4xx response.',
        });

        const { api } = await newAuthedApiContext(baseURL!, USER_PW_MUTATOR);
        const accountApi = new AccountApi(api);

        try {
            const res = await accountApi.changePasswordViaGet({
                next: 'test9',
                repeat: 'test9',
            });
            const bodyText = await res.text();

            expect.soft([400, 401, 403], 'Missing current password must return a controlled 4xx response, not a server error.').toContain(res.status());
            expect.soft(bodyText, 'Missing-field responses must not leak a server stack trace.').not.toMatch(/stack/i);
        } finally {
            await api.dispose();
        }
    });
});
