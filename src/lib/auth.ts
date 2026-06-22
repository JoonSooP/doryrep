import { cookies } from "next/headers";
import { prisma } from "./db";

export async function getSession() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, loginId: true, name: true, email: true, role: true, userType: true, categories: true, mustChangePassword: true },
  });
  return user;
}

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:',.<>?/`~]{8,}$/;

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "비밀번호는 8자 이상이어야 합니다";
  if (!/[a-zA-Z]/.test(pw)) return "대/소문자를 포함해야 합니다";
  if (!/\d/.test(pw)) return "숫자를 포함해야 합니다";
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/`~]/.test(pw)) return "특수문자를 포함해야 합니다";
  return null;
}
