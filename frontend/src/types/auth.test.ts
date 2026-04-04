import { describe, expect, it } from "vitest";
import { AuthError } from "./auth";

describe("AuthError", () => {
  it("stores the provided type and message", () => {
    const error = new AuthError("RATE_LIMIT", "Too many attempts");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AuthError");
    expect(error.type).toBe("RATE_LIMIT");
    expect(error.message).toBe("Too many attempts");
  });
});
