import { test, expect } from '../../fixtures/security';
import { ChangePasswordPage } from '../../support/pages/change-password-page';

test.describe.serial('SCN-02: Change Password - UI insecure request design', () => {
    test('evidence (Primary): UI flow sends change-password as GET with secrets in URL', { tag: '@evidence-pass' }, async ({ pwMutatorPage }) => {
        const { page } = pwMutatorPage;
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
    });

    test('secure invariant: password change must not use GET or place secrets in the URL', { tag: '@secure-invariant-fail' }, async ({ pwMutatorPage }) => {
        test.info().annotations.push({
            type: 'expected-on-vulnerable-target',
            description: 'Juice Shop is expected to violate this invariant until the change-password contract stops using GET and query-string secrets.',
        });

        const { page } = pwMutatorPage;
        const changePasswordPage = new ChangePasswordPage(page);

        await changePasswordPage.openFromAccountMenu();

        const reqPromise = page.waitForRequest((r) => r.url().includes('/rest/user/change-password'));

        await changePasswordPage.fillCurrentPassword('definitely-wrong-password');
        await changePasswordPage.fillNewPassword('test9');
        await changePasswordPage.fillRepeatPassword('test9');
        await changePasswordPage.submit();

        const req = await reqPromise;
        const url = new URL(req.url());

        expect.soft(['POST', 'PATCH'], 'Password change must use POST or PATCH rather than GET.').toContain(req.method());
        expect.soft(url.searchParams.get('current'), 'Current password must not be present in the URL.').toBeNull();
        expect.soft(url.searchParams.get('new'), 'New password must not be present in the URL.').toBeNull();
        expect.soft(url.searchParams.get('repeat'), 'Repeat password must not be present in the URL.').toBeNull();
    });
});
