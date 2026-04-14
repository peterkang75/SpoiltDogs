import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Users,
  Megaphone,
  Palette,
  LogOut,
  Menu,
  X,
  PawPrint,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

const menuItems = [
  { label: "상품 관리", icon: Package, href: "/admin/products" },
  { label: "CRM", icon: Users, href: "/admin/crm" },
  { label: "마케팅", icon: Megaphone, href: "/admin/marketing" },
  { label: "브랜드 스튜디오", icon: Palette, href: "/admin/brand-studio" },
  // ── Add new admin menu items here as features are built ──
];

const SIDEBAR_COLLAPSED_KEY = "admin_sidebar_collapsed";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const { toast } = useToast();

  const { data: meData } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/me"],
    queryFn: async () => {
      const res = await fetch("/api/admin/me", { credentials: "include" });
      if (!res.ok) return { isAdmin: false };
      return res.json();
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
  const isAdmin = meData?.isAdmin ?? true;

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  const logoutMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/logout"),
    onSuccess: () => navigate("/admin/login"),
    onError: () => {
      toast({ title: "로그아웃 실패", variant: "destructive" });
    },
  });

  if (location === "/admin/crm") return <>{children}</>;

  const sidebarWidth = collapsed ? "w-[52px]" : "w-[220px]";
  const mainMargin = collapsed ? "md:ml-[52px]" : "md:ml-[220px]";

  const SidebarContent = ({ forMobile = false }: { forMobile?: boolean }) => (
    <div className="flex flex-col h-full relative">
      {/* Brand area */}
      <div
        className={`border-b border-white/10 transition-all duration-200 ${
          collapsed && !forMobile ? "px-3 py-4 flex justify-center" : "px-5 py-5"
        }`}
      >
        {collapsed && !forMobile ? (
          <PawPrint className="h-5 w-5 text-[#FFD54F]" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-[#FFD54F]" />
              <span
                className="font-bold text-white text-base"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                SpoiltDogs
              </span>
            </div>
            <p className="text-xs text-white/40 mt-0.5 pl-7">어드민</p>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav className={`flex-1 py-4 space-y-1 ${collapsed && !forMobile ? "px-1.5" : "px-3"}`}>
        {menuItems.map(({ label, icon: Icon, href }) => {
          const isActive = location === href || location.startsWith(href + "/");
          if (collapsed && !forMobile) {
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex items-center justify-center h-9 w-full rounded-lg transition-colors ${
                  isActive
                    ? "bg-white/15 text-white border-l-[3px] border-[#FFD54F]"
                    : "text-white/70 hover:text-white hover:bg-white/10 border-l-[3px] border-transparent"
                }`}
                data-testid={`nav-${href.replace("/admin/", "")}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "text-white bg-white/15 border-l-[3px] border-[#FFD54F] pl-[9px]"
                  : "text-white/70 hover:text-white hover:bg-white/10 border-l-[3px] border-transparent pl-[9px]"
              }`}
              data-testid={`nav-${href.replace("/admin/", "")}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Login status */}
      <div className={`pt-3 pb-2 border-t border-white/10 ${collapsed && !forMobile ? "px-1.5" : "px-3"}`}>
        {collapsed && !forMobile ? (
          <div
            title={isAdmin ? "로그인됨" : "로그아웃됨 — 다시 로그인 필요"}
            className="flex items-center justify-center h-8 w-full"
            data-testid="sidebar-auth-status"
          >
            {isAdmin ? (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-red-400" />
            )}
          </div>
        ) : isAdmin ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-emerald-300/90"
            data-testid="sidebar-auth-status"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">관리자 로그인됨</span>
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
          </div>
        ) : (
          <Link
            href="/admin/login"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors"
            data-testid="sidebar-auth-status"
          >
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">세션 만료 — 로그인</span>
          </Link>
        )}
      </div>

      {/* Logout */}
      <div className={`pb-4 ${collapsed && !forMobile ? "px-1.5" : "px-3"}`}>
        {collapsed && !forMobile ? (
          <button
            onClick={() => logoutMut.mutate()}
            disabled={logoutMut.isPending}
            title="로그아웃"
            className="flex items-center justify-center h-9 w-full rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors border-l-[3px] border-transparent"
            data-testid="button-sidebar-logout"
          >
            <LogOut className="h-4 w-4 shrink-0" />
          </button>
        ) : (
          <button
            onClick={() => logoutMut.mutate()}
            disabled={logoutMut.isPending}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 w-full transition-colors"
            data-testid="button-sidebar-logout"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            로그아웃
          </button>
        )}
      </div>

      {/* Build version */}
      <div className={`pb-3 ${collapsed && !forMobile ? "px-1.5" : "px-3"}`}>
        {!(collapsed && !forMobile) && (
          <div
            className="text-[10px] text-white/30 font-mono leading-tight px-3"
            title={`Built ${__BUILD_DATE__}`}
            data-testid="sidebar-build-version"
          >
            build {__BUILD_VERSION__}
          </div>
        )}
      </div>

      {/* Collapse toggle button (desktop only) */}
      {!forMobile && (
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-[72px] h-6 w-6 rounded-full border border-white/20 bg-[#1a3a2e] flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors z-10"
          data-testid="button-sidebar-collapse"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-full z-40 transition-all duration-200 ${sidebarWidth}`}
        style={{ backgroundColor: "#1a3a2e" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg text-white"
        style={{ backgroundColor: "#1a3a2e" }}
        onClick={() => setMobileOpen(true)}
        data-testid="button-mobile-sidebar-open"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed left-0 top-0 h-full w-[220px] z-50 flex flex-col md:hidden"
            style={{ backgroundColor: "#1a3a2e" }}
          >
            <button
              className="absolute top-3 right-3 text-white/60 hover:text-white"
              onClick={() => setMobileOpen(false)}
              data-testid="button-mobile-sidebar-close"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent forMobile />
          </aside>
        </>
      )}

      {/* Main content */}
      <main className={`flex-1 min-h-screen transition-all duration-200 ${mainMargin}`}>
        {children}
      </main>
    </div>
  );
}
