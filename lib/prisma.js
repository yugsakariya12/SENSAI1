import { PrismaClient } from "../lib/generated/prisma";


let prisma;

export function getDB() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}
