import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentSessionUser = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentSessionUser: () => mockGetCurrentSessionUser(),
  canEditPhenomena: (user: { role?: string } | null) =>
    Boolean(user && (user.role === "admin" || user.role === "editor")),
}));

import { authorizeCronOrOperator } from "@/lib/cron-auth";

describe("Cron & Pipeline Endpoint Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "super-secret-bps6504-cron-token";
  });

  it("authorizes requests bearing valid CRON_SECRET regardless of browser cookies", async () => {
    const req = new Request("http://localhost:3000/api/cron/ingest", {
      method: "POST",
      headers: {
        Authorization: "Bearer super-secret-bps6504-cron-token",
      },
    });
    const res = await authorizeCronOrOperator(req);
    expect(res.authorized).toBe(true);
    expect(mockGetCurrentSessionUser).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid Bearer token even if a session cookie exists", async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: "1",
      role: "admin",
    });

    const req = new Request("http://localhost:3000/api/cron/ingest", {
      method: "POST",
      headers: {
        Authorization: "Bearer wrong-token-value-1234",
      },
    });
    const res = await authorizeCronOrOperator(req);
    expect(res.authorized).toBe(false);
    expect(mockGetCurrentSessionUser).not.toHaveBeenCalled();
  });

  it("rejects anonymous requests without Bearer token or session cookie", async () => {
    mockGetCurrentSessionUser.mockResolvedValue(null);
    const req = new Request("http://localhost:3000/api/cron/ingest", {
      method: "POST",
    });
    const res = await authorizeCronOrOperator(req);
    expect(res.authorized).toBe(false);
    expect(res.reason).toContain("Unauthorized");
  });

  it("blocks Viewer role from triggering scraper or AI pipeline", async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: "viewer-1",
      email: "viewer@bps6504.go.id",
      name: "Pimpinan",
      role: "viewer",
    });
    const req = new Request("http://localhost:3000/api/cron/ingest", {
      method: "POST",
    });
    const res = await authorizeCronOrOperator(req);
    expect(res.authorized).toBe(false);
    expect(res.reason).toContain("Forbidden");
  });

  it("allows logged-in Admin or Editor operator to run quick crawl", async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: "ed-1",
      email: "analis@bps6504.go.id",
      name: "Analis Nerwilis",
      role: "editor",
    });
    const req = new Request("http://localhost:3000/api/cron/ingest", {
      method: "POST",
    });
    const res = await authorizeCronOrOperator(req);
    expect(res.authorized).toBe(true);
  });
});

