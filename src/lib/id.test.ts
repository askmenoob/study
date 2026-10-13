import { describe, expect, it } from "vitest";
import { makeUuid } from "./id";

describe("client UUID", () => {
  it("creates a UUID v4 shaped id", () => {
    const id = makeUuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
