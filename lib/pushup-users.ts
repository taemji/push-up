export const PUSHUP_USERS = [
  { id: "minji", name: "민지" },
  { id: "jooyoung", name: "주영" },
  { id: "donghun", name: "동훈" },
] as const;

export type PushupUserId = (typeof PUSHUP_USERS)[number]["id"];

const pushupUserIds = new Set<string>(PUSHUP_USERS.map((user) => user.id));

export function isPushupUserId(value: unknown): value is PushupUserId {
  return typeof value === "string" && pushupUserIds.has(value);
}

export function getPushupUserName(userId: PushupUserId) {
  return PUSHUP_USERS.find((user) => user.id === userId)?.name ?? userId;
}