// tests/host-flow.spec.js
// ─── UniSewana — Full Host Flow Tests ────────────────────────────
// Recorded test eka clean karala proper structure ekata convert kala
// Covers: Register → OTP → Login → Profile Edit → Change Password → Logout → Delete Account

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// ─── Test Credentials ─────────────────────────────────────────────
const HOST = {
  name:            'tharindu',
  username:        'tharindu16',
  email:           '2001tharinduprabath@gmail.com',
  phone:           '0715632558',
  password:        '081609tHa#',
  newPassword:     '08160725tHa#',
  updatedPhone:    '0766514059',
  updatedAddress:  'malabe',
  updatedLanguage: 'sinhala',
  updatedAbout:    'well known',
};

// ════════════════════════════════════════════════════════════════
// 1. HOST REGISTRATION FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Host Registration Flow', () => {

  test('Host can register with personal email and OTP', async ({ page }) => {
    // ── Step 1: Go to Login page and click "Create one" ──
    await page.goto(`${BASE_URL}/`);
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/Register/);

    // ── Step 2: Select Host role ──
    await page.getByRole('button', { name: '🏠 Host' }).click();
    await expect(page.locator('.reg-role-btn--active')).toContainText('Host');

    // ── Step 3: Fill registration form ──
    await page.getByRole('textbox', { name: 'Full Name' }).fill(HOST.name);
    await page.getByRole('textbox', { name: 'Username' }).fill(HOST.username);
    await page.getByRole('textbox', { name: 'Email Address' }).fill(HOST.email);
    await page.getByRole('textbox', { name: 'Phone Number (optional)' }).fill(HOST.phone);
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(HOST.password);
    await page.getByRole('textbox', { name: 'Confirm Password' }).fill(HOST.password);

    // ── Step 4: Submit form → OTP sent ──
    await page.getByRole('button', { name: 'Continue →' }).click();
    await expect(page.locator('.otp-boxes')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.reg-form-sub')).toContainText(HOST.email);

    // ── Step 5: Enter OTP ──
    // NOTE: Real OTP eka oya email eke enawa — actual digits danna
    const boxes = page.locator('.otp-box');
    await boxes.nth(0).fill('');
    await boxes.nth(1).fill('');
    await boxes.nth(2).fill('');
    await boxes.nth(3).fill('');
    await boxes.nth(4).fill('');
    await boxes.nth(5).fill('');

    // ── Step 6: Verify & Create Account ──
    await page.getByRole('button', { name: 'Verify & Create Account' }).click();

    // ── Step 7: Success screen and redirect to Login ──
    await expect(page.locator('.reg-success')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.reg-success')).toContainText('Account Created');
    await page.waitForURL(/Login/, { timeout: 5000 });
  });

});

// ════════════════════════════════════════════════════════════════
// 2. HOST LOGIN FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Host Login Flow', () => {

  test('Host can login with registered credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/Login`);

    await page.getByRole('textbox', { name: 'Email address' }).fill(HOST.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(HOST.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Host → /Listings redirect
    await page.waitForURL(/Listings/, { timeout: 8000 });
    await expect(page).toHaveURL(/Listings/);
  });

});

// ════════════════════════════════════════════════════════════════
// 3. HOST PROFILE EDIT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Host Profile Edit Flow', () => {

  async function loginHost(page) {
    await page.goto(`${BASE_URL}/Login`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(HOST.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(HOST.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/Listings/, { timeout: 8000 });
  }

  test('Host can update phone, address, language and about', async ({ page }) => {
    await loginHost(page);

    // Navigate to profile via navbar
    await page.goto(`${BASE_URL}/Profile`);
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });

    // Make sure Profile tab is active
    await page.getByRole('button', { name: 'Profile' }).click();

    // Click Edit
    await page.locator('.up-btn--outline:has-text("Edit")').click();
    await expect(page.locator('.up-input').first()).toBeVisible();

    // Update Phone
    await page.getByRole('textbox', { name: '+94 7X XXX XXXX' }).fill(HOST.updatedPhone);

    // Update Address
    await page.getByRole('textbox', { name: 'Your address' }).fill(HOST.updatedAddress);

    // Update About
    await page.getByRole('textbox', { name: 'Tell others a bit about' }).fill(HOST.updatedAbout);

    // Add Language
    await page.getByRole('textbox', { name: 'Type a language & press Enter' }).fill(HOST.updatedLanguage);
    await page.getByRole('button', { name: 'Add' }).click();

    // Save
    await page.locator('.up-btn--primary:has-text("Save")').click();

    // Success toast visible
    await expect(page.locator('.up-toast--success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.up-toast--success')).toContainText('saved');
  });

});

// ════════════════════════════════════════════════════════════════
// 4. HOST CHANGE PASSWORD FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Host Change Password Flow', () => {

  async function loginHost(page) {
    await page.goto(`${BASE_URL}/Login`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(HOST.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(HOST.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/Listings/, { timeout: 8000 });
  }

  test('Host can change password from Security tab', async ({ page }) => {
    await loginHost(page);
    await page.goto(`${BASE_URL}/Profile`);
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });

    // Go to Security tab
    await page.getByRole('button', { name: 'Security' }).click();

    // Fill change password fields
    const pwInputs = page.locator('.up-input[type="password"]');
    await pwInputs.nth(0).fill(HOST.password);       // current password
    await pwInputs.nth(1).fill(HOST.newPassword);    // new password
    await pwInputs.nth(2).fill(HOST.newPassword);    // confirm new password

    // Submit
    await page.locator('.up-btn--primary:has-text("Update Password")').click();

    // Success toast
    await expect(page.locator('.up-toast--success')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.up-toast--success')).toContainText('Password changed');
  });

});

// ════════════════════════════════════════════════════════════════
// 5. HOST LOGOUT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Host Logout Flow', () => {

  async function loginHost(page) {
    await page.goto(`${BASE_URL}/Login`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(HOST.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(HOST.newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/Listings/, { timeout: 8000 });
  }

  test('Host can logout and is redirected to Login page', async ({ page }) => {
    await loginHost(page);
    await page.goto(`${BASE_URL}/Profile`);
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });

    // Go to Security tab
    await page.getByRole('button', { name: 'Security' }).click();

    // Click Logout
    await page.locator('.up-btn--outline:has-text("Logout")').click();
    await expect(page.locator('.up-modal')).toBeVisible();

    // Confirm logout
    await page.locator('.up-modal__btn--danger:has-text("Yes, Logout")').click();
    await page.waitForURL(/Login/, { timeout: 5000 });
    await expect(page).toHaveURL(/Login/);

    // localStorage cleared
    const userId = await page.evaluate(() => localStorage.getItem('CurrentUserId'));
    expect(userId).toBeNull();
  });

  test('Host can login again with new password after logout', async ({ page }) => {
    await page.goto(`${BASE_URL}/Login`);

    await page.getByRole('textbox', { name: 'Email address' }).fill(HOST.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(HOST.newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Host → /Listings redirect with new password
    await page.waitForURL(/Listings/, { timeout: 8000 });
    await expect(page).toHaveURL(/Listings/);
  });

});

// ════════════════════════════════════════════════════════════════
// 6. HOST DELETE ACCOUNT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Host Delete Account Flow', () => {

  async function loginHost(page) {
    await page.goto(`${BASE_URL}/Login`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(HOST.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(HOST.newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/Listings/, { timeout: 8000 });
  }

  test('Delete modal appears and Cancel keeps account safe', async ({ page }) => {
    await loginHost(page);
    await page.goto(`${BASE_URL}/Profile`);
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Security' }).click();

    // Click Delete
    await page.locator('.up-btn--danger:has-text("Delete")').click();
    await expect(page.locator('.up-modal')).toBeVisible();
    await expect(page.locator('.up-modal__title')).toContainText('Delete Account');
    await expect(page.locator('.up-modal__desc')).toContainText('permanently');

    // Cancel — account stays
    await page.locator('.up-modal__btn--ghost:has-text("Cancel")').click();
    await expect(page.locator('.up-modal')).not.toBeVisible();
    await expect(page.locator('.up-tabs')).toBeVisible();
  });

  test('Confirming delete removes account and redirects to Login', async ({ page }) => {
    await loginHost(page);
    await page.goto(`${BASE_URL}/Profile`);
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Security' }).click();

    // Delete
    await page.locator('.up-btn--danger:has-text("Delete")').click();
    await expect(page.locator('.up-modal')).toBeVisible();
    await page.locator('.up-modal__btn--danger:has-text("Delete My Account")').click();

    // Redirected to Login
    await page.waitForURL(/Login/, { timeout: 8000 });
    await expect(page).toHaveURL(/Login/);

    // localStorage cleared
    const userId = await page.evaluate(() => localStorage.getItem('CurrentUserId'));
    expect(userId).toBeNull();
  });

  test('Deleted host account cannot login again', async ({ page }) => {
    await page.goto(`${BASE_URL}/Login`);

    await page.getByRole('textbox', { name: 'Email address' }).fill(HOST.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(HOST.newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should show error — account deleted
    await expect(page.locator('.login-error')).toBeVisible({ timeout: 8000 });
  });

});