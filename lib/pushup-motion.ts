export type MotionStage = "steady" | "descending" | "bottom" | "rising";
export type PushupMotionState = "standing" | "down" | "bottom" | "rising";

const PUSHUP_START_TILT_DELTA = 9;
const MIN_PUSHUP_DEPTH_TILT_DELTA = 20;
const DEFAULT_PUSHUP_DEPTH_TILT_DELTA = 23;
const PERSONAL_DEPTH_RATIO = 0.82;
const PUSHUP_RISE_RATIO = 0.58;
const PUSHUP_TOP_TILT_DELTA = 7;

export interface PushupMotionProfile {
  targetDepthTiltDelta: number;
  deepestTiltDelta: number;
}

export interface PushupMotionResult {
  state: PushupMotionState;
  stage: MotionStage;
  completedRep: boolean;
  profile: PushupMotionProfile;
}

export function createPushupMotionProfile(): PushupMotionProfile {
  return {
    targetDepthTiltDelta: DEFAULT_PUSHUP_DEPTH_TILT_DELTA,
    deepestTiltDelta: 0,
  };
}

export function evaluatePushupMotion(
  currentState: PushupMotionState,
  tiltDelta: number,
  profile: PushupMotionProfile = createPushupMotionProfile()
): PushupMotionResult {
  const deepestTiltDelta = Math.max(profile.deepestTiltDelta, tiltDelta);
  const targetDepthTiltDelta = Math.max(
    MIN_PUSHUP_DEPTH_TILT_DELTA,
    Math.min(DEFAULT_PUSHUP_DEPTH_TILT_DELTA, deepestTiltDelta * PERSONAL_DEPTH_RATIO)
  );
  const riseTiltDelta = Math.max(PUSHUP_TOP_TILT_DELTA + 2, targetDepthTiltDelta * PUSHUP_RISE_RATIO);
  const nextProfile = { targetDepthTiltDelta, deepestTiltDelta };

  if (currentState === "standing") {
    if (tiltDelta >= PUSHUP_START_TILT_DELTA) {
      return { state: "down", stage: "descending", completedRep: false, profile: nextProfile };
    }

    return { state: "standing", stage: "steady", completedRep: false, profile: nextProfile };
  }

  if (currentState === "down") {
    if (tiltDelta >= targetDepthTiltDelta) {
      return { state: "bottom", stage: "bottom", completedRep: false, profile: nextProfile };
    }

    if (tiltDelta <= PUSHUP_TOP_TILT_DELTA) {
      return { state: "standing", stage: "steady", completedRep: false, profile: nextProfile };
    }

    return { state: "down", stage: "descending", completedRep: false, profile: nextProfile };
  }

  if (currentState === "bottom") {
    if (tiltDelta <= riseTiltDelta) {
      return { state: "rising", stage: "rising", completedRep: false, profile: nextProfile };
    }

    return { state: "bottom", stage: "bottom", completedRep: false, profile: nextProfile };
  }

  if (tiltDelta <= PUSHUP_TOP_TILT_DELTA) {
    return { state: "standing", stage: "steady", completedRep: true, profile: nextProfile };
  }

  if (tiltDelta >= targetDepthTiltDelta) {
    return { state: "bottom", stage: "bottom", completedRep: false, profile: nextProfile };
  }

  return { state: "rising", stage: "rising", completedRep: false, profile: nextProfile };
}