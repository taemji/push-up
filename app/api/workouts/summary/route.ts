import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import { isPushupUserId } from "@/lib/pushup-users";
import { calculateCurrentStreak, isIsoDate } from "@/lib/workout-summary";

interface WorkoutCompletionRecord {
  count: number;
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

function parseWorkoutCompletionRecord(value: unknown): Partial<WorkoutCompletionRecord> | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return JSON.parse(value) as Partial<WorkoutCompletionRecord>;
  }

  if (typeof value === "object") {
    return value as Partial<WorkoutCompletionRecord>;
  }

  return null;
}

function sumWorkoutReps(records: Record<string, unknown>) {
  return Object.values(records).reduce<number>((sum, recordValue) => {
    const record = parseWorkoutCompletionRecord(recordValue);

    return sum + (record?.count ?? 0);
  }, 0);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const today = searchParams.get("today");

  if (!isPushupUserId(userId) || !isIsoDate(today)) {
    return NextResponse.json({ error: "Invalid workout summary request." }, { status: 400 });
  }

  try {
    const redis = getRedisClient();
    const records = await redis.hgetall<Record<string, unknown>>(getWorkoutCompletionKey(userId)) ?? {};
    const completionDates = Object.keys(records).sort();
    const totalReps = sumWorkoutReps(records);

    return NextResponse.json({
      completionDates,
      currentStreak: calculateCurrentStreak(completionDates, today),
      todayCompleted: completionDates.includes(today),
      totalDays: completionDates.length,
      totalReps,
    });
  } catch (error) {
    console.error("Failed to load workout summary:", error);

    return NextResponse.json({ error: "Workout database is not configured yet." }, { status: 503 });
  }
}