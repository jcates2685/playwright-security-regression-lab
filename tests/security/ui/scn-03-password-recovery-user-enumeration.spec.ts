import { test, expect } from '@playwright/test';
import { ForgotPasswordPage } from '../../support/pages/forgot-password-page';
import { USER_A } from '../../fixtures/users';
const KNOWN_EXISTING_RECOVERY_EMAIL = process.env.KNOWN_EXISTING_RECOVERY_EMAIL ?? USER_A.email;

test.describe('SCN-03: Password Recovery should not enumerate accounts', () => {
    test('valid email: recovery flow enables security question', { tag: '@evidence-pass' }, async ({ page, baseURL }) => {
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

    test('invalid email: recovery flow remains disabled', { tag: '@evidence-pass' }, async ({ page, baseURL }) => {
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

    test('secure invariant: existing and non-existent emails must produce indistinguishable recovery behavior', { tag: '@secure-invariant-fail' }, async ({ page, baseURL }) => {
        test.info().annotations.push({
            type: 'expected-on-vulnerable-target',
            description: 'Juice Shop is expected to leak account existence through password recovery behavior until the flow is normalized.',
        });

        const forgotPasswordPage = new ForgotPasswordPage(page, baseURL!);
        const invalidEmail = 'nonexistent-' + Date.now() + '@example.com';

        await forgotPasswordPage.navigate();

        const validResponse = await forgotPasswordPage.typeEmailAndWaitForSecurityQuestionResponse(KNOWN_EXISTING_RECOVERY_EMAIL);
        const validBody = await validResponse.json().catch(() => null);
        const validQuestionEnabled = await forgotPasswordPage.securityQuestionIsEnabled();
        const validQuestionText = await forgotPasswordPage.securityQuestionText();

        await forgotPasswordPage.navigate();

        const invalidResponse = await forgotPasswordPage.typeEmailAndWaitForSecurityQuestionResponse(invalidEmail);
        const invalidBody = await invalidResponse.json().catch(() => null);
        const invalidQuestionEnabled = await forgotPasswordPage.securityQuestionIsEnabled();
        const invalidQuestionText = await forgotPasswordPage.securityQuestionText();

        console.log('SCN-03 secure invariant comparison:', {
            valid: {
                email: KNOWN_EXISTING_RECOVERY_EMAIL,
                status: validResponse.status(),
                body: validBody,
                questionEnabled: validQuestionEnabled,
                questionText: validQuestionText,
            },
            invalid: {
                email: invalidEmail,
                status: invalidResponse.status(),
                body: invalidBody,
                questionEnabled: invalidQuestionEnabled,
                questionText: invalidQuestionText,
            },
        });

        expect.soft(invalidResponse.status(), 'Recovery responses should not differ by account existence.').toBe(validResponse.status());
        expect.soft(invalidQuestionEnabled, 'Recovery UI should not enable a different follow-up state for an existing account than for a non-existent one.').toBe(validQuestionEnabled);
        expect.soft(invalidQuestionText, 'Recovery UI should not reveal a user-specific security question for an existing account.').toBe(validQuestionText);
        expect.soft(invalidBody, 'Recovery response body should not disclose account existence through shape differences that drive the UI.').toEqual(validBody);
    });
});
