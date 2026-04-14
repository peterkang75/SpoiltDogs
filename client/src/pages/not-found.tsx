import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Dog } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center bg-cream py-24">
        <div className="text-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sage-light mx-auto">
            <Dog className="h-10 w-10 text-sage" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-dark" data-testid="text-404-title">
            Page not found
          </h1>
          <p className="text-muted-foreground max-w-sm mx-auto" data-testid="text-404-subtitle">
            Looks like this page has gone walkies! Let's get you back on track.
          </p>
          <Link href="/">
            <Button className="bg-sage text-cream rounded-full px-8 mt-2" data-testid="button-back-home">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
