import type { Page, Response } from '@playwright/test';

/**
 * ForgotPasswordPage encapsulates the forgot password UI
 * This Page Object Model makes tests cleaner and easier to maintain
 */
export class ForgotPasswordPage {
    constructor(
        private page: Page,
        private baseURL: string,
    ) {}

    /**
     * Navigate to the forgot password page
     */
    async navigate() {
        await this.page.goto(`${this.baseURL}/#/forgot-password`);
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Type an email address for password recovery
     */
    async typeEmail(email: string) {
        await this.page.locator('#email').fill(email);
        await this.page.locator('#email').blur();
    }

    /**
     * Type an email and wait for the security-question API response tied to that email.
     */
    async typeEmailAndWaitForSecurityQuestionResponse(email: string): Promise<Response> {
        const responsePromise = this.page.waitForResponse((response) => {
            if (!response.url().includes('/rest/user/security-question')) return false;
            try {
                const url = new URL(response.url());
                return url.searchParams.get('email') === email;
            } catch {
                return false;
            }
        });

        await this.typeEmail(email);
        return responsePromise;
    }

    /**
     * Check if security question is displayed
     */
    async securityQuestionIsEnabled(): Promise<boolean> {
        return this.page.locator('#securityAnswer').isEnabled();
    }
}
