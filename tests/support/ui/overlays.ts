import type { Page } from '@playwright/test';

export async function dismissOverlays(page: Page): Promise<void> {
    const cookieDialog = page.getByRole('dialog', { name: 'cookieconsent' });

    if (await cookieDialog.isVisible().catch(() => false)) {
        await cookieDialog.getByRole('button', { name: 'dismiss cookie message' }).click();
    }

    await page
        .evaluate(() => {
            document.querySelectorAll('[aria-label="cookieconsent"]').forEach((node) => node.remove());
        })
        .catch(() => {});

    await page
        .locator('button[aria-label="Close Welcome Banner"]')
        .click({ timeout: 2_000, force: true })
        .catch(() => {});
}
