import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminUserDirectoryView, AdminUserTable } from "./AdminUserDirectory";

describe("super-admin user directory", () => {
  it("renders full registered emails and safe account metadata", () => {
    const html = renderToStaticMarkup(createElement(AdminUserTable, { users: [
      { email: "parent@example.test", role: "parent", createdAt: "2026-09-12T08:00:00Z" },
      { email: '<script>@example.test', role: "super_admin", createdAt: "2026-09-11T08:00:00Z" },
      { email: "teacher@example.test", role: "teacher", createdAt: "2026-09-10T08:00:00Z" },
    ] }));

    expect(html).toContain("parent@example.test");
    expect(html).toContain("Ibu bapa");
    expect(html).toContain("Super Admin");
    expect(html).toContain("Guru");
    expect(html).toContain("&lt;script&gt;@example.test");
    expect(html).not.toContain("<script>");
    expect(html.toLowerCase()).not.toContain("password");
  });

  it("shows an honest empty state", () => {
    const html = renderToStaticMarkup(createElement(AdminUserTable, { users: [] }));
    expect(html).toContain("Belum ada pengguna berdaftar");
  });

  it("keeps loaded users visible during load-more and recoverable errors", () => {
    const user = { email: "kept@example.test", role: "parent" as const, createdAt: "2026-09-12T08:00:00Z" };
    const loading = renderToStaticMarkup(createElement(AdminUserDirectoryView, {
      users: [user], total: 30, nextCursor: "opaque", busy: true, error: "", canRetry: true,
      onRefresh() {}, onRetry() {}, onLoadMore() {},
    }));
    expect(loading).toContain("kept@example.test");
    expect(loading).toContain("Memuatkan pengguna seterusnya");
    expect(loading).toContain("disabled");

    const failed = renderToStaticMarkup(createElement(AdminUserDirectoryView, {
      users: [user], total: 30, nextCursor: "opaque", busy: false, error: "Sambungan gagal", canRetry: true,
      onRefresh() {}, onRetry() {}, onLoadMore() {},
    }));
    expect(failed).toContain("kept@example.test");
    expect(failed).toContain("Sambungan gagal");
    expect(failed).toContain("Cuba lagi");
  });

  it("does not offer a futile retry when authorization has failed", () => {
    const html = renderToStaticMarkup(createElement(AdminUserDirectoryView, {
      users: [], total: null, nextCursor: null, busy: false,
      error: "Sesi super admin telah tamat", canRetry: false,
      onRefresh() {}, onRetry() {}, onLoadMore() {},
    }));
    expect(html).toContain("Sesi super admin telah tamat");
    expect(html).not.toContain("Cuba lagi");
    expect(html).not.toContain("0 akaun");
  });
});
