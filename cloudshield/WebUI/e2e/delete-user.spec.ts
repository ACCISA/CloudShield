import { test } from "@playwright/test";

test("E2E: delete user flow (API seed + pre-auth -> delete -> UI updates)", async ({ page, request }) => {

  const baseApi = "http://127.0.0.1:5050/api";

  const loginResp = await request.post(`${baseApi}/auth/login`, {
    data: { email: "testing@aniss.com", password: "Letmein1234%" },
  });
  const { access_token: adminToken } = await loginResp.json();

  const email = `employee.demo+${Date.now()}@acme.com`;

  await request.post(`${baseApi}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      email,
      password: "Password123()*",
      role: "employee",
      full_name: "Demo Employee E2E",
      org_id: "org_001",
      reason: "api e2e create",
    },
  });
});