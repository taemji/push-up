import { describe, expect, it } from "vitest";

import { createPushupMotionProfile, evaluatePushupMotion, type PushupMotionProfile, type PushupMotionState } from "@/lib/pushup-motion";

function runFaceAreaSequence(faceAreas: number[]) {
  let state: PushupMotionState = "top";
  let profile: PushupMotionProfile = createPushupMotionProfile();
  let reps = 0;
  const scales: number[] = [];

  for (const faceArea of faceAreas) {
    const result = evaluatePushupMotion(state, faceArea, profile);
    state = result.state;
    profile = result.profile;
    scales.push(result.faceScale);

    if (result.completedRep) {
      reps += 1;
    }
  }

  return { profile, reps, scales, state };
}

describe("evaluatePushupMotion", () => {
  it("does not count small face distance changes", () => {
    const result = runFaceAreaSequence([100, 103, 108, 110, 104, 100]);

    expect(result.reps).toBe(0);
    expect(result.state).toBe("top");
  });

  it("counts after the face gets closer and returns to baseline", () => {
    const result = runFaceAreaSequence([100, 106, 120, 138, 145, 128, 110, 101]);

    expect(result.reps).toBe(1);
    expect(result.state).toBe("top");
  });

  it("counts repeated close and far cycles", () => {
    const result = runFaceAreaSequence([100, 135, 145, 108, 101, 136, 150, 107, 100]);

    expect(result.reps).toBe(2);
    expect(result.profile.peakFaceScale).toBe(1);
  });
});