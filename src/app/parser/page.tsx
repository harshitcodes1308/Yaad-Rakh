import { prisma } from "@/lib/db";
import ParserConsoleClient from "./ParserConsoleClient";

export const dynamic = "force-dynamic";

export default async function ParserPage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customers: true,
      _count: {
        select: { customers: true },
      },
    },
  });

  return <ParserConsoleClient initialBusinesses={businesses} />;
}
