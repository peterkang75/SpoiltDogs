import { db } from "./db";
import { categories, products } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const PEXELS = (id: number, w = 600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

async function seed() {
  console.log("Seeding categories and products...");

  const catData = [
    { slug: "dog-toys", name: "Dog Toys", description: "Interactive toys and chews to keep your dog entertained" },
    { slug: "beds", name: "Beds & Comfort", description: "Premium beds and comfort products for restful sleep" },
    { slug: "grooming", name: "Grooming", description: "Natural grooming products made for Australian coats" },
  ];

  const catIds: Record<string, string> = {};
  for (const cat of catData) {
    const existing = await db.select().from(categories).where(eq(categories.slug, cat.slug));
    if (existing.length > 0) {
      catIds[cat.slug] = existing[0].id;
      console.log(`  Category already exists: ${cat.name}`);
    } else {
      const id = randomUUID();
      await db.insert(categories).values({ id, ...cat });
      catIds[cat.slug] = id;
      console.log(`  Created category: ${cat.name}`);
    }
  }

  const toysId = catIds["dog-toys"];
  const bedsId = catIds["beds"];
  const groomingId = catIds["grooming"];

  const newProducts = [
    {
      slug: "rope-tug-fetch-combo",
      name: "Rope Tug & Fetch Combo Set",
      description: "Heavy-duty braided cotton rope set with tug toy, ball, and fetch stick. Safe for all breeds, machine washable. A must-have for active dogs.",
      priceAud: 2495,
      compareAtPriceAud: 3495,
      imageUrl: PEXELS(1629781),
      badge: "Best Value",
      inStock: true,
      featured: true,
      categoryId: toysId,
    },
    {
      slug: "squeaky-plush-wombat",
      name: "Squeaky Plush Wombat Toy",
      description: "Super-soft Australian wombat plush with double-layered squeaker. Designed to withstand enthusiastic chewers. Fills playtime with noise and joy.",
      priceAud: 1995,
      compareAtPriceAud: null,
      imageUrl: PEXELS(7210262),
      badge: null,
      inStock: true,
      featured: false,
      categoryId: toysId,
    },
    {
      slug: "tough-rubber-chew-ring",
      name: "Indestructible Rubber Chew Ring",
      description: "Natural rubber chew ring with peanut butter filling cavity. Vet-recommended for dental health and anxiety. Suitable for power chewers.",
      priceAud: 3490,
      compareAtPriceAud: null,
      imageUrl: PEXELS(3361739),
      badge: "Vet Pick",
      inStock: true,
      featured: true,
      categoryId: toysId,
    },
    {
      slug: "waterproof-adventure-mat",
      name: "Waterproof Outdoor Adventure Mat",
      description: "Foldable, waterproof travel mat for beach days, camping and hiking trips. Lightweight with carry handle. Wipes clean in seconds.",
      priceAud: 7995,
      compareAtPriceAud: 9995,
      imageUrl: PEXELS(6568501),
      badge: "New",
      inStock: true,
      featured: false,
      categoryId: bedsId,
    },
    {
      slug: "elevated-cooling-cot",
      name: "Elevated Cooling Mesh Cot",
      description: "Raised mesh sleeping cot for ultimate airflow. Aluminium frame with anti-slip feet. Perfect for warmer Australian climates. Easy assembly, no tools needed.",
      priceAud: 12995,
      compareAtPriceAud: 15900,
      imageUrl: PEXELS(6816860),
      badge: null,
      inStock: true,
      featured: true,
      categoryId: bedsId,
    },
    {
      slug: "calming-cloud-donut-bed",
      name: "Calming Cloud Donut Bed",
      description: "Ultra-plush round donut bed with raised rim for anxiety relief. Machine washable microfiber fill. Available in caramel, sage and charcoal.",
      priceAud: 8990,
      compareAtPriceAud: null,
      imageUrl: PEXELS(4587998),
      badge: "Top Rated",
      inStock: true,
      featured: true,
      categoryId: bedsId,
    },
    {
      slug: "professional-deshedding-brush",
      name: "Professional Deshedding Brush",
      description: "Stainless steel deshedding tool with ergonomic non-slip handle. Removes up to 95% of loose undercoat. Safe for all coat types and lengths.",
      priceAud: 4500,
      compareAtPriceAud: 5900,
      imageUrl: PEXELS(7210754),
      badge: "Best Seller",
      inStock: true,
      featured: true,
      categoryId: groomingId,
    },
    {
      slug: "paw-nose-balm-kit",
      name: "Paw & Nose Balm Kit",
      description: "100% natural beeswax and shea butter balm for cracked paws and dry noses. Lick-safe formula with Australian manuka honey. Two-piece kit.",
      priceAud: 3200,
      compareAtPriceAud: null,
      imageUrl: PEXELS(7210267),
      badge: null,
      inStock: true,
      featured: false,
      categoryId: groomingId,
    },
    {
      slug: "whitening-oat-shampoo",
      name: "Brightening Oat & Coconut Shampoo",
      description: "Gentle brightening shampoo with colloidal oat and organic coconut oil. pH-balanced formula leaves coats shiny and soft. Suitable for puppies.",
      priceAud: 2490,
      compareAtPriceAud: null,
      imageUrl: PEXELS(6568941),
      badge: "Eco",
      inStock: true,
      featured: false,
      categoryId: groomingId,
    },
  ];

  for (const p of newProducts) {
    const existing = await db.select().from(products).where(eq(products.slug, p.slug));
    if (existing.length > 0) {
      console.log(`  Product already exists: ${p.name}`);
      continue;
    }
    const id = randomUUID();
    await db.insert(products).values({ id, ...p });
    console.log(`  Created product: ${p.name}`);
  }

  const updates: { slug: string; categoryId: string }[] = [
    { slug: "merino-wool-dog-bed", categoryId: bedsId },
    { slug: "bush-herb-shampoo", categoryId: groomingId },
    { slug: "kangaroo-jerky-treats", categoryId: toysId },
    { slug: "dental-chew-sticks", categoryId: toysId },
    { slug: "salmon-oil-supplement", categoryId: groomingId },
  ];

  for (const u of updates) {
    await db.update(products).set({ categoryId: u.categoryId }).where(eq(products.slug, u.slug));
    console.log(`  Updated categoryId for: ${u.slug}`);
  }

  console.log("\nSeed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
