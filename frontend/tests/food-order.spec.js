import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/Login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('it23838802@my.sliit.lk');
  await page.getByRole('textbox', { name: 'Password' }).fill('wwww@2222');
  await page.getByRole('button', { name: 'Show password' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('link', { name: 'Foods' }).click();
  await page.getByRole('img', { name: "Chef's Kitchen" }).click();
  await page.getByRole('main').getByRole('button', { name: '+' }).click();
  await page.getByRole('complementary').getByRole('button', { name: '+' }).click();
  await page.getByRole('button', { name: 'Pickup' }).click();
  await page.getByRole('button', { name: 'Place pickup order LKR' }).click();
  await page.getByRole('button', { name: 'Place Order · LKR' }).click();
  await page.getByRole('button', { name: 'View My Orders' }).click();
  await page.getByRole('button', { name: 'Cancel Order' }).click();
  await page.getByRole('button', { name: 'Yes, Cancel' }).click();
  await page.getByRole('button', { name: 'Notifications' }).click();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await page.getByRole('button', { name: 'Notifications' }).click();
  await page.getByRole('button', { name: 'Profile' }).click();
  await page.getByText('Logout').click();
  await page.getByRole('button', { name: 'Yes, Logout' }).click();
});