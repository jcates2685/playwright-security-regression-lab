import type { Page } from '@playwright/test';
import { dismissOverlays } from '../ui/overlays';

export class CheckoutPage {
    constructor(private page: Page) {}

    async addFirstItemToBasket() {
        const basketCountText = (await this.page.locator('button[aria-label="Show the shopping cart"] span.fa-layers-counter').textContent())?.trim();
        const basketCount = Number(basketCountText);
        const isBasketEmpty = !Number.isFinite(basketCount) || basketCount === 0;

        if (isBasketEmpty) {
            await this.page.locator('mat-card').first().getByLabel('Add to Basket').click();
        }
    }

    async openCheckout() {
        await this.page.locator('button[aria-label="Show the shopping cart"]').click();
        await this.page.locator('#checkoutButton').click();
    }

    async clickProceed() {
        const proceed = this.page.locator('button[aria-label^="Proceed"]').last();
        await dismissOverlays(this.page);
        await proceed.click({ timeout: 2_000 });
    }

    async addAddress() {
        await this.page.getByRole('button', { name: 'Add a new address' }).click();
        await this.page.getByPlaceholder('Please provide a country.').fill('US');
        await this.page.getByPlaceholder('Please provide a name.').fill('User A');
        await this.page.getByRole('spinbutton', { name: 'Mobile Number' }).fill('5551234567');
        await this.page.getByPlaceholder('Please provide a ZIP code.').fill('12345');
        await this.page.getByPlaceholder('Please provide an address.').fill('123 Test Street');
        await this.page.getByPlaceholder('Please provide a city.').fill('Testville');
        await this.page.getByPlaceholder('Please provide a state.').fill('TS');
        await this.page.getByRole('button', { name: 'Submit' }).click();
    }

    async addCard() {
        await this.page.getByRole('button', { name: 'Add new card Add a credit or' }).click();
        await this.page.getByRole('textbox', { name: 'Name' }).fill('test name');
        await this.page.getByRole('spinbutton', { name: 'Card Number' }).fill('1234532353535366');
        await this.page.getByLabel('Expiry Month').selectOption('4');
        await this.page.getByLabel('Expiry Year').selectOption('2087');
        await this.page.getByRole('button', { name: 'Submit' }).click();
    }

    async selectFirstRadioIfPresent(): Promise<boolean> {
        const firstRadio = this.page.getByRole('radio').first();

        try {
            await firstRadio.waitFor({ state: 'visible', timeout: 3_000 });
            await firstRadio.click();
            return true;
        } catch {
            return false;
        }
    }

    async placeOrder() {
        await this.page.waitForURL('/#/address/select');
        //Select or add address
        if (await this.selectFirstRadioIfPresent()) {
            await this.clickProceed();
        } else {
            await this.addAddress();
            await this.selectFirstRadioIfPresent();
            await this.clickProceed();
        }

        //Select delivery method
        await this.selectFirstRadioIfPresent();
        await this.clickProceed();

        //Select or add payment
        if (await this.selectFirstRadioIfPresent()) {
            await this.clickProceed();
        } else {
            await this.addCard();
            await this.selectFirstRadioIfPresent();
            await this.clickProceed();
        }

        //Place order and capture order id from URL
        const checkoutButton = this.page.locator('#checkoutButton');
        await checkoutButton.click();

        await this.page.waitForURL(/#\/order-completion\/[^/]+$/);

        const trackHref = await this.page.locator('a[href*="#/track-result"]').first().getAttribute('href');
        return trackHref?.match(/[?&]id=([^&#]+)/)?.[1];
    }
}
