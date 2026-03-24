import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const companies = [
  { name: "Stripe", platform: "greenhouse", slug: "stripe", careersUrl: "https://boards.greenhouse.io/stripe" },
  { name: "Figma", platform: "greenhouse", slug: "figma", careersUrl: "https://boards.greenhouse.io/figma" },
  { name: "Notion", platform: "greenhouse", slug: "notion", careersUrl: "https://boards.greenhouse.io/notion" },
  { name: "Personio", platform: "greenhouse", slug: "personio", careersUrl: "https://boards.greenhouse.io/personio" },
  { name: "N26", platform: "greenhouse", slug: "n26", careersUrl: "https://boards.greenhouse.io/n26" },
  { name: "SumUp", platform: "greenhouse", slug: "sumup", careersUrl: "https://boards.greenhouse.io/sumup" },
  {
    name: "Delivery Hero",
    platform: "greenhouse",
    slug: "deliveryhero",
    careersUrl: "https://boards.greenhouse.io/deliveryhero",
  },
  { name: "Klarna", platform: "greenhouse", slug: "klarna", careersUrl: "https://boards.greenhouse.io/klarna" },
  { name: "Revolut", platform: "lever", slug: "revolut", careersUrl: "https://jobs.lever.co/revolut" },
  { name: "Wise", platform: "lever", slug: "wise", careersUrl: "https://jobs.lever.co/wise" },
];

async function main() {
  for (const c of companies) {
    const existing = await prisma.company.findFirst({
      where: { slug: c.slug, platform: c.platform },
    });
    if (!existing) {
      await prisma.company.create({ data: c });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
