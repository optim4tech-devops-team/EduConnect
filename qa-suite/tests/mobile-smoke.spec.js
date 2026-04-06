import { test, expect } from '@playwright/test';

test('login screen renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Giriş Yap')).toBeVisible();
});

test('admin routes render', async ({ page }) => {
  await page.goto('/(admin)');
  await expect(page.getByText('Yönetici Paneli')).toBeVisible();

  await page.goto('/(admin)/classes');
  await expect(page.getByText('Sınıf Yönetimi')).toBeVisible();

  await page.goto('/(admin)/teachers');
  await expect(page.getByText('Öğretmenler')).toBeVisible();

  await page.goto('/(admin)/profile');
  await expect(page.getByText('Profil')).toBeVisible();
});

test('teacher routes render', async ({ page }) => {
  await page.goto('/(teacher)');
  await expect(page.getByText('Fotoğraf Paylaş')).toBeVisible();

  await page.goto('/(teacher)/attendance');
  await expect(page.getByText('Yoklama')).toBeVisible();

  await page.goto('/(teacher)/students');
  await expect(page.getByText('Sınıfım')).toBeVisible();

  await page.goto('/(teacher)/profile');
  await expect(page.getByText('Profil')).toBeVisible();
});

test('parent routes render', async ({ page }) => {
  await page.goto('/(parent)');
  await expect(page.getByText('Bekleyen Ödevler')).toBeVisible();

  await page.goto('/(parent)/gallery');
  await expect(page.getByText('Fotoğraf Galerisi')).toBeVisible();

  await page.goto('/(parent)/assignments');
  await expect(page.getByText('Ödevler')).toBeVisible();

  await page.goto('/(parent)/profile');
  await expect(page.getByText('Profil')).toBeVisible();
});
