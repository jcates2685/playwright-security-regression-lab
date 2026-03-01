import { test, expect } from '@playwright/test';
import { newAuthedContext } from '../../fixtures/sessions';
import { USER_A, USER_B } from '../../fixtures/users';
import { APIClient } from '../../support/api-client';

test.describe.serial('SCN-04: ambiguous parameters', () => {
    test.skip('must not allow cross-user basket writes', { tag: '@secure-invariant-fail' }, async ({ browser, baseURL }) => {
        /**
         * VULNERABILITY: Ambiguous Parameters allowing Cross-User Basket Manipulation
         * When API endpoints accept duplicate or ambiguous parameters, different parsers
         * may interpret them differently. This can allow attackers to:
         *  - Specify basket_id in one way (interpreted as their own basket)
         *  - Backend parser interprets the same parameter differently (as another user's basket)
         *  - Result: User B modifies User A's basket
         */

        console.log('\n========== SCN-04: STARTING CROSS-USER BASKET WRITE TEST ==========\n');

        // ============================================================================
        // SETUP: Create authenticated sessions for both User A and User B
        // ============================================================================
        console.log('📋 SETUP: Creating authenticated sessions for User A and User B...');
        const { context: contextA, page: pageA } = await newAuthedContext(browser, baseURL!, USER_A);
        const { context: contextB, page: pageB } = await newAuthedContext(browser, baseURL!, USER_B);

        const clientA = new APIClient(pageA, baseURL!);
        const clientB = new APIClient(pageB, baseURL!);
        console.log('✓ Sessions created\n');

        // ============================================================================
        // STEP 1: Confirm sessions are isolated (different baskets)
        // ============================================================================
        console.log('🔐 STEP 1: Verifying session isolation (confirming different basket IDs)...');
        console.log(`  User A email: ${USER_A.email}`);
        console.log(`  User B email: ${USER_B.email}`);

        // Verify sessions are isolated by checking that different users get different baskets
        console.log('  Fetching User A basket...');
        const testBasketAResponse = await clientA.getBasket();
        console.log(`  User A basket response status: ${testBasketAResponse.status()}`);
        const testBasketAData = await testBasketAResponse.json();
        console.log(`  User A basket response data:`, JSON.stringify(testBasketAData, null, 2));
        const sessionABasketId = String(testBasketAData.id);

        console.log('  Fetching User B basket...');
        const testBasketBResponse = await clientB.getBasket();
        console.log(`  User B basket response status: ${testBasketBResponse.status()}`);
        const testBasketBData = await testBasketBResponse.json();
        console.log(`  User B basket response data:`, JSON.stringify(testBasketBData, null, 2));
        const sessionBBasketId = String(testBasketBData.id);

        console.log(`  User A's basket ID: ${sessionABasketId}`);
        console.log(`  User B's basket ID: ${sessionBBasketId}`);

        expect(sessionABasketId).not.toBe(sessionBBasketId);
        console.log('✓ Sessions are properly isolated (different basket IDs)\n');

        // ============================================================================
        // STEP 2: Get baseline basket states for both users
        // ============================================================================
        console.log('🛒 STEP 2: Recording baseline basket states...');

        const basketAResponse = await clientA.getBasket();
        const basketAData = await basketAResponse.json();
        const userABasketId = String(basketAData.id);
        const userAInitialItemCount = basketAData.products?.length || 0;

        console.log(`  User A's Basket:`);
        console.log(`    - Basket ID: ${userABasketId}`);
        console.log(`    - Item count: ${userAInitialItemCount}`);
        if (basketAData.products?.length > 0) {
            console.log(`    - Products: ${basketAData.products.map((p: any) => `${p.name}(qty:${p.BasketItem?.quantity || 1})`).join(', ')}`);
        }

        const basketBResponse = await clientB.getBasket();
        const basketBData = await basketBResponse.json();
        const userBBasketId = String(basketBData.id);
        const userBInitialItemCount = basketBData.products?.length || 0;

        console.log(`  User B's Basket:`);
        console.log(`    - Basket ID: ${userBBasketId}`);
        console.log(`    - Item count: ${userBInitialItemCount}`);
        if (basketBData.products?.length > 0) {
            console.log(`    - Products: ${basketBData.products.map((p: any) => `${p.name}(qty:${p.BasketItem?.quantity || 1})`).join(', ')}`);
        }
        console.log('✓ Baseline states recorded\n');

        // ============================================================================
        // STEP 3: Get available products to add
        // ============================================================================
        console.log('🎁 STEP 3: Fetching available products...');
        const productsResponse = await clientA.getProducts();
        const productsData = await productsResponse.json();
        const targetProductId = String(productsData[0]?.id || '1');
        const targetProductName = productsData[0]?.name || 'Unknown Product';

        console.log(`  Available products: ${productsData.length}`);
        console.log(`  Target product for attack: ID=${targetProductId}, Name=${targetProductName}`);
        console.log('✓ Product selected\n');

        // ============================================================================
        // STEP 4: User B attempts cross-user basket write using ambiguous parameters
        // ============================================================================
        console.log('⚠️  STEP 4: User B launching cross-user basket write attack...');
        console.log(`  Attack details:`);
        console.log(`    - Attacker (User B) authenticated as: ${USER_B.email}`);
        console.log(`    - Target basket ID (User A's): ${userABasketId}`);
        console.log(`    - Product to inject: ${targetProductId} (${targetProductName})`);
        console.log(`    - Quantity: 1`);
        console.log(`  Sending POST /api/BasketItems/ request...\n`);

        const maliciousAddItemResponse = await pageB.request.post(`${baseURL}/api/BasketItems/`, {
            data: {
                // Send User A's basket ID - the vulnerability allows cross-user writes
                BasketId: userABasketId,
                quantity: 1,
                ProductId: targetProductId,
            },
        });

        console.log(`  Response status: ${maliciousAddItemResponse.status()} ${maliciousAddItemResponse.statusText()}`);
        console.log('⚠️  Attack request completed\n');

        // ============================================================================
        // STEP 5: Verify the outcome - did User A's basket get modified?
        // ============================================================================
        console.log('🔍 STEP 5: Checking if vulnerability exploited (baskets modified?)...');

        const basketAAfterResponse = await clientA.getBasket();
        const basketAAfterData = await basketAAfterResponse.json();
        const userAFinalItemCount = basketAAfterData.products?.length || 0;

        const basketBAfterResponse = await clientB.getBasket();
        const basketBAfterData = await basketBAfterResponse.json();
        const userBFinalItemCount = basketBAfterData.products?.length || 0;

        console.log(`  User A's Basket (after attack):`);
        console.log(`    - Item count: ${userAInitialItemCount} ➜ ${userAFinalItemCount} ${userAFinalItemCount > userAInitialItemCount ? '⚠️ MODIFIED!' : '✓ Unchanged'}`);
        if (basketAAfterData.products?.length > 0) {
            console.log(`    - Products: ${basketAAfterData.products.map((p: any) => `${p.name}(qty:${p.BasketItem?.quantity || 1})`).join(', ')}`);
        }

        console.log(`  User B's Basket (after attack):`);
        console.log(`    - Item count: ${userBInitialItemCount} ➜ ${userBFinalItemCount} ${userBFinalItemCount > userBInitialItemCount ? '⚠️ MODIFIED!' : '✓ Unchanged'}`);
        if (basketBAfterData.products?.length > 0) {
            console.log(`    - Products: ${basketBAfterData.products.map((p: any) => `${p.name}(qty:${p.BasketItem?.quantity || 1})`).join(', ')}`);
        }
        console.log();

        // ============================================================================
        // ASSERT: Authorization checks should identify response indicates vulnerability exists
        // ============================================================================
        console.log('✅ ASSERTIONS:\n');

        console.log(`1. Cross-user write request should be rejected with 403, but got ${maliciousAddItemResponse.status()}`);
        expect(maliciousAddItemResponse.status(), 'Cross-user write should fail with 403 Forbidden').not.toBe(200);

        console.log(`2. User A's basket should not be modified (${userAInitialItemCount} items before, ${userAFinalItemCount} after)`);
        expect(userAFinalItemCount, "User A's basket should not be modified by User B's request").toBe(userAInitialItemCount);

        console.log('\n========== SCN-04: TEST COMPLETED ==========\n');

        // Cleanup
        await contextA.close();
        await contextB.close();
    });
});
