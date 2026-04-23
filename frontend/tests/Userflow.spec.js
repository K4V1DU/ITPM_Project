// tests/user-flow.spec.js
// ─── UniSewana — Full User Flow Tests ────────────────────────────
// Recorded test eka clean karala proper structure ekata convert kala
// Covers: Register → OTP → Login → Profile Edit → Change Password → Delete Account

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// ─── Test Credentials ─────────────────────────────────────────────
const STUDENT = {
  name:            'prasad',
  username:        'Prasad',
  email:           'it23829206@my.sliit.lk',
  phone:           '0705632558',
  password:        '12345678@z',
  newPassword:     '00000000@a',
  updatedName:     'chathura',
  updatedUsername: 'chathura',
  updatedPhone:    '0766514059',
};

// ════════════════════════════════════════════════════════════════
// 1. STUDENT REGISTRATION FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Student Registration Flow', () => {

  test('Student can register with SLIIT email and OTP', async ({ page }) => {
    // ── Step 1: Go to Login page and click "Create one" ──
    await page.goto(`${BASE_URL}/`);
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/Register/);

    // ── Step 2: Select Student role ──
    await page.getByRole('button', { name: '🎓 Student' }).click();
    await expect(page.locator('.reg-role-btn--active')).toContainText('Student');

    // ── Step 3: Fill registration form ──
    await page.getByRole('textbox', { name: 'Full Name' }).fill(STUDENT.name);
    await page.getByRole('textbox', { name: 'Username' }).fill(STUDENT.username);
    await page.getByRole('textbox', { name: 'Email Address SLIIT only' }).fill(STUDENT.email);
    await page.getByRole('textbox', { name: 'Phone Number (optional)' }).fill(STUDENT.phone);
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(STUDENT.password);
    await page.getByRole('textbox', { name: 'Confirm Password' }).fill(STUDENT.password);

    // ── Step 4: Submit form → OTP sent ──
    await page.getByRole('button', { name: 'Continue →' }).click();
    await expect(page.locator('.otp-boxes')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.reg-form-sub')).toContainText(STUDENT.email);

    // ── Step 5: Enter OTP (use your actual OTP here) ──
    // NOTE: Real OTP ethakota oya email eke enawa — meke mock OTP ekak use karala
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
// 2. LOGIN FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Student Login Flow', () => {

  test('Student can login with registered credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/Login`);

    await page.getByRole('textbox', { name: 'Email address' }).fill(STUDENT.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(STUDENT.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Student → /Boardings redirect
    await page.waitForURL(/Boardings/, { timeout: 8000 });
    await expect(page).toHaveURL(/Boardings/);
  });

});

// ════════════════════════════════════════════════════════════════
// 3. LOGOUT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Logout Flow', () => {

  test('Logout modal shows and Cancel keeps user logged in', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/Login`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(STUDENT.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(STUDENT.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/Boardings/, { timeout: 8000 });

    // Go to profile
    await page.goto(`${BASE_URL}/Profile`);
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });

    // Open Security tab
    await page.getByRole('button', { name: 'Security' }).click();

    // Click Logout
    await page.locator('.up-btn--outline:has-text("Logout")').click();
    await expect(page.locator('.up-modal')).toBeVisible();

    // Click Cancel — modal closes, still on profile
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.up-modal')).not.toBeVisible();
    await expect(page.locator('.up-tabs')).toBeVisible();
  });

  test('Confirm logout navigates to Login page', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/Login`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(STUDENT.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(STUDENT.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/Boardings/, { timeout: 8000 });

    // Go to profile → Security tab → Logout
    await page.goto(`${BASE_URL}/Profile`);
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Security' }).click();
    await page.locator('.up-btn--outline:has-text("Logout")').click();
    await expect(page.locator('.up-modal')).toBeVisible();

    // Confirm
    await page.locator('.up-modal__btn--danger:has-text("Yes, Logout")').click();
    await page.waitForURL(/Login/, { timeout: 5000 });
    await expect(page).toHaveURL(/Login/);

    // localStorage cleared
    const userId = await page.evaluate(() => localStorage.getItem('CurrentUserId'));
    expect(userId).toBeNull();
  });

});

// ════════════════════════════════════════════════════════════════
// 4. PROFILE EDIT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Profile Edit Flow', () => {

  // Login helper
  async function loginStudent(page) {
    await page.goto(`${BASE_URL}/Login`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(STUDENT.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(STUDENT.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/Boardings/, { timeout: 8000 });
  }

  test('Student can update name, username, and phone', async ({ page }) => {
    await loginStudent(page);
    await page.goto(`${BASE_URL}/Profile`);
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });

    // Make sure Profile tab is active
    await page.getByRole('button', { name: 'Profile' }).click();

    // Click Edit
    await page.locator('.up-btn--outline:has-text("Edit")').click();
    await expect(page.locator('.up-input').first()).toBeVisible();

    // Update fields
    const inputs = page.locator('.up-input');
    await inputs.nth(0).fill(STUDENT.updatedName);      // Name
    await inputs.nth(1).fill(STUDENT.updatedUsername);  // Username
    await inputs.nth(2).fill(STUDENT.updatedPhone);     // Phone

    // Save
    await page.locator('.up-btn--primary:has-text("Save")').click();

    // Success toast visible
    await expect(page.locator('.up-toast--success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.up-toast--success')).toContainText('saved');
  });

});

// ════════════════════════════════════════════════════════════════
// 5. CHANGE PASSWORD FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Change Password Flow', () => {

  async function loginStudent(page) {
    await page.goto(`${BASE_URL}/Login`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(STUDENT.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(STUDENT.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/Boardings/, { timeout: 8000 });
  }

  test('Student can change password from Security tab', async ({ page }) => {
    await loginStudent(page);
    await page.goto(`${BASE_URL}/Profile`);
    await expect(page.locator('.up-tabs')).toBeVisible({ timeout: 8000 });

    // Go to Security tab
    await page.getByRole('button', { name: 'Security' }).click();

    // Fill change password fields
    const pwInputs = page.locator('.up-input[type="password"]');
    await pwInputs.nth(0).fill(STUDENT.password);         // current password
    await pwInputs.nth(1).fill(STUDENT.newPassword);      // new password
    await pwInputs.nth(2).fill(STUDENT.newPassword);      // confirm new password

    // Submit
    await page.locator('.up-btn--primary:has-text("Update Password")').click();

    // Success toast
    await expect(page.locator('.up-toast--success')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.up-toast--success')).toContainText('Password changed');
  });

});

// ════════════════════════════════════════════════════════════════
// 6. DELETE ACCOUNT FLOW
// ════════════════════════════════════════════════════════════════
test.describe('Delete Account Flow', () => {

  async function loginStudent(page) {
    await page.goto(`${BASE_URL}/Login`);
    await page.getByRole('textbox', { name: 'Email address' }).fill(STUDENT.email);
    // Use new password if changed in previous test
    await page.getByRole('textbox', { name: 'Password' }).fill(STUDENT.newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/Boardings/, { timeout: 8000 });
  }

  test('Delete modal appears and Cancel keeps account safe', async ({ page }) => {
    await loginStudent(page);
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
    await loginStudent(page);
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

});