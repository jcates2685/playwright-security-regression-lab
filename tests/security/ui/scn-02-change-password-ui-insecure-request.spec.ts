import { test, expect } from '@playwright/test';
import { newAuthedContext } from '../../fixtures/sessions';
import { USER_PW_MUTATOR } from '../../fixtures/users';
import { ChangePasswordPage } from '../../support/pages/change-password-page';

test.describe.serial('SCN-02: Change Password - UI insecure request design', () => {
    test('evidence (Primary): UI flow sends change-password as GET with secrets in URL', { tag: '@evidence-pass' }, async ({ browser, baseURL }) => {
        const { context, page } = await newAuthedContext(browser, baseURL!, USER_PW_MUTATOR);
        const changePasswordPage = new ChangePasswordPage(page);

        await changePasswordPage.openFromAccountMenu();

        const reqPromise = page.waitForRequest((r) => r.url().includes('/rest/user/change-password'));

        await changePasswordPage.fillCurrentPassword('definitely-wrong-password');
        await changePasswordPage.fillNewPassword('test9');
        await changePasswordPage.fillRepeatPassword('test9');
        await changePasswordPage.submit();

        const req = await reqPromise;
        expect(req.method()).toBe('GET');
        const url = new URL(req.url());
        expect(url.searchParams.get('current')).toBe('definitely-wrong-password');
        expect(url.searchParams.get('new')).toBe('test9');
        expect(url.searchParams.get('repeat')).toBe('test9');

        await context.close();
    });
});
