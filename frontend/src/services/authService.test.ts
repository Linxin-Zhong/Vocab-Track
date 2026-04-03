import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { login, register, logout, getAccessToken } from "./authService";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Mock server
const server = setupServer(
  // login
  http.post("*/user/login/", async ({ request }) => {
    const { email } = (await request.json()) as any;

    if (email === "fail@test.com") {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json({
      token: "fake-token-123",
      user: { email: "test@test.com" },
    });
  }),

  // register
  http.post("*/user/", async ({ request }) => {
    const { email } = (await request.json()) as any;

    if (email === "fail@test.com") {
      return new HttpResponse(null, { status: 409 });
    }

    return HttpResponse.json({
      token: "fake-token-123",
      user: { email: "test@test.com" },
    });
  }),

  // logout
  http.post("*/user/logout/", () =>
    HttpResponse.json({
      message: "ok",
    }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("authService", () => {
  it("should successfully login and store the token", async () => {
    const result = await login("test@test.com", "password123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe("test@test.com");
    }
    expect(getAccessToken()).toBe("fake-token-123");
  });

  it("should return AUTH error on 401", async () => {
    const result = await login("fail@test.com", "wrong");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorType).toBe("AUTH");
    }
  });

  it("should return VALIDATION error on 400", async () => {
    server.use(
      http.post("*/user/login/", () => new HttpResponse(null, { status: 400 })),
    );

    const result = await login("bad@test.com", "wrong");

    expect(result).toEqual({ success: false, errorType: "VALIDATION" });
  });

  it("should return RATE_LIMIT error on 429", async () => {
    server.use(
      http.post("*/user/login/", () => new HttpResponse(null, { status: 429 })),
    );

    const result = await login("slow@test.com", "wrong");

    expect(result).toEqual({ success: false, errorType: "RATE_LIMIT" });
  });

  it("should return UNKNOWN error on unexpected login status", async () => {
    server.use(
      http.post("*/user/login/", () => new HttpResponse(null, { status: 500 })),
    );

    const result = await login("error@test.com", "wrong");

    expect(result).toEqual({ success: false, errorType: "UNKNOWN" });
  });

  it("should return NETWORK error when login request rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await login("offline@test.com", "wrong");

    expect(result).toEqual({ success: false, errorType: "NETWORK" });
  });

  it("should successfully register and store the token", async () => {
    const result = await register("test@test.com", "password123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe("test@test.com");
    }
    expect(getAccessToken()).toBe("fake-token-123");
  });

  it("should return CONFLICT error on 409", async () => {
    const result = await register("fail@test.com", "wrong");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorType).toBe("CONFLICT");
    }
  });

  it("should return VALIDATION error on register 400", async () => {
    server.use(
      http.post("*/user/", () => new HttpResponse(null, { status: 400 })),
    );

    const result = await register("bad@test.com", "wrong");

    expect(result).toEqual({ success: false, errorType: "VALIDATION" });
  });

  it("should return RATE_LIMIT error on register 429", async () => {
    server.use(
      http.post("*/user/", () => new HttpResponse(null, { status: 429 })),
    );

    const result = await register("slow@test.com", "wrong");

    expect(result).toEqual({ success: false, errorType: "RATE_LIMIT" });
  });

  it("should return UNKNOWN error on unexpected register status", async () => {
    server.use(
      http.post("*/user/", () => new HttpResponse(null, { status: 500 })),
    );

    const result = await register("error@test.com", "wrong");

    expect(result).toEqual({ success: false, errorType: "UNKNOWN" });
  });

  it("should return NETWORK error when register request rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await register("offline@test.com", "wrong");

    expect(result).toEqual({ success: false, errorType: "NETWORK" });
  });

  it("should successfully logout and clear the token", async () => {
    await login("test@test.com", "password123");

    const result = await logout();

    expect(result.success).toBe(true);
    expect(getAccessToken()).toBeNull();
  });

  it("should return AUTH error on logout 401", async () => {
    server.use(
      http.post("*/user/logout/", () => new HttpResponse(null, { status: 401 })),
    );

    const result = await logout();

    expect(result).toEqual({ success: false, errorType: "AUTH" });
  });

  it("should return UNKNOWN error on unexpected logout status", async () => {
    server.use(
      http.post("*/user/logout/", () => new HttpResponse(null, { status: 500 })),
    );

    const result = await logout();

    expect(result).toEqual({ success: false, errorType: "UNKNOWN" });
  });

  it("should return NETWORK error when logout request rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await logout();

    expect(result).toEqual({ success: false, errorType: "NETWORK" });
  });
});
