import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import { isPushupUserId } from "@/lib/pushup-users";
import { calculateCurrentStreak, isIsoDate, parseWorkoutCompletionRecord, sumWorkoutReps } from "@/lib/workout-summary";

interface WorkoutCompletionRecord {
  goal: number;
  count: number;
  elapsedSeconds: number;
  completedAt: string;
}

function getRedisClient() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash Redis environment variables are not configured.");
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    userId?: unknown;
    workoutDate?: unknown;
    goal?: unknown;
    count?: unknown;
    elapsedSeconds?: unknown;
  } | null;

  const userId = body?.userId;
  const workoutDate = body?.workoutDate;
  const goal = body?.goal;
  const count = body?.count;
  const elapsedSeconds = body?.elapsedSeconds;

  if (
    !isPushupUserId(userId) ||
    !isIsoDate(workoutDate) ||
    !isPositiveInteger(goal) ||
    !isNonNegativeInteger(count) ||
    !isNonNegativeInteger(elapsedSeconds)
  ) {
    return NextResponse.json({ error: "Invalid workout completion request." }, { status: 400 });
  }

  try {
    const redis = getRedisClient();
    const completionKey = getWorkoutCompletionKey(userId);
    const existingRecord = parseWorkoutCompletionRecord(await redis.hget(completionKey, workoutDate));
    const nextRecord: WorkoutCompletionRecord = {
      goal,
      count: Math.max(existingRecord?.count ?? 0, count),
      elapsedSeconds: Math.max(existingRecord?.elapsedSeconds ?? 0, elapsedSeconds),
      completedAt: new Date().toISOString(),
    };

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
    console.error("Failed to save workout completion:", error);

    return NextResponse.json({ error: "Workout database is not configured yet." }, { status: 503 });
  }
}