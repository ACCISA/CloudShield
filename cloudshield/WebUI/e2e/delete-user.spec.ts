import { test, expect } from "@playwright/test";

test("E2E: delete user flow (API seed + pre-auth -> delete -> UI updates)", async ({ page, request }) => {
  const baseApi = "http://127.0.0.1:5050/api";

  // 1) Login as admin (API)
  const loginResp = await request.post(`${baseApi}/auth/login`, {
    data: { email: "testing@aniss.com", password: "Letmein1234%" },
  });
  expect(loginResp.ok()).toBeTruthy();
  const { access_token: adminToken } = await loginResp.json();

  // 2) Current user object (admin)
  const currentUser = {
    id: "admin",
    _id: "admin",
    role: "admin",
    org_id: "org_001",
    email: "testing@aniss.com",
    full_name: "Testing Admin",
  };

  // 3) Create a new employee user via API
  const email = `employee.demo+${Date.now()}@acme.com`;
  const fullName = `Demo Employee E2E ${Date.now()}`;

  const createResp = await request.post(`${baseApi}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      email,
      password: "Password123()*",
      role: "employee",
      full_name: fullName,
      org_id: "org_001",
      reason: "api e2e create",
    },
  });
  expect(createResp.ok()).toBeTruthy();

  // 4) Pre-authenticate in the browser context by setting localStorage + cookies
  await page.addInitScript(
    ({ token, user }) => {
      // standard tokens
      localStorage.setItem("jwt", token);
      localStorage.setItem("access_token", token);
      localStorage.setItem("accessToken", token);
      localStorage.setItem("token", token);
      localStorage.setItem("token_type", "Bearer");

      //  user/org flags
      localStorage.setItem("org_id", user.org_id || "org_001");
      localStorage.setItem("isProvisioned", "true");

      // user object
      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("user", JSON.stringify(user));
    },
    { token: adminToken, user: currentUser }
  );

  // 5) Intercept all API requests to add Authorization header
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const headers = {
      ...req.headers(),
      authorization: `Bearer ${adminToken}`,
    };
    await route.continue({ headers });
  });

  // Navigate to employees page
  await page.goto("/employees");
  await expect(page).not.toHaveURL(/\/login/i);

  // 6) Wait for the new user to appear in the list
  await expect(page.getByText(email)).toBeVisible({ timeout: 15000 });

  // 7) Click delete button for that user
  const row = page.locator(`tr:has-text("${email}")`);
  await row.locator('button[aria-label^="Delete user"]').click();

  // 8) Confirm deletion in dialog
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Delete User")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  // 9) Verify user is removed from list and success message shown
  await expect(page.getByText(email)).toHaveCount(0);
  await expect(page.getByText(/was deleted successfully/i)).toBeVisible();

});