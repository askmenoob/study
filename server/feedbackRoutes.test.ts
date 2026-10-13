import Fastify from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { accessError } from "./familyAccess.js";
import { registerFeedbackRoutes } from "./feedbackRoutes.js";
import {
  FeedbackRateLimitError,
  FeedbackRequestConflictError,
  type CreatedFeedback,
  type FeedbackInput,
  type FeedbackRecord,
  type FeedbackRepository,
} from "./feedbackStore.js";

const requestId = "11111111-1111-4111-8111-111111111111";
const feedbackId = "22222222-2222-4222-8222-222222222222";

class MemoryRepository implements FeedbackRepository {
  feedback?: FeedbackRecord;
  rateLimited = false;

  async createOrGet(parentId: string, input: FeedbackInput): Promise<CreatedFeedback> {
    if (this.rateLimited) throw new FeedbackRateLimitError();
    if (this.feedback) {
      const same = this.feedback.clientRequestId === input.clientRequestId &&
        this.feedback.category === input.category && this.feedback.message === input.message &&
        this.feedback.pagePath === input.pagePath && this.feedback.allowReply === input.allowReply;
      if (!same) throw new FeedbackRequestConflictError();
      return { feedback: this.feedback, created: false };
    }
    this.feedback = {
      id: feedbackId,
      parentId,
      parentEmail: "parent@example.test",
      parentDisplayName: "Parent",
      ...input,
      createdAt: "2026-09-12T00:00:00.000Z",
    };
    return { feedback: this.feedback, created: true };
  }

  async list() { return this.feedback ? [this.feedback] : []; }
}

function buildApi(repository: MemoryRepository) {
  const app = Fastify({ logger: false });
  const role = (request: any) => String(request.headers["x-test-role"] ?? "anonymous");
  const parentAuth = async (request: any) => {
    if (role(request) !== "parent") throw accessError("PARENT_ACCESS_REQUIRED");
    request.user = { sub: "parent-id", role: "parent" };
  };
  const superAdminAuth = async (request: any) => {
    if (role(request) !== "super_admin") throw accessError("SUPER_ADMIN_ACCESS_REQUIRED");
    request.user = { sub: "admin-id", role: "super_admin" };
  };
  registerFeedbackRoutes(app, repository, parentAuth, superAdminAuth);
  return app;
}

const payload = {
  clientRequestId: requestId,
  category: "suggestion",
  message: "Sila tambah laporan mingguan yang lebih ringkas.",
  pagePath: "/settings",
  allowReply: true,
} satisfies FeedbackInput;

describe("feedback routes", () => {
  let repository: MemoryRepository;
  beforeEach(() => { repository = new MemoryRepository(); });

  it("persists and returns the stable public receipt for a parent", async () => {
    const app = buildApi(repository);
    const response = await app.inject({ method: "POST", url: "/api/feedback", headers: { "x-test-role": "parent" }, payload });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ feedback: {
      id: feedbackId,
      referenceId: `FB-${feedbackId}`,
    } });
    expect(repository.feedback).toMatchObject({ message: payload.message });
    await app.close();
  });

  it("is idempotent and rejects reuse of a request id with different content", async () => {
    const app = buildApi(repository);
    const first = await app.inject({ method: "POST", url: "/api/feedback", headers: { "x-test-role": "parent" }, payload });
    const replay = await app.inject({ method: "POST", url: "/api/feedback", headers: { "x-test-role": "parent" }, payload });
    const conflict = await app.inject({ method: "POST", url: "/api/feedback", headers: { "x-test-role": "parent" }, payload: { ...payload, message: "Mesej berbeza dengan request id yang sama." } });
    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual(first.json());
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: "FEEDBACK_REQUEST_CONFLICT" });
    await app.close();
  });

  it("enforces parent/admin separation and strict input validation", async () => {
    const app = buildApi(repository);
    expect((await app.inject({ method: "POST", url: "/api/feedback", headers: { "x-test-role": "super_admin" }, payload })).statusCode).toBe(403);
    expect((await app.inject({ method: "POST", url: "/api/feedback", headers: { "x-test-role": "parent" }, payload: { ...payload, pagePath: "https://evil.example/", extra: true } })).statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: "/api/admin/feedback", headers: { "x-test-role": "parent" } })).statusCode).toBe(403);

    repository.feedback = {
      id: feedbackId, parentId: "parent-id", parentEmail: "parent@example.test", parentDisplayName: "Parent",
      ...payload, createdAt: "2026-09-12T00:00:00.000Z",
    };
    const inbox = await app.inject({ method: "GET", url: "/api/admin/feedback", headers: { "x-test-role": "super_admin" } });
    expect(inbox.statusCode).toBe(200);
    expect(inbox.json()).toEqual({ feedback: [{
      id: feedbackId,
      referenceId: `FB-${feedbackId}`,
      category: "suggestion",
      message: payload.message,
      pagePath: "/settings",
      allowReply: true,
      parentEmail: "parent@example.test",
      parentDisplayName: "Parent",
      createdAt: "2026-09-12T00:00:00.000Z",
    }] });
    await app.close();
  });

  it("returns a persisted-account rate limit with retry guidance", async () => {
    repository.rateLimited = true;
    const app = buildApi(repository);
    const response = await app.inject({ method: "POST", url: "/api/feedback", headers: { "x-test-role": "parent" }, payload });
    expect(response.statusCode).toBe(429);
    expect(response.headers["retry-after"]).toBe("3600");
    expect(response.json()).toEqual({ error: "FEEDBACK_RATE_LIMIT" });
    await app.close();
  });
});
