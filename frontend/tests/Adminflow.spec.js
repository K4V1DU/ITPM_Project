// tests/admin-panel-flow.spec.js
// ─── UniSewana — Admin Panel Full Flow Tests ─────────────────────
// Recorded test eka clean karala proper structure ekata convert kala
// Covers: Login → Users → Orders → Listings → Reviews → Profile → Logout

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// ─── Test Credentials ─────────────────────────────────────────────
const ADMIN = {
  email:       'prabath16tharindu@gmail.com',
  password:    '08160725tHa#',
  updatedPhone:'0766514059',
};

// ─── Login Helper ─────────────────────────────────────────────────
async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/`);
  await page.getByRole('textbox', { name: 'Email address' }).fill(ADMIN.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/AdminDashBoard/, { timeout: 8000 });
}

// ════════════════════════════════════════════════════════════════
// 1. ADMIN LOGIN FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Admin Login Flow', () => {

  test('Admin can login and is redirected to AdminDashBoard', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(ADMIN.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL(/AdminDashBoard/, { timeout: 8000 });
    await expect(page).toHaveURL(/AdminDashBoard/);
    await expect(page.locator('.ad-stat-card').first()).toBeVisible({ timeout: 8000 });
  });

});

// ════════════════════════════════════════════════════════════════
// 2. ADMIN USERS MANAGEMENT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Admin Users Management Flow', () => {

  test('Admin can navigate to Users page from Dashboard', async ({ page }) => {
    await loginAdmin(page);

    // Click "View all" for Recent Users
    await page.getByRole('button', { name: 'View all →' }).first().click();
    await expect(page).toHaveURL(/AdminUsers/);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });
  });

  test('Admin can filter users by Student role', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminUsers`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('student');
    await page.waitForTimeout(500);
    const nonStudentBadges = await page.locator('.ad-badge--host, .ad-badge--admin').count();
    expect(nonStudentBadges).toBe(0);
  });

  test('Admin can filter users by Host role', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminUsers`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('host');
    await page.waitForTimeout(500);
    const nonHostBadges = await page.locator('.ad-badge--student, .ad-badge--admin').count();
    expect(nonHostBadges).toBe(0);
  });

  test('Admin can filter users by Admin role', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminUsers`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('admin');
    await page.waitForTimeout(500);
    const nonAdminBadges = await page.locator('.ad-badge--student, .ad-badge--host').count();
    expect(nonAdminBadges).toBe(0);
  });

  test('Admin can reset filter to All roles', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminUsers`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('student');
    await page.waitForTimeout(300);
    await page.getByRole('combobox').selectOption('all');
    await page.waitForTimeout(300);

    // All users visible again
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('Admin can export users list as PDF', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminUsers`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.pdf');
  });

});

// ════════════════════════════════════════════════════════════════
// 3. ADMIN FOOD ORDERS MANAGEMENT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Admin Food Orders Management Flow', () => {

  test('Admin can navigate to Orders page from Dashboard', async ({ page }) => {
    await loginAdmin(page);

    // Click "View all" for Recent Food Orders (second button)
    await page.getByRole('button', { name: 'View all →' }).nth(1).click();
    await expect(page).toHaveURL(/AdminOrders/);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });
  });

  test('Admin can filter orders by status — accepted', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminOrders`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').first().selectOption('accepted');
    await page.waitForTimeout(400);
    const nonAccepted = await page.locator('.ad-badge--pending, .ad-badge--completed, .ad-badge--cancelled').count();
    expect(nonAccepted).toBe(0);
  });

  test('Admin can filter orders by status — completed', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminOrders`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').first().selectOption('completed');
    await page.waitForTimeout(400);
    const nonCompleted = await page.locator('.ad-badge--pending, .ad-badge--accepted, .ad-badge--cancelled').count();
    expect(nonCompleted).toBe(0);
  });

  test('Admin can filter orders by status — cancelled', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminOrders`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').first().selectOption('cancelled');
    await page.waitForTimeout(400);
    const nonCancelled = await page.locator('.ad-badge--pending, .ad-badge--accepted, .ad-badge--completed').count();
    expect(nonCancelled).toBe(0);
  });

  test('Admin can filter orders by status — pending', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminOrders`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').first().selectOption('pending');
    await page.waitForTimeout(400);
    const tableOrEmpty = await page.locator('.ad-table, .ad-empty').count();
    expect(tableOrEmpty).toBeGreaterThan(0);
  });

  test('Admin can reset order status filter to All', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminOrders`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').first().selectOption('accepted');
    await page.waitForTimeout(300);
    await page.getByRole('combobox').first().selectOption('all');
    await page.waitForTimeout(300);

    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('Admin can filter orders by type — delivery', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminOrders`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').nth(1).selectOption('delivery');
    await page.waitForTimeout(400);
    const tableOrEmpty = await page.locator('.ad-table, .ad-empty').count();
    expect(tableOrEmpty).toBeGreaterThan(0);
  });

  test('Admin can filter orders by type — pickup', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminOrders`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').nth(1).selectOption('pickup');
    await page.waitForTimeout(400);
    const tableOrEmpty = await page.locator('.ad-table, .ad-empty').count();
    expect(tableOrEmpty).toBeGreaterThan(0);
  });

  test('Admin can filter orders by type — dine-in', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminOrders`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').nth(1).selectOption('dine-in');
    await page.waitForTimeout(400);
    const tableOrEmpty = await page.locator('.ad-table, .ad-empty').count();
    expect(tableOrEmpty).toBeGreaterThan(0);
  });

  test('Admin can reset order type filter to All', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminOrders`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').nth(1).selectOption('pickup');
    await page.waitForTimeout(300);
    await page.getByRole('combobox').nth(1).selectOption('all');
    await page.waitForTimeout(300);

    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

});

// ════════════════════════════════════════════════════════════════
// 4. ADMIN LISTINGS MANAGEMENT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Admin Listings Management Flow', () => {

  test('Admin can navigate to Listings page', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('button', { name: 'Listings' }).click();
    await expect(page).toHaveURL(/AdminListings/);
    await expect(page.locator('.ad-tab-switch')).toBeVisible({ timeout: 8000 });
  });

  test('Admin can filter Accommodations by Active status', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminListings`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('active');
    await page.waitForTimeout(400);
    const inactiveBadges = await page.locator('.ad-badge--expired').count();
    expect(inactiveBadges).toBe(0);
  });

  test('Admin can filter Accommodations by Inactive status', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminListings`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('inactive');
    await page.waitForTimeout(400);
    const activeBadges = await page.locator('.ad-badge--active').count();
    expect(activeBadges).toBe(0);
  });

  test('Admin can reset Accommodations filter to All', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminListings`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('inactive');
    await page.waitForTimeout(300);
    await page.getByRole('combobox').selectOption('all');
    await page.waitForTimeout(300);

    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('Admin can switch to Food Services tab and filter by Active', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminListings`);
    await expect(page.locator('.ad-tab-switch')).toBeVisible({ timeout: 8000 });

    // Switch to Food Services tab
    await page.getByRole('button', { name: 'Food Services' }).click();
    await expect(page.locator('.ad-tab-switch__btn--active')).toContainText('Food');

    await page.getByRole('combobox').selectOption('active');
    await page.waitForTimeout(400);
    const inactiveBadges = await page.locator('.ad-badge--expired').count();
    expect(inactiveBadges).toBe(0);
  });

  test('Admin can filter Food Services by Inactive status', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminListings`);
    await expect(page.locator('.ad-tab-switch')).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Food Services' }).click();
    await page.getByRole('combobox').selectOption('inactive');
    await page.waitForTimeout(400);
    const activeBadges = await page.locator('.ad-badge--active').count();
    expect(activeBadges).toBe(0);
  });

  test('Admin can reset Food Services filter to All', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminListings`);
    await expect(page.locator('.ad-tab-switch')).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Food Services' }).click();
    await page.getByRole('combobox').selectOption('inactive');
    await page.waitForTimeout(300);
    await page.getByRole('combobox').selectOption('all');
    await page.waitForTimeout(300);

    const tableOrEmpty = await page.locator('.ad-table, .ad-empty').count();
    expect(tableOrEmpty).toBeGreaterThan(0);
  });

});

// ════════════════════════════════════════════════════════════════
// 5. ADMIN REVIEWS MANAGEMENT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Admin Reviews Management Flow', () => {

  test('Admin can navigate to Reviews page', async ({ page }) => {
    await loginAdmin(page);
    await page.getByText('Reviews').click();
    await expect(page).toHaveURL(/AdminReviews/);
    await expect(page.locator('.ad-banner__title')).toContainText('Review Moderation', { timeout: 8000 });
  });

  test('Admin can filter reviews by 5 stars', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminReviews`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('5');
    await page.waitForTimeout(400);
    const tableOrEmpty = await page.locator('.ad-table, .ad-empty').count();
    expect(tableOrEmpty).toBeGreaterThan(0);
  });

  test('Admin can filter reviews by 4 stars', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminReviews`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('4');
    await page.waitForTimeout(400);
    const tableOrEmpty = await page.locator('.ad-table, .ad-empty').count();
    expect(tableOrEmpty).toBeGreaterThan(0);
  });

  test('Admin can filter reviews by 2 stars', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminReviews`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('2');
    await page.waitForTimeout(400);
    const tableOrEmpty = await page.locator('.ad-table, .ad-empty').count();
    expect(tableOrEmpty).toBeGreaterThan(0);
  });

  test('Admin can filter reviews by 1 star', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminReviews`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('1');
    await page.waitForTimeout(400);
    const tableOrEmpty = await page.locator('.ad-table, .ad-empty').count();
    expect(tableOrEmpty).toBeGreaterThan(0);
  });

  test('Admin can reset reviews filter to All ratings', async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/AdminReviews`);
    await expect(page.locator('.ad-table')).toBeVisible({ timeout: 8000 });

    await page.getByRole('combobox').selectOption('5');
    await page.waitForTimeout(300);
    await page.getByRole('combobox').selectOption('all');
    await page.waitForTimeout(300);

    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

});

// ════════════════════════════════════════════════════════════════
// 6. ADMIN PROFILE EDIT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Admin Profile Edit Flow', () => {

  test('Admin can update phone from Profile page', async ({ page }) => {
    await loginAdmin(page);

    // Navigate to profile via navbar
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByText('Profile').click();
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });

    // Click Edit
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('.up-input').first()).toBeVisible();

    // Update Phone
    await page.getByRole('textbox', { name: '0771234567' }).fill(ADMIN.updatedPhone);

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Success toast
    await expect(page.locator('.up-toast--success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.up-toast--success')).toContainText('saved');
  });

  test('Security tab visible in admin profile', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByText('Profile').click();
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Security' }).click();
    await expect(page.locator('.up-tab--active')).toContainText('Security');
    await expect(page.locator('.up-btn--outline:has-text("Logout")')).toBeVisible();
  });

});

// ════════════════════════════════════════════════════════════════
// 7. ADMIN LOGOUT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Admin Logout Flow', () => {

  test('Admin can logout from Security tab', async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByText('Profile').click();
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Security' }).click();

    // Click Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.locator('.up-modal')).toBeVisible();

    // Confirm logout
    await page.getByRole('button', { name: 'Yes, Logout' }).click();
    await page.waitForURL(/Login/, { timeout: 5000 });
    await expect(page).toHaveURL(/Login/);

    // localStorage cleared
    const userId = await page.evaluate(() => localStorage.getItem('CurrentUserId'));
    expect(userId).toBeNull();
  });

});