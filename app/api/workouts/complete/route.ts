import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import { isPushupUserId } from "@/lib/pushup-users";
import { calculateCurrentStreak, isIsoDate, parseWorkoutCompletionRecord, sumWorkoutReps } from "@/lib/workout-summary";

interface WorkoutCompletionRecord {
  setCount?: number;
  repsPerSet?: number;
  restSeconds?: number;
  count: number;
  elapsedSeconds: number;
  completedAt: string;
}

class MissingRedisConfigError extends Error {
  constructor() {
    super("Upstash Redis environment variables are not configured.");
    this.name = "MissingRedisConfigError";
  }
}

function getRedisClient() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new MissingRedisConfigError();
  }

  return new Redis({ url, token });
}

function getWorkoutCompletionKey(userId: string) {
  return `pushup:workout-completions:${userId}`;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function hasWorkoutPlanFields(setCount: unknown, repsPerSet: unknown, restSeconds: unknown) {
  return setCount !== undefined || repsPerSet !== undefined || restSeconds !== undefined;
}

function isValidWorkoutPlan(setCount: unknown, repsPerSet: unknown, restSeconds: unknown) {
  return isPositiveInteger(setCount) && isPositiveInteger(repsPerSet) && isNonNegativeInteger(restSeconds);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    userId?: unknown;
    workoutDate?: unknown;
    setCount?: unknown;
    repsPerSet?: unknown;
    restSeconds?: unknown;
    count?: unknown;
    elapsedSeconds?: unknown;
  } | null;

  const userId = body?.userId;
  const workoutDate = body?.workoutDate;
  const setCount = body?.setCount;
  const repsPerSet = body?.repsPerSet;
  const restSeconds = body?.restSeconds;
  const count = body?.count;
  const elapsedSeconds = body?.elapsedSeconds;
  const hasWorkoutPlan = hasWorkoutPlanFields(setCount, repsPerSet, restSeconds);

  if (
    !isPushupUserId(userId) ||
    !isIsoDate(workoutDate) ||
    (hasWorkoutPlan && !isValidWorkoutPlan(setCount, repsPerSet, restSeconds)) ||
    !isNonNegativeInteger(count) ||
    !isNonNegativeInteger(elapsedSeconds)
  ) {
    return NextResponse.json({ error: "Invalid workout completion request." }, { status: 400 });
  }

  const workoutPlan = hasWorkoutPlan
    ? {
        setCount: setCount as number,
        repsPerSet: repsPerSet as number,
        restSeconds: restSeconds as number,
      }
    : null;

  try {
    const redis = getRedisClient();
    const completionKey = getWorkoutCompletionKey(userId);
    const existingRecord = parseWorkoutCompletionRecord(await redis.hget(completionKey, workoutDate));
    const nextRecord: WorkoutCompletionRecord = {
      count: Math.max(existingRecord?.count ?? 0, count),
      elapsedSeconds: Math.max(existingRecord?.elapsedSeconds ?? 0, elapsedSeconds),
      completedAt: new Date().toISOString(),
    };

    if (workoutPlan) {
      nextRecord.setCount = workoutPlan.setCount;
      nextRecord.repsPerSet = workoutPlan.repsPerSet;
      nextRecord.restSeconds = workoutPlan.restSeconds;
    } else {
      if (isPositiveInteger(existingRecord?.setCount)) {
        nextRecord.setCount = existingRecord.setCount;
      }

      if (isPositiveInteger(existingRecord?.repsPerSet)) {
        nextRecord.repsPerSet = existingRecord.repsPerSet;
      }

      if (isNonNegativeInteger(existingRecord?.restSeconds)) {
        nextRecord.restSeconds = existingRecord.restSeconds;
      }
    }

    await redis.hset(completionKey, { [workoutDate]: nextRecord });

    const records = await redis.hgetall<Record<string, unknown>>(completionKey) ?? {};
    const completionDates = Object.keys(records).sort();
    const totalReps = sumWorkoutReps(records);

    return NextResponse.json({
      completionDates,
      currentStreak: calculateCurrentStreak(completionDates, workoutDate),
      todayCompleted: true,
      totalDays: completionDates.length,
      totalReps,
    });
  } catch (error) {
    if (!(error instanceof MissingRedisConfigError)) {
      console.error("Failed to save workout completion:", error);
    }

    return NextResponse.json({ error: "Workout database is not configured yet." }, { status: 503 });
  }
}