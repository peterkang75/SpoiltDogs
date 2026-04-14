import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { ProductCards } from "@/components/product-cards";

export default function Products() {
  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <ProductCards />
      </div>
      <SiteFooter />
    </main>
  );
}
