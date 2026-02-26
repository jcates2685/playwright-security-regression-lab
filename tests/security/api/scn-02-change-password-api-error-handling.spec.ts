import { test, expect } from '@playwright/test';
import { newAuthedContext } from '../../fixtures/sessions';
import { USER_PW_MUTATOR } from '../../fixtures/users';

test.describe.serial('SCN-02: Change Password - API error handling', () => {
    test('EVIDENCE (API): wrong current password can trigger server 500 on direct request', { tag: '@evidence-pass' }, async ({ browser, baseURL }) => {
        const { context, page } = await newAuthedContext(browser, baseURL!, USER_PW_MUTATOR);

        const res = await page.request.get(`${baseURL}/rest/user/change-password`, {
            params: {
                current: 'definitely-wrong-password',
                new: 'test9',
                repeat: 'test9',
            },
        });
        expect(res.url()).toMatch(/current=|new=|repeat=/i);
        expect(res.status()).toBe(500);

        await context.close();
    });

    test('EVIDENCE (API): missing current password can trigger server 500 on direct request', { tag: '@evidence-pass' }, async ({ browser, baseURL }) => {
        const { context, page } = await newAuthedContext(browser, baseURL!, USER_PW_MUTATOR);

        const res = await page.request.get(`${baseURL}/rest/user/change-password`, {
            params: {
                new: 'test9',
                repeat: 'test9',
            },
        });
        expect(res.url()).toMatch(/new=|repeat=/i);
        expect(res.status()).toBe(500);

        await context.close();
    });
});
