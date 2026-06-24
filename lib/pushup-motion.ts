export type MotionStage = "steady" | "descending" | "bottom" | "rising";
export type PushupMotionState = "top" | "down";

const DOWN_FACE_SCALE = 1.32;
const TOP_FACE_SCALE = 1.12;
const BASELINE_SMOOTHING = 0.05;

export interface PushupMotionProfile {
  baselineFaceArea: number | null;
  peakFaceScale: number;
}

export interface PushupMotionResult {
  state: PushupMotionState;
  stage: MotionStage;
  completedRep: boolean;
  faceScale: number;
  profile: PushupMotionProfile;
}

export function createPushupMotionProfile(): PushupMotionProfile {
  return {
    baselineFaceArea: null,
    peakFaceScale: 1,
  };
}

export function evaluatePushupMotion(
  currentState: PushupMotionState,
  faceArea: number,
  profile: PushupMotionProfile = createPushupMotionProfile()
): PushupMotionResult {
  if (faceArea <= 0) {
    return { state: currentState, stage: "steady", completedRep: false, faceScale: 1, profile };
  }

  const baselineFaceArea = profile.baselineFaceArea === null
    ? faceArea
    : currentState === "top"
      ? profile.baselineFaceArea * (1 - BASELINE_SMOOTHING) + faceArea * BASELINE_SMOOTHING
      : profile.baselineFaceArea;
  const faceScale = faceArea / baselineFaceArea;
  const peakFaceScale = currentState === "down" ? Math.max(profile.peakFaceScale, faceScale) : Math.max(1, faceScale);
  const nextProfile = { baselineFaceArea, peakFaceScale };

  if (currentState === "top") {
    if (faceScale >= DOWN_FACE_SCALE) {
      return { state: "down", stage: "bottom", completedRep: false, faceScale, profile: nextProfile };
    }

    return {
      state: "top",
      stage: faceScale > TOP_FACE_SCALE ? "descending" : "steady",
      completedRep: false,
      faceScale,
      profile: nextProfile,
    };
  }

  if (faceScale <= TOP_FACE_SCALE) {
    return {
      state: "top",
      stage: "steady",
      completedRep: peakFaceScale >= DOWN_FACE_SCALE,
      faceScale,
      profile: { baselineFaceArea, peakFaceScale: 1 },
    };
  }

  return { state: "down", stage: "rising", completedRep: false, faceScale, profile: nextProfile };
}