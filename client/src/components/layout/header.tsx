import { Link } from "wouter";
import { ShoppingBag, Search, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function AccountButton() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <Button size="icon" variant="ghost" disabled data-testid="button-account-loading">
        <User className="h-4 w-4 opacity-40" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button size="icon" variant="ghost" data-testid="button-account-login">
          <User className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Account";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative rounded-full"
          data-testid="button-account-menu"
        >
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold" data-testid="avatar-header-initials">
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate" data-testid="text-header-name">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/my-account" data-testid="link-my-account">My Account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my-orders" data-testid="link-my-orders-header">My Orders</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive" data-testid="button-header-sign-out">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" data-testid="header">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" className="lg:hidden" data-testid="button-mobile-menu">
            <Menu />
          </Button>
          <Link href="/" data-testid="link-home">
            <span className="font-serif text-xl font-bold tracking-tight">
              SpoiltDogs
            </span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-6" data-testid="nav-main">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-foreground/80" data-testid="link-nav-home">
            Home
          </Link>
          <Link href="/products" className="text-sm font-medium transition-colors hover:text-foreground/80" data-testid="link-nav-shop">
            Shop
          </Link>
          <Link href="/categories" className="text-sm font-medium transition-colors hover:text-foreground/80" data-testid="link-nav-categories">
            Categories
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" data-testid="button-search">
            <Search />
          </Button>
          <AccountButton />
          <Link href="/cart">
            <Button size="icon" variant="ghost" data-testid="button-cart">
              <ShoppingBag />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
