import { test, expect } from '../../fixtures/security';
import { loginViaApi, newLabApiContext } from '../../support/api/lab-auth';
import { ChangePasswordPage } from '../../support/pages/change-password-page';

test.describe.serial('SCN-02: Change Password - valid success control', () => {
    test('control: valid change-password updates credentials and allows reauthentication', { tag: '@evidence-pass' }, async ({ authedPageFor, makeEphemeralUser, baseURL }) => {
        const initialUser = {
            ...makeEphemeralUser('SCN02-VALID-SUCCESS'),
            password: 'test1',
        };
        const updatedUser = {
            ...initialUser,
            password: 'test9',
        };
        const { page } = await authedPageFor(initialUser);
        const changePasswordPage = new ChangePasswordPage(page);

        await changePasswordPage.openFromAccountMenu();

        const changePasswordResponsePromise = page.waitForResponse((response) => {
            return response.url().includes('/rest/user/change-password');
        });

        await changePasswordPage.fillCurrentPassword(initialUser.password);
        await changePasswordPage.fillNewPassword(updatedUser.password);
        await changePasswordPage.fillRepeatPassword(updatedUser.password);
        await changePasswordPage.submit();

        const changePasswordResponse = await changePasswordResponsePromise;
        const changePasswordBody = await changePasswordResponse.text();

        expect(changePasswordResponse.ok(), `A valid password change should succeed through the UI flow. status=${changePasswordResponse.status()} body=${changePasswordBody}`).toBeTruthy();

        const reauthApi = await newLabApiContext(baseURL!);

        try {
            const { token, basketId } = await loginViaApi(reauthApi, updatedUser);
            expect(token).toBeTruthy();
            expect(basketId).toBeTruthy();

            const oldPasswordLoginResponse = await reauthApi.post('/rest/user/login', {
                data: {
                    email: initialUser.email,
                    password: initialUser.password,
                },
            });

            expect(oldPasswordLoginResponse.status(), 'Old credentials should no longer authenticate after a successful password change.').toBe(401);
        } finally {
            await reauthApi.dispose();
        }
    });
});
