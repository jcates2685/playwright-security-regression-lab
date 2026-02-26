import type { Page } from '@playwright/test';

export class ChangePasswordPage {
    constructor(private page: Page) {}

    async openFromAccountMenu() {
        await this.page.getByRole('button', { name: /show\/hide account menu|account/i }).click();
        await this.page.getByRole('menuitem', { name: /show privacy and security menu/i }).click();
        await this.page.getByRole('menuitem', { name: /change password/i }).click();
    }

    async fillCurrentPassword(value: string) {
        await this.page.locator('#currentPassword').fill(value);
    }

    async fillNewPassword(value: string) {
        await this.page.locator('#newPassword').fill(value);
    }

    async fillRepeatPassword(value: string) {
        await this.page.locator('#newPasswordRepeat').fill(value);
    }

    async submit() {
        await this.page.locator('#changeButton').click();
    }
}
