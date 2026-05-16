import { expect, test } from '@playwright/test';

const landingUrl = trimTrailingSlash(process.env.QA_LANDING_URL || 'https://notioedu.com');
const adminUrl = trimTrailingSlash(process.env.QA_WEB_ADMIN_URL || 'https://platform.notioedu.com');
const apiBaseUrl = trimTrailingSlash(process.env.QA_API_BASE_URL || 'https://apigw.notioedu.com/api');
const platformAdminEmail = process.env.QA_PLATFORM_ADMIN_EMAIL || '';
const platformAdminPassword = process.env.QA_PLATFORM_ADMIN_PASSWORD || '';

test.describe.configure({ mode: 'serial' });

test.describe('Faz 1 web ekran QA', () => {
  let adminToken = '';
  const schoolsToCleanup = [];
  const demoRequestsToClose = [];

  test.beforeAll(async ({ request }) => {
    expect(platformAdminEmail, 'QA_PLATFORM_ADMIN_EMAIL zorunludur.').not.toBe('');
    expect(platformAdminPassword, 'QA_PLATFORM_ADMIN_PASSWORD zorunludur.').not.toBe('');

    adminToken = await loginViaApi(request, platformAdminEmail, platformAdminPassword);
  });

  test.afterAll(async ({ request }) => {
    for (const demoRequestId of demoRequestsToClose) {
      await request.patch(`${apiBaseUrl}/demo-requests/${demoRequestId}/status`, {
        headers: authHeaders(adminToken),
        data: { status: 'closed', notes: 'Faz 1 QA testi sonrasi kapatildi.' },
      });
    }

    for (const schoolId of schoolsToCleanup.reverse()) {
      await request.delete(`${apiBaseUrl}/platform/schools/${schoolId}`, {
        headers: authHeaders(adminToken),
      });
    }
  });

  test('landing demo talebi kaydedilir ve platform admin ekraninda gorunur', async ({ page, request }) => {
    const unique = uniqueSuffix();
    const schoolName = `QA Demo Anaokulu ${unique}`;
    const phone = makePhone(unique, 1000);
    const email = `qa-demo-${unique}@notio.test`;

    await page.setExtraHTTPHeaders({
      'X-Forwarded-For': makeForwardedFor(unique),
    });

    await page.addInitScript((baseUrl) => {
      window.localStorage.removeItem('notio-demo-request-last-submit');
      window.NOTIO_API_BASE = baseUrl;
    }, apiBaseUrl);

    await page.goto(landingUrl);
    await page.getByRole('link', { name: /Demo Talep Et|Ücretsiz Demo Planla/i }).first().click();

    const form = page.locator('#demo-request-form');
    await expect(form).toBeVisible();
    await form.getByLabel('Okul Adı').fill(schoolName);
    await form.getByLabel('Adınız').fill('QA Demo Kullanici');
    await form.getByLabel('Telefon').fill(phone);
    await form.getByLabel('E-posta').fill(email);
    await form.getByLabel('Öğrenci Sayısı').selectOption('25-75');
    await form.getByLabel('Öncelikli İhtiyaç').selectOption('school');
    await form.getByLabel('Kısa Not').fill('Faz 1 ekran QA demo talebi.');

    const [createResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/demo-requests') &&
        response.request().method() === 'POST',
      ),
      form.getByRole('button', { name: 'Demo Talep Et' }).click(),
    ]);

    expect([201, 202], `Beklenen demo create status 201/202, gelen: ${createResponse.status()}`).toContain(
      createResponse.status(),
    );
    const createdDemo = await createResponse.json();
    if (createdDemo.id) {
      demoRequestsToClose.push(createdDemo.id);
    }

    await expect(page.getByText('Demo talebiniz alındı')).toBeVisible();

    const listResponse = await request.get(`${apiBaseUrl}/demo-requests?page=1&pageSize=100`, {
      headers: authHeaders(adminToken),
    });
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();
    expect(listBody.items.some((item) => item.schoolName === schoolName && item.phone === phone)).toBeTruthy();

    await loginToAdminPanel(page, platformAdminEmail, platformAdminPassword);
    await page.getByRole('link', { name: 'Demo Talepleri' }).click();
    await expect(page.locator('h1', { hasText: 'Demo Talepleri' })).toBeVisible();
    await expect(page.getByText(schoolName)).toBeVisible();
  });

  test('landing demo talebi tekrar gonderiminde kontrollu uyari verir', async ({ page }) => {
    const unique = uniqueSuffix();
    const schoolName = `QA Rate Limit Anaokulu ${unique}`;
    const phone = makePhone(unique, 2000);
    let requestCount = 0;

    await page.setExtraHTTPHeaders({
      'X-Forwarded-For': makeForwardedFor(unique),
    });

    await page.addInitScript((baseUrl) => {
      window.localStorage.removeItem('notio-demo-request-last-submit');
      window.NOTIO_API_BASE = baseUrl;
    }, apiBaseUrl);

    await page.route('**/api/demo-requests', async (route) => {
      requestCount += 1;
      if (requestCount === 1) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: crypto.randomUUID(),
            status: 'new',
            createdAt: new Date().toISOString(),
          }),
        });
        return;
      }

      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Bu telefon numarasi icin demo talebi alindi. Lutfen biraz sonra tekrar deneyin.',
        }),
      });
    });

    await page.goto(`${landingUrl}#demo`);
    const form = page.locator('#demo-request-form');

    async function fillAndSubmit(note) {
      await form.getByLabel('Okul Adı').fill(schoolName);
      await form.getByLabel('Adınız').fill('QA Tekrar Kullanici');
      await form.getByLabel('Telefon').fill(phone);
      await form.getByLabel('Kısa Not').fill(note);
      await form.getByRole('button', { name: 'Demo Talep Et' }).click();
    }

    await fillAndSubmit('Ilk gonderim');
    await expect(page.getByText('Demo talebiniz alındı')).toBeVisible();

    await page.evaluate(() => window.localStorage.removeItem('notio-demo-request-last-submit'));
    await fillAndSubmit('Ikinci gonderim');
    await expect(page.getByText(/Bu telefon numarasi icin demo talebi alindi|çok fazla deneme/i)).toBeVisible();
  });

  test('platform admin okul yoneticisi olusturur ve okul yoneticisi ekranlari acilir', async ({ page, request }) => {
    const unique = uniqueSuffix();
    const schoolName = `QA Faz 1 Okulu ${unique}`;
    const adminEmail = `qa-school-admin-${unique}@notio.test`;
    const adminPhone = makePhone(unique, 3000);

    const createResponse = await request.post(`${apiBaseUrl}/platform/schools`, {
      headers: authHeaders(adminToken),
      data: {
        name: schoolName,
        address: 'Faz 1 QA smoke adresi',
        phone: makePhone(unique, 4000),
        plan: 'demo',
        isActive: true,
        maxStudents: 60,
        maxTeachers: 12,
        primaryAdmin: {
          fullName: 'QA Okul Yoneticisi',
          phone: adminPhone,
          email: adminEmail,
        },
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createdSchool = await createResponse.json();
    schoolsToCleanup.push(createdSchool.id);
    expect(createdSchool.primaryAdminTemporaryPassword).toBeTruthy();
    expect(createdSchool.primaryAdminMustChangePassword).toBeTruthy();

    await loginToAdminPanel(page, adminEmail, createdSchool.primaryAdminTemporaryPassword);
    await expect(page.getByText(schoolName)).toBeVisible();

    await expect(page.getByRole('link', { name: 'Sınıflar' })).toBeVisible();
    await page.getByRole('link', { name: 'Sınıflar' }).click();
    await expect(page.getByRole('heading', { name: 'Sınıf Yönetimi' })).toBeVisible();

    await page.getByRole('link', { name: 'Öğretmenler' }).click();
    await expect(page.getByRole('heading', { name: 'Öğretmen Yönetimi' })).toBeVisible();

    await page.getByRole('link', { name: 'Öğrenciler' }).click();
    await expect(page.getByRole('heading', { name: 'Öğrenci Yönetimi' })).toBeVisible();

    await page.getByRole('link', { name: 'Veliler' }).click();
    await expect(page.getByRole('heading', { name: 'Veli Yönetimi' })).toBeVisible();

    await page.getByRole('link', { name: 'Raporlar' }).click();
    await expect(page.getByRole('heading', { name: 'Okul Raporlari' })).toBeVisible();
  });
});

async function loginViaApi(request, email, password) {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.accessToken;
}

async function loginToAdminPanel(page, email, password) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto(`${adminUrl}/login`);
  await page.locator('input[autocomplete="username"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Panele Gir' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, '');
}

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function makePhone(unique, offset) {
  const numeric = (Number(unique.slice(-7)) + offset).toString().padStart(7, '0').slice(-7);
  return `0555${numeric}`;
}

function makeForwardedFor(unique) {
  const seed = Number(unique.slice(-6));
  return `10.${(seed % 200) + 1}.${(Math.floor(seed / 10) % 200) + 1}.${(Math.floor(seed / 100) % 200) + 1}`;
}
