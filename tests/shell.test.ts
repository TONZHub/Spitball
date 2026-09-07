import { describe, expect, it } from "vitest";

describe("Spitball project shell", () => {
  it("has a working test runner", () => {
    expect("spitball").toContain("pit");
  });
});
