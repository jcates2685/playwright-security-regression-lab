import { test, expect } from '@playwright/test';
import { ForgotPasswordPage } from '../../support/pages/forgot-password-page';
import { USER_A } from '../../fixtures/users';
const KNOWN_EXISTING_RECOVERY_EMAIL = process.env.KNOWN_EXISTING_RECOVERY_EMAIL ?? USER_A.email;

test.describe('SCN-03: Password Recovery should not enumerate accounts', { tag: '@evidence-pass' }, () => {
    test('valid email: recovery flow enables security question', async ({ page, baseURL }) => {
        const forgotPasswordPage = new ForgotPasswordPage(page, baseURL!);
        await forgotPasswordPage.navigate();

        const validResponse = await forgotPasswordPage.typeEmailAndWaitForSecurityQuestionResponse(KNOWN_EXISTING_RECOVERY_EMAIL);
        const validBody = await validResponse.json().catch(() => null);

        expect(validResponse.status()).toBe(200);
        expect(validBody?.question?.id, `Expected recovery question for known existing email ${KNOWN_EXISTING_RECOVERY_EMAIL}, got body=${JSON.stringify(validBody)}`).toBeDefined();
        const hasQuestion = await forgotPasswordPage.securityQuestionIsEnabled();

        console.log('Valid email UI response:', {
            email: KNOWN_EXISTING_RECOVERY_EMAIL,
            status: validResponse.status(),
            body: validBody,
            hasSecurityQuestion: hasQuestion,
        });

        expect(hasQuestion).toBe(true);
    });

    test('invalid email: recovery flow remains disabled', async ({ page, baseURL }) => {
        const forgotPasswordPage = new ForgotPasswordPage(page, baseURL!);
        await forgotPasswordPage.navigate();

        const invalidEmail = 'nonexistent-' + Date.now() + '@example.com';
        const invalidResponse = await forgotPasswordPage.typeEmailAndWaitForSecurityQuestionResponse(invalidEmail);
        const invalidBody = await invalidResponse.json().catch(() => null);

        expect(invalidResponse.status()).toBe(200);
        expect(Array.isArray(invalidBody) ? invalidBody.length === 0 : invalidBody?.question === undefined).toBe(true);
        const hasQuestion = await forgotPasswordPage.securityQuestionIsEnabled();

        console.log('Invalid email UI response:', {
            email: invalidEmail,
            status: invalidResponse.status(),
            body: invalidBody,
            hasSecurityQuestion: hasQuestion,
        });

        expect(hasQuestion).toBe(false);
    });
});
