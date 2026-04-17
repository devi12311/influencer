import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";

export interface CreateUserInput {
  email: string;
  password: string;
  username: string;
}

export async function createUser(input: CreateUserInput) {
  try {
    const user = await db.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash: await hashPassword(input.password),
      },
    });

    return user;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null;
    }

    throw error;
  }
}

export async function verifyUserCredentials(username: string, password: string) {
  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    return null;
  }

  const isValidPassword = await verifyPassword(user.passwordHash, password);

  if (!isValidPassword) {
    return null;
  }

  return user;
}

export async function updateUserPassword(userId: string, password: string) {
  return db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
    },
  });
}
