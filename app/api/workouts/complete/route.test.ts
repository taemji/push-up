import { beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = vi.hoisted(() => ({
  hget: vi.fn(),
  hset: vi.fn(),
  hgetall: vi.fn(),
}));

const RedisMock = vi.hoisted(() => vi.fn(function Redis() {
  return redisMock;
}));

vi.mock("@upstash/redis", () => ({
  Redis: RedisMock,
}));

function createPostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/workouts/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postCompletion(body: Record<string, unknown>) {
  const { POST } = await import("./route");

  return POST(createPostRequest(body));
}

describe("POST /api/workouts/complete", () => {
  beforeEach(() => {
    vi.resetModules();
    RedisMock.mockReset();
    RedisMock.mockImplementation(function Redis() {
      return redisMock;
    });
    redisMock.hget.mockReset();
    redisMock.hset.mockReset();
    redisMock.hgetall.mockReset();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("accepts the legacy payload without set metadata and drops goal", async () => {
    redisMock.hget.mockResolvedValue(null);
    redisMock.hgetall.mockResolvedValue({
      "2026-06-26": { count: 25, elapsedSeconds: 60, completedAt: "2026-06-26T00:00:00.000Z" },
    });

    const response = await postCompletion({
      userId: "jooyoung",
      workoutDate: "2026-06-26",
      goal: 100,
      count: 25,
      elapsedSeconds: 60,
    });

    expect(response.status).toBe(200);
    expect(redisMock.hset).toHaveBeenCalledWith("pushup:workout-completions:jooyoung", {
      "2026-06-26": expect.not.objectContaining({
        setCount: expect.any(Number),
        repsPerSet: expect.any(Number),
        restSeconds: expect.any(Number),
      }),
    });
    expect(redisMock.hset.mock.calls[0]?.[1]["2026-06-26"]).not.toHaveProperty("goal");
  });

  it("stores set metadata when the new payload includes a complete plan", async () => {
    redisMock.hget.mockResolvedValue(null);
    redisMock.hgetall.mockResolvedValue({
      "2026-06-26": {
        setCount: 3,
        repsPerSet: 10,
        restSeconds: 60,
        count: 30,
        elapsedSeconds: 240,
        completedAt: "2026-06-26T00:00:00.000Z",
      },
    });

    const response = await postCompletion({
      userId: "jooyoung",
      workoutDate: "2026-06-26",
      setCount: 3,
      repsPerSet: 10,
      restSeconds: 60,
      count: 30,
      elapsedSeconds: 240,
    });

    expect(response.status).toBe(200);
    expect(redisMock.hset).toHaveBeenCalledWith("pushup:workout-completions:jooyoung", {
      "2026-06-26": expect.objectContaining({
        setCount: 3,
        repsPerSet: 10,
        restSeconds: 60,
        count: 30,
        elapsedSeconds: 240,
      }),
    });
    expect(redisMock.hset.mock.calls[0]?.[1]["2026-06-26"]).not.toHaveProperty("goal");
  });

  it("preserves existing set metadata when a legacy payload updates the same date", async () => {
    redisMock.hget.mockResolvedValue({
      goal: 30,
      setCount: 3,
      repsPerSet: 10,
      restSeconds: 60,
      count: 20,
      elapsedSeconds: 180,
      completedAt: "2026-06-26T00:00:00.000Z",
    });
    redisMock.hgetall.mockResolvedValue({
      "2026-06-26": { count: 25 },
    });

    const response = await postCompletion({
      userId: "jooyoung",
      workoutDate: "2026-06-26",
      count: 25,
      elapsedSeconds: 210,
    });

    expect(response.status).toBe(200);
    expect(redisMock.hset).toHaveBeenCalledWith("pushup:workout-completions:jooyoung", {
      "2026-06-26": expect.objectContaining({
        setCount: 3,
        repsPerSet: 10,
        restSeconds: 60,
        count: 25,
        elapsedSeconds: 210,
      }),
    });
    expect(redisMock.hset.mock.calls[0]?.[1]["2026-06-26"]).not.toHaveProperty("goal");
  });

  it("rejects partial set metadata", async () => {
    const response = await postCompletion({
      userId: "jooyoung",
      workoutDate: "2026-06-26",
      setCount: 3,
      count: 30,
      elapsedSeconds: 240,
    });

    expect(response.status).toBe(400);
    expect(redisMock.hset).not.toHaveBeenCalled();
  });
});