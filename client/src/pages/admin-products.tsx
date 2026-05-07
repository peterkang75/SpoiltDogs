import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, Package, TrendingUp,
  ExternalLink, ChevronDown, ChevronUp, Star, RefreshCw,
  Search, Download, Wifi, WifiOff, Truck, ShoppingBag,
  FolderTree, Check, X, Sparkles, Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import type { Product, ProductSourcing, Category } from "@shared/schema";

type ProductWithSourcing = Product & { sourcing: ProductSourcing | null };
type AdminCategory = Category & { productCount?: number };
type SupplierName = "CJ Dropshipping" | "Syncee";

interface SupplierProduct {
  supplierName: SupplierName;
  supplierProductId: string;
  supplierUrl: string;
  name: string;
  description: string;
  imageUrl: string;
  sourcingCostAud: number;
  shippingCostAud: number;
  shippingNote: string;
  category: string;
  inStock: boolean;
}

interface SupplierStatus {
  supplier: SupplierName;
  connected: boolean;
  message: string;
}

interface ShippingProfile {
  label: string;
  estimate: string;
  note: string;
  defaultShippingAud: number;
}

const TIER_LABELS: Record<string, string> = {
  premium: "Premium",
  smart_choice: "Smart Choice",
};
const TIER_COLORS: Record<string, string> = {
  premium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  smart_choice: "bg-blue-100 text-blue-800 border-blue-200",
};
const STATUS_LABELS: Record<string, string> = {
  researching: "조사 중",
  approved: "승인됨",
  active: "판매 중",
  discontinued: "중단됨",
};
const STATUS_COLORS: Record<string, string> = {
  researching: "bg-gray-100 text-gray-700 border-gray-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  discontinued: "bg-red-100 text-red-700 border-red-200",
};
const SUPPLIER_COLORS: Record<string, string> = {
  "CJ Dropshipping": "bg-orange-100 text-orange-700 border-orange-200",
  "Syncee": "bg-purple-100 text-purple-700 border-purple-200",
};

const STRIPE_RATE = 0.0175;
const STRIPE_FIXED = 0.30;

const SUPPLIER_SHIPPING_NOTES: Record<SupplierName, string> = {
  "CJ Dropshipping": "CJPacket (중국→호주) 기준: 소형 상품 약 $3–$8 AUD, 7–14 영업일",
  "Syncee": "공급사별 배송 요금 상이. 일부 공급사 무료 배송 제공 (기준 금액 이상 시)",
};

function calcProfitability(sourcingCost: number, shippingCost: number, margin: number) {
  const totalCost = sourcingCost + shippingCost;
  if (margin >= 100) return null;
  const denominator = 1 - margin / 100 - STRIPE_RATE;
  if (denominator <= 0) return null;
  const rawMin = totalCost / denominator + STRIPE_FIXED;
  const rounded = Math.ceil(rawMin / 0.05) * 0.05;
  const stripeFee = rounded * STRIPE_RATE + STRIPE_FIXED;
  const netProfit = rounded - totalCost - stripeFee;
  const actualMargin = rounded > 0 ? (netProfit / rounded) * 100 : 0;
  return { totalCost, minPrice: rawMin, rounded, stripeFee, netProfit, actualMargin };
}

function ProfitabilityCalculator({
  sourcingCost, shippingCost, supplierName,
}: { sourcingCost: number; shippingCost: number; supplierName?: string }) {
  const [margin, setMargin] = useState(50);
  const result = useMemo(
    () => calcProfitability(sourcingCost, shippingCost, margin),
    [sourcingCost, shippingCost, margin],
  );

  if (!result) return null;
  const { totalCost, rounded, stripeFee, netProfit, actualMargin } = result;
  const costPct = rounded > 0 ? (totalCost / rounded) * 100 : 0;
  const feePct = rounded > 0 ? (stripeFee / rounded) * 100 : 0;
  const profitPct = rounded > 0 ? (netProfit / rounded) * 100 : 0;
  const tierSuggestion = rounded >= 50 ? "Premium" : rounded >= 20 ? "Smart Choice" : "검토 필요";
  const afterpay = rounded / 4;
  const shippingNote = supplierName && (SUPPLIER_SHIPPING_NOTES as any)[supplierName]
    ? (SUPPLIER_SHIPPING_NOTES as any)[supplierName]
    : null;

  return (
    <div className="bg-[#1a3a2e] rounded-xl p-4 text-white space-y-4" data-testid="profitability-calculator">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-yellow-400" />
        <span className="font-semibold text-sm">수익성 계산기</span>
      </div>

      {shippingNote && (
        <div className="bg-white/10 rounded-lg p-2 flex items-start gap-2">
          <Truck className="w-3.5 h-3.5 text-yellow-300 mt-0.5 shrink-0" />
          <span className="text-xs text-gray-300">{shippingNote}</span>
        </div>
      )}

      <div>
        <Label className="text-gray-300 text-xs">목표 마진율 ({margin}%)</Label>
        <input
          type="range" min={10} max={80} step={5} value={margin}
          onChange={e => setMargin(Number(e.target.value))}
          className="w-full mt-1 accent-yellow-400"
          data-testid="margin-slider"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>10%</span><span>80%</span>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">총 원가</span>
          <span>${totalCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Stripe 수수료 (1.75% + $0.30)</span>
          <span className="text-red-300">${stripeFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-white/20 pt-1 mt-1">
          <span className="text-yellow-400">권장 판매가</span>
          <span className="text-yellow-400 text-lg">${rounded.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-300">
          <span>실제 마진</span>
          <span className={actualMargin >= 40 ? "text-green-400" : actualMargin >= 25 ? "text-yellow-300" : "text-red-400"}>
            {actualMargin.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-300">
          <span>순이익</span>
          <span className="text-green-400">${netProfit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-300">
          <span>Afterpay 4회 분할</span>
          <span>${afterpay.toFixed(2)}/회</span>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-300 mb-1">원가 구조</div>
        <div className="h-4 rounded-full overflow-hidden flex">
          <div className="bg-red-400 transition-all" style={{ width: `${costPct}%` }} />
          <div className="bg-orange-400 transition-all" style={{ width: `${feePct}%` }} />
          <div className="bg-green-400 transition-all" style={{ width: `${profitPct}%` }} />
        </div>
        <div className="flex gap-3 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />원가</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Stripe</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />마진</span>
        </div>
      </div>

      <div className="bg-white/10 rounded-lg p-2 text-center text-xs">
        <span className="text-gray-300">분류 추천: </span>
        <span className="font-bold text-yellow-300">{tierSuggestion}</span>
      </div>
    </div>
  );
}

const emptyForm = {
  name: "", slug: "", description: "", priceAud: "",
  compareAtPriceAud: "", categoryId: "", imageUrl: "", badge: "",
  inStock: true, featured: false,
  supplierName: "", supplierProductId: "", supplierUrl: "",
  sourcingCostAud: "", shippingCostAud: "",
  tier: "smart_choice", sourcingStatus: "researching", notes: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function SupplierBadge({ name }: { name: string }) {
  const color = SUPPLIER_COLORS[name] || "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium ${color}`}>
      {name}
    </span>
  );
}

export default function AdminProducts() {
  const { toast } = useToast();

  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "sourcing">("products");
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithSourcing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductWithSourcing | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [showImport, setShowImport] = useState(false);
  const [importSupplier, setImportSupplier] = useState<SupplierName>("CJ Dropshipping");
  const [importQuery, setImportQuery] = useState("");
  const [importResults, setImportResults] = useState<SupplierProduct[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

  const { data: products = [], isLoading } = useQuery<ProductWithSourcing[]>({
    queryKey: ["/api/admin/products"],
    queryFn: () => apiRequest("GET", "/api/admin/products").then(r => r.json()),
  });

  const { data: categories = [] } = useQuery<AdminCategory[]>({
    queryKey: ["/api/admin/categories"],
    queryFn: () => apiRequest("GET", "/api/admin/categories").then(r => r.json()),
  });

  const updateCategoryOnProduct = useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string | null }) =>
      apiRequest("PATCH", `/api/admin/products/${id}`, { categoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
    onError: (e: any) => toast({ title: "카테고리 변경 실패", description: e.message, variant: "destructive" }),
  });

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const renameRowMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/admin/products/${id}/rename`).then(async r => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "AI 이름 변경 실패");
        }
        return r.json() as Promise<{ before: { name: string }; after: { name: string; description: string } }>;
      }),
    onMutate: (id) => { setRenamingId(id); },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({
        title: "AI 이름 적용 완료",
        description: `${data.before.name.slice(0, 40)}${data.before.name.length > 40 ? "…" : ""} → ${data.after.name}`,
      });
    },
    onError: (e: any) => toast({ title: "AI 이름 변경 실패", description: e.message, variant: "destructive" }),
    onSettled: () => { setRenamingId(null); },
  });

  const [polishingForm, setPolishingForm] = useState(false);
  async function polishCurrentForm(silent = false) {
    if (!form.name.trim()) {
      if (!silent) toast({ title: "이름이 비어 있습니다", variant: "destructive" });
      return;
    }
    setPolishingForm(true);
    try {
      const res = await apiRequest("POST", "/api/admin/ai/polish-name", {
        name: form.name,
        description: form.description,
        supplierName: form.supplierName,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI 제안 실패");
      }
      const polished = await res.json() as { name: string; description: string };
      setForm(f => ({ ...f, name: polished.name, slug: slugify(polished.name), description: polished.description }));
      if (!silent) toast({ title: "AI 제안 적용", description: polished.name });
    } catch (e: any) {
      if (!silent) toast({ title: "AI 제안 실패", description: e.message, variant: "destructive" });
    } finally {
      setPolishingForm(false);
    }
  }

  const { data: supplierStatuses = [] } = useQuery<SupplierStatus[]>({
    queryKey: ["/api/admin/suppliers/status"],
    queryFn: () => apiRequest("GET", "/api/admin/suppliers/status").then(r => r.json()),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/admin/products", toPayload(data)).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "상품 등록 완료" });
      setShowForm(false);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      apiRequest("PATCH", `/api/admin/products/${id}`, toPayload(data)).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "상품 수정 완료" });
      setShowForm(false);
      setEditingProduct(null);
    },
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "상품 삭제 완료" });
      setDeleteTarget(null);
    },
  });


  function toPayload(f: typeof form) {
    return {
      name: f.name, slug: f.slug, description: f.description || null,
      priceAud: f.priceAud ? Math.round(parseFloat(f.priceAud) * 100) : 0,
      compareAtPriceAud: f.compareAtPriceAud ? Math.round(parseFloat(f.compareAtPriceAud) * 100) : null,
      categoryId: f.categoryId || null,
      imageUrl: f.imageUrl || null,
      badge: f.badge || null,
      inStock: f.inStock, featured: f.featured,
      supplierName: f.supplierName, supplierProductId: f.supplierProductId || null,
      supplierUrl: f.supplierUrl || null,
      sourcingCostAud: f.sourcingCostAud ? Math.round(parseFloat(f.sourcingCostAud) * 100) : 0,
      shippingCostAud: f.shippingCostAud ? Math.round(parseFloat(f.shippingCostAud) * 100) : 0,
      tier: f.tier, sourcingStatus: f.sourcingStatus, notes: f.notes || null,
    };
  }

  function openAdd() {
    setForm({ ...emptyForm });
    setEditingProduct(null);
    setShowForm(true);
  }

  function openEdit(p: ProductWithSourcing) {
    setEditingProduct(p);
    setForm({
      name: p.name, slug: p.slug, description: p.description || "",
      priceAud: (p.priceAud / 100).toString(),
      compareAtPriceAud: p.compareAtPriceAud ? (p.compareAtPriceAud / 100).toString() : "",
      categoryId: p.categoryId || "",
      imageUrl: p.imageUrl || "", badge: p.badge || "",
      inStock: p.inStock, featured: p.featured,
      supplierName: p.sourcing?.supplierName || "",
      supplierProductId: p.sourcing?.supplierProductId || "",
      supplierUrl: p.sourcing?.supplierUrl || "",
      sourcingCostAud: p.sourcing ? (p.sourcing.sourcingCostAud / 100).toString() : "",
      shippingCostAud: p.sourcing ? (p.sourcing.shippingCostAud / 100).toString() : "",
      tier: p.sourcing?.tier || "smart_choice",
      sourcingStatus: p.sourcing?.sourcingStatus || "researching",
      notes: p.sourcing?.notes || "",
    });
    setShowForm(true);
  }

  function matchSupplierCategory(supplierCat: string): AdminCategory | null {
    const raw = (supplierCat || "").toLowerCase().trim();
    if (!raw) return null;
    const tokens = raw.split(/[^a-z0-9]+/).filter(t => t.length >= 3);
    for (const c of categories) {
      const name = c.name.toLowerCase();
      const slug = c.slug.toLowerCase();
      if (raw.includes(name) || name.includes(raw)) return c;
      if (raw.includes(slug) || slug.includes(raw)) return c;
      if (tokens.some(t => name.includes(t) || slug.includes(t))) return c;
    }
    return null;
  }

  async function fillFormFromSupplierProduct(sp: SupplierProduct) {
    const profitCalc = calcProfitability(
      sp.sourcingCostAud / 100,
      sp.shippingCostAud / 100,
      50,
    );
    const suggestedPrice = profitCalc ? profitCalc.rounded.toFixed(2) : "";
    const suggestedTier = profitCalc
      ? (profitCalc.rounded >= 50 ? "premium" : "smart_choice")
      : "smart_choice";
    const matchedCategory = matchSupplierCategory(sp.category);

    setForm(f => ({
      ...f,
      name: sp.name,
      slug: slugify(sp.name),
      description: sp.description,
      imageUrl: sp.imageUrl,
      priceAud: suggestedPrice,
      categoryId: matchedCategory?.id || "",
      supplierName: sp.supplierName,
      supplierProductId: sp.supplierProductId,
      supplierUrl: sp.supplierUrl,
      sourcingCostAud: (sp.sourcingCostAud / 100).toString(),
      shippingCostAud: (sp.shippingCostAud / 100).toString(),
      tier: suggestedTier,
      sourcingStatus: "researching",
    }));
    setShowImport(false);
    setShowForm(true);
    toast({
      title: `${sp.supplierName}에서 상품 불러오기 완료`,
      description: matchedCategory
        ? `카테고리: ${matchedCategory.name} · AI 이름 정리 중...`
        : "AI 이름 정리 중...",
    });

    setPolishingForm(true);
    try {
      const res = await apiRequest("POST", "/api/admin/ai/polish-name", {
        name: sp.name,
        description: sp.description,
        supplierCategory: sp.category,
        supplierName: sp.supplierName,
      });
      if (!res.ok) throw new Error("polish failed");
      const polished = await res.json() as { name: string; description: string };
      setForm(f => ({
        ...f,
        name: polished.name,
        slug: slugify(polished.name),
        description: polished.description,
      }));
      toast({ title: "AI 이름 정리 완료", description: polished.name });
    } catch {
      toast({
        title: "AI 이름 정리 실패",
        description: "원본 이름으로 진행합니다. 'AI 자동 이름' 버튼으로 다시 시도할 수 있습니다.",
        variant: "destructive",
      });
    } finally {
      setPolishingForm(false);
    }
  }

  async function searchSupplier() {
    if (!importQuery.trim()) return;
    setImportLoading(true);
    setImportError("");
    setImportResults([]);
    try {
      const res = await apiRequest(
        "GET",
        `/api/admin/suppliers/search?supplier=${encodeURIComponent(importSupplier)}&q=${encodeURIComponent(importQuery)}`,
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.hint || "검색 실패");
      }
      const data = await res.json();
      setImportResults(data.products || []);
      if ((data.products || []).length === 0) setImportError("검색 결과가 없습니다.");
    } catch (e: any) {
      setImportError(e.message);
    } finally {
      setImportLoading(false);
    }
  }

  function handleSubmit() {
    if (!form.name || !form.slug || !form.priceAud) {
      toast({ title: "필수 항목 누락", description: "이름, slug, 판매가를 입력하세요", variant: "destructive" });
      return;
    }
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const sourcingCostNum = parseFloat(form.sourcingCostAud || "0") || 0;
  const shippingCostNum = parseFloat(form.shippingCostAud || "0") || 0;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchTier = filterTier === "all" || p.sourcing?.tier === filterTier;
      const matchStatus = filterStatus === "all" || p.sourcing?.sourcingStatus === filterStatus;
      const matchSupplier = filterSupplier === "all" || p.sourcing?.supplierName === filterSupplier;
      const matchCategory = filterCategory === "all"
        || (filterCategory === "__none__" ? !p.categoryId : p.categoryId === filterCategory);
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.includes(searchQuery.toLowerCase());
      return matchTier && matchStatus && matchSupplier && matchCategory && matchSearch;
    });
  }, [products, filterTier, filterStatus, filterSupplier, filterCategory, searchQuery]);

  const sourcingOnlyEntries = useMemo(() => products.filter(p => p.sourcing), [products]);

  const hasActiveFilters = filterTier !== "all" || filterStatus !== "all"
    || filterSupplier !== "all" || filterCategory !== "all" || searchQuery;

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function fmtAud(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const cjStatus = supplierStatuses.find(s => s.supplier === "CJ Dropshipping");
  const synceeStatus = supplierStatuses.find(s => s.supplier === "Syncee");

  return (
    <AdminLayout>
    <div className="min-h-screen bg-[#f8f5f0]">
      <div className="px-6 py-5 flex items-center justify-between border-b bg-white">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" style={{ color: "#4B9073" }} />
          <h1 className="font-bold text-lg" style={{ color: "#1a3a2e", fontFamily: "Fraunces, serif" }}>상품 관리</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCategoryManager(true)}
            variant="outline"
            className="text-sm"
            data-testid="manage-categories-button"
          >
            <FolderTree className="w-4 h-4 mr-1" /> 카테고리 관리
          </Button>
          <Button
            onClick={() => { setImportResults([]); setImportQuery(""); setImportError(""); setShowImport(true); }}
            variant="outline"
            className="text-sm"
            data-testid="import-from-supplier-button"
          >
            <Download className="w-4 h-4 mr-1" /> 공급사에서 불러오기
          </Button>
          <Button
            onClick={openAdd}
            className="text-sm font-semibold"
            style={{ backgroundColor: "#4B9073", color: "#fff" }}
            data-testid="add-product-button"
          >
            <Plus className="w-4 h-4 mr-1" /> 직접 등록
          </Button>
        </div>
      </div>

      <div className="px-6 py-2 bg-stone-100 border-b flex items-center gap-4">
        {[cjStatus, synceeStatus].filter(Boolean).map(s => s && (
          <div key={s.supplier} className="flex items-center gap-1.5 text-xs">
            {s.connected
              ? <Wifi className="w-3 h-3 text-green-400" />
              : <WifiOff className="w-3 h-3 text-gray-500" />
            }
            <span className={s.connected ? "text-green-400" : "text-gray-500"}>
              {s.supplier}
            </span>
            {!s.connected && (
              <span className="text-gray-600 text-xs">— API 키 미설정</span>
            )}
          </div>
        ))}
        {supplierStatuses.every(s => !s.connected) && supplierStatuses.length > 0 && (
          <span className="text-gray-500 text-xs">
            공급사 API 연결 방법: Replit Secrets에 CJ_API_EMAIL / CJ_API_PASSWORD / SYNCEE_API_KEY 추가
          </span>
        )}
      </div>

      <div className="px-6 py-4 border-b bg-white flex items-center gap-6">
        <button
          onClick={() => setActiveTab("products")}
          className={`text-sm font-medium pb-1 border-b-2 transition-colors ${activeTab === "products" ? "border-[#4B9073] text-[#1a3a2e]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          data-testid="tab-products"
        >
          상품 목록 ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("sourcing")}
          className={`text-sm font-medium pb-1 border-b-2 transition-colors ${activeTab === "sourcing" ? "border-[#4B9073] text-[#1a3a2e]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          data-testid="tab-sourcing"
        >
          소싱 후보 ({sourcingOnlyEntries.length})
        </button>
      </div>

      <div className="px-6 py-4 bg-white border-b flex flex-wrap items-center gap-3">
        <Input
          placeholder="상품명 또는 slug 검색..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-52 text-sm"
          data-testid="search-input"
        />
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-44 text-sm" data-testid="filter-supplier">
            <SelectValue placeholder="공급사 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 공급사</SelectItem>
            <SelectItem value="CJ Dropshipping">CJ Dropshipping</SelectItem>
            <SelectItem value="Syncee">Syncee</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-36 text-sm" data-testid="filter-tier">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 Tier</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="smart_choice">Smart Choice</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 text-sm" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="researching">조사 중</SelectItem>
            <SelectItem value="approved">승인됨</SelectItem>
            <SelectItem value="active">판매 중</SelectItem>
            <SelectItem value="discontinued">중단됨</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 text-sm" data-testid="filter-category">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            <SelectItem value="__none__">미지정</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{typeof c.productCount === "number" ? ` (${c.productCount})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setFilterTier("all"); setFilterStatus("all");
              setFilterSupplier("all"); setFilterCategory("all"); setSearchQuery("");
            }}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> 초기화
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filteredProducts.length}개 표시</span>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">로딩 중...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">등록된 상품이 없습니다</p>
            <p className="text-gray-400 text-sm mb-4">공급사에서 불러오거나 직접 등록하세요</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setShowImport(true)} variant="outline" className="text-sm">
                <Download className="w-4 h-4 mr-1" /> 공급사에서 불러오기
              </Button>
              <Button onClick={openAdd} className="bg-[#4B9073] hover:bg-[#3d7760] text-white text-sm">
                <Plus className="w-4 h-4 mr-1" /> 직접 등록
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-28" />
                <col className="w-40" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-32" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600"></th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">상품명</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">공급사</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">카테고리</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">판매가</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">Tier</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600">상태</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">마진</th>
                  <th className="text-center px-3 py-2.5 font-medium text-gray-600">재고</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const s = p.sourcing;
                  const isExpanded = expandedRows.has(p.id);
                  const profitability = s
                    ? calcProfitability(s.sourcingCostAud / 100, s.shippingCostAud / 100, 50)
                    : null;
                  const marginPct = profitability ? profitability.actualMargin : null;

                  return (
                    <>
                      <tr
                        key={p.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                        data-testid={`product-row-${p.id}`}
                      >
                        <td className="px-3 py-2.5 align-middle">
                          <button onClick={() => toggleRow(p.id)} className="text-gray-400 hover:text-gray-600" data-testid={`expand-row-${p.id}`}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            {p.imageUrl && (
                              <img src={p.imageUrl} alt={p.name} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-medium text-[#1a3a2e] leading-snug line-clamp-2 break-words"
                                title={p.name}
                              >
                                {p.name}
                              </div>
                              <div className="text-[11px] text-gray-400 truncate flex items-center gap-1" title={p.slug}>
                                {p.featured && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                                <span className="truncate">{p.slug}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          {s?.supplierName
                            ? <SupplierBadge name={s.supplierName} />
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <Select
                            value={p.categoryId || "__none__"}
                            onValueChange={v =>
                              updateCategoryOnProduct.mutate({ id: p.id, categoryId: v === "__none__" ? null : v })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs px-2 w-full" data-testid={`row-category-${p.id}`}>
                              <SelectValue placeholder="미지정" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">미지정</SelectItem>
                              {categories.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-right font-medium tabular-nums whitespace-nowrap">{fmtAud(p.priceAud)}</td>
                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          {s ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium ${TIER_COLORS[s.tier] || "bg-gray-100 text-gray-600"}`}>
                              {TIER_LABELS[s.tier] || s.tier}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          {s ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium ${STATUS_COLORS[s.sourcingStatus] || "bg-gray-100 text-gray-600"}`}>
                              {STATUS_LABELS[s.sourcingStatus] || s.sourcingStatus}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2.5 align-middle text-right tabular-nums whitespace-nowrap">
                          {marginPct !== null ? (
                            <span className={`text-xs font-medium ${marginPct >= 40 ? "text-green-600" : marginPct >= 25 ? "text-yellow-600" : "text-red-500"}`}>
                              {marginPct.toFixed(1)}%
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${p.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {p.inStock ? "판매" : "품절"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => renameRowMutation.mutate(p.id)}
                              disabled={renamingId === p.id}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50 disabled:cursor-wait"
                              title="AI 이름 정리"
                              data-testid={`rename-product-${p.id}`}
                            >
                              {renamingId === p.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Sparkles className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-[#4B9073] hover:bg-green-50 rounded transition-colors" title="수정" data-testid={`edit-product-${p.id}`}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="삭제" data-testid={`delete-product-${p.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && s && (
                        <tr key={`${p.id}-detail`} className="bg-[#f8f5f0] border-b">
                          <td colSpan={10} className="px-8 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">공급사</div>
                                <div className="font-medium">{s.supplierName || "—"}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">공급사 ID</div>
                                <div className="font-mono text-xs text-gray-600">{s.supplierProductId || "—"}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">매입가</div>
                                <div className="font-medium">{fmtAud(s.sourcingCostAud)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">배송비</div>
                                <div className="font-medium">{fmtAud(s.shippingCostAud)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">총 원가</div>
                                <div className="font-medium text-[#1a3a2e] font-semibold">
                                  {fmtAud(s.sourcingCostAud + s.shippingCostAud)}
                                </div>
                              </div>
                              {s.supplierUrl && (
                                <div className="col-span-2">
                                  <div className="text-xs text-gray-500 mb-0.5">공급사 링크</div>
                                  <a href={s.supplierUrl} target="_blank" rel="noopener noreferrer"
                                    className="text-[#4B9073] hover:underline flex items-center gap-1 text-xs">
                                    {s.supplierUrl.slice(0, 55)}... <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                              {s.notes && (
                                <div className="col-span-2 md:col-span-4">
                                  <div className="text-xs text-gray-500 mb-0.5">메모</div>
                                  <div className="text-sm text-gray-700">{s.notes}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Import from Supplier Dialog ── */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1a3a2e] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#4B9073]" />
              공급사 상품 불러오기
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">공급사 선택</Label>
                <Select value={importSupplier} onValueChange={v => {
                  setImportSupplier(v as SupplierName);
                  setImportResults([]);
                  setImportError("");
                }}>
                  <SelectTrigger className="mt-1 text-sm" data-testid="import-supplier-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CJ Dropshipping">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cjStatus?.connected ? "bg-green-500" : "bg-gray-400"}`} />
                        CJ Dropshipping {!cjStatus?.connected && "(미연결)"}
                      </div>
                    </SelectItem>
                    <SelectItem value="Syncee">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${synceeStatus?.connected ? "bg-green-500" : "bg-gray-400"}`} />
                        Syncee {!synceeStatus?.connected && "(미연결)"}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">상품 검색</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={importQuery}
                    onChange={e => setImportQuery(e.target.value)}
                    placeholder="예: dog bed, pet toy..."
                    className="text-sm"
                    onKeyDown={e => e.key === "Enter" && searchSupplier()}
                    data-testid="import-search-input"
                  />
                  <Button
                    onClick={searchSupplier}
                    disabled={importLoading || !importQuery.trim()}
                    className="bg-[#4B9073] hover:bg-[#3d7760] text-white shrink-0"
                    data-testid="import-search-button"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {(() => {
              const activeSupplierStatus = supplierStatuses.find(s => s.supplier === importSupplier);
              if (activeSupplierStatus && !activeSupplierStatus.connected) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <strong>API 미연결:</strong> {activeSupplierStatus.message}
                    <br />
                    <span className="text-xs text-amber-600 mt-1 block">
                      Replit Secrets에서 해당 API 키를 설정한 후 서버를 재시작하면 연결됩니다.
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {importLoading && (
              <div className="text-center py-8 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                {importSupplier} 검색 중...
              </div>
            )}

            {importError && !importLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {importError}
              </div>
            )}

            {importResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-gray-500">{importResults.length}개 검색됨</div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {importResults.map(sp => {
                    const profCalc = calcProfitability(sp.sourcingCostAud / 100, sp.shippingCostAud / 100, 50);
                    const matched = matchSupplierCategory(sp.category);
                    return (
                      <div
                        key={sp.supplierProductId}
                        className="flex items-start gap-3 border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                        data-testid={`import-result-${sp.supplierProductId}`}
                      >
                        {sp.imageUrl && (
                          <img src={sp.imageUrl} alt={sp.name} className="w-14 h-14 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[#1a3a2e] truncate">{sp.name}</div>
                          <div className="text-xs text-gray-500 truncate flex items-center gap-1.5">
                            <span className="truncate">{sp.category || "—"}</span>
                            {matched ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 text-[10px] font-medium shrink-0">
                                → {matched.name}
                              </span>
                            ) : sp.category ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] shrink-0">
                                매칭 없음
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="text-gray-600">매입가: <strong>${(sp.sourcingCostAud / 100).toFixed(2)}</strong></span>
                            <span className="text-gray-600">배송: <strong>${(sp.shippingCostAud / 100).toFixed(2)}</strong></span>
                            {profCalc && (
                              <span className="text-green-600 font-medium">
                                권장가: ${profCalc.rounded.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{sp.shippingNote}</div>
                        </div>
                        <Button
                          onClick={() => fillFormFromSupplierProduct(sp)}
                          size="sm"
                          className="bg-[#4B9073] hover:bg-[#3d7760] text-white text-xs shrink-0"
                          data-testid={`import-select-${sp.supplierProductId}`}
                        >
                          선택
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Product Dialog ── */}
      <Dialog open={showForm} onOpenChange={open => { setShowForm(open); if (!open) setEditingProduct(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1a3a2e]">
              {editingProduct ? "상품 수정" : "새 상품 등록"}
              {form.supplierName && (
                <span className="ml-2 text-sm font-normal">
                  <SupplierBadge name={form.supplierName} />
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
            <div className="lg:col-span-2 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[#1a3a2e] mb-3 pb-1 border-b">상품 기본 정보</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">상품명 *</Label>
                      <button
                        type="button"
                        onClick={() => polishCurrentForm(false)}
                        disabled={polishingForm || !form.name.trim()}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-wait"
                        title="이름과 설명을 SpoiltDogs 톤으로 정리"
                        data-testid="polish-form-button"
                      >
                        {polishingForm
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Sparkles className="w-3 h-3" />}
                        AI 자동 이름
                      </button>
                    </div>
                    <Input
                      value={form.name}
                      onChange={e => setForm(f => ({
                        ...f, name: e.target.value,
                        slug: editingProduct ? f.slug : slugify(e.target.value),
                      }))}
                      placeholder="예: 호주 캥거루 저키 트릿"
                      className="mt-1 text-sm"
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Slug *</Label>
                    <Input
                      value={form.slug}
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                      placeholder="kangaroo-jerky-treats"
                      className="mt-1 text-sm font-mono"
                      data-testid="input-slug"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">배지 (Badge)</Label>
                    <Input
                      value={form.badge}
                      onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                      placeholder="Best Seller, New, Premium..."
                      className="mt-1 text-sm"
                      data-testid="input-badge"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">판매가 (AUD) *</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                      <Input value={form.priceAud} onChange={e => setForm(f => ({ ...f, priceAud: e.target.value }))}
                        placeholder="29.90" className="pl-6 text-sm" type="number" step="0.01" data-testid="input-price" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">원래 가격 (정가)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                      <Input value={form.compareAtPriceAud} onChange={e => setForm(f => ({ ...f, compareAtPriceAud: e.target.value }))}
                        placeholder="39.90" className="pl-6 text-sm" type="number" step="0.01" data-testid="input-compare-price" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium">카테고리</Label>
                    <Select
                      value={form.categoryId || "__none__"}
                      onValueChange={v => setForm(f => ({ ...f, categoryId: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger className="mt-1 text-sm" data-testid="select-category">
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">없음 (미지정)</SelectItem>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium">이미지 URL</Label>
                    <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="https://..." className="mt-1 text-sm" data-testid="input-image-url" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium">상품 설명</Label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="상품 상세 설명을 입력하세요..." className="mt-1 text-sm resize-none" rows={3} data-testid="input-description" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.inStock} onCheckedChange={v => setForm(f => ({ ...f, inStock: v }))} data-testid="switch-in-stock" />
                    <Label className="text-xs font-medium cursor-pointer">재고 있음</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.featured} onCheckedChange={v => setForm(f => ({ ...f, featured: v }))} data-testid="switch-featured" />
                    <Label className="text-xs font-medium cursor-pointer">홈페이지 추천 상품</Label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#1a3a2e] mb-3 pb-1 border-b">소싱 정보</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">공급사</Label>
                    <Select
                      value={form.supplierName || "__manual__"}
                      onValueChange={v => setForm(f => ({ ...f, supplierName: v === "__manual__" ? "" : v }))}
                    >
                      <SelectTrigger className="mt-1 text-sm" data-testid="select-supplier-name">
                        <SelectValue placeholder="공급사 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__manual__">직접 입력</SelectItem>
                        <SelectItem value="CJ Dropshipping">CJ Dropshipping</SelectItem>
                        <SelectItem value="Syncee">Syncee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">공급사 상품 ID</Label>
                    <Input value={form.supplierProductId} onChange={e => setForm(f => ({ ...f, supplierProductId: e.target.value }))}
                      placeholder="SKU-12345" className="mt-1 text-sm" data-testid="input-supplier-product-id" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium">공급사 상품 URL</Label>
                    <Input value={form.supplierUrl} onChange={e => setForm(f => ({ ...f, supplierUrl: e.target.value }))}
                      placeholder="https://cjdropshipping.com/product/..." className="mt-1 text-sm" data-testid="input-supplier-url" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">매입가 (AUD)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                      <Input value={form.sourcingCostAud} onChange={e => setForm(f => ({ ...f, sourcingCostAud: e.target.value }))}
                        placeholder="8.50" className="pl-6 text-sm" type="number" step="0.01" data-testid="input-sourcing-cost" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">
                      배송비 (AUD)
                      {form.supplierName && (form.supplierName === "CJ Dropshipping" || form.supplierName === "Syncee") && (
                        <span className="ml-1 text-gray-400 font-normal">
                          — 기본 ${form.supplierName === "CJ Dropshipping" ? "5.00" : "4.00"}
                        </span>
                      )}
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                      <Input value={form.shippingCostAud} onChange={e => setForm(f => ({ ...f, shippingCostAud: e.target.value }))}
                        placeholder="3.20" className="pl-6 text-sm" type="number" step="0.01" data-testid="input-shipping-cost" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Tier 분류</Label>
                    <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                      <SelectTrigger className="mt-1 text-sm" data-testid="select-tier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="smart_choice">Smart Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">소싱 상태</Label>
                    <Select value={form.sourcingStatus} onValueChange={v => setForm(f => ({ ...f, sourcingStatus: v }))}>
                      <SelectTrigger className="mt-1 text-sm" data-testid="select-sourcing-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="researching">조사 중</SelectItem>
                        <SelectItem value="approved">승인됨</SelectItem>
                        <SelectItem value="active">판매 중</SelectItem>
                        <SelectItem value="discontinued">중단됨</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium">소싱 메모</Label>
                    <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="품질 평가, 특이사항, 협상 여지 등..." className="mt-1 text-sm resize-none" rows={2} data-testid="input-notes" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(sourcingCostNum > 0 || shippingCostNum > 0) ? (
                <ProfitabilityCalculator
                  sourcingCost={sourcingCostNum}
                  shippingCost={shippingCostNum}
                  supplierName={form.supplierName}
                />
              ) : (
                <div className="bg-gray-100 rounded-xl p-4 text-center text-sm text-gray-500">
                  <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>매입가와 배송비를 입력하면</p>
                  <p>수익성 계산기가 표시됩니다</p>
                </div>
              )}

              {form.imageUrl && (
                <div>
                  <Label className="text-xs font-medium text-gray-600">이미지 미리보기</Label>
                  <img src={form.imageUrl} alt="preview" className="mt-1 w-full h-40 object-cover rounded-lg border"
                    onError={e => (e.currentTarget.style.display = "none")} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingProduct(null); }}>취소</Button>
            <Button onClick={handleSubmit} disabled={isPending}
              className="bg-[#4B9073] hover:bg-[#3d7760] text-white" data-testid="submit-product-button">
              {isPending ? "저장 중..." : editingProduct ? "수정 저장" : "상품 등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category Manager Dialog ── */}
      <CategoryManagerDialog
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
        categories={categories}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상품 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong>을(를) 삭제하시겠습니까?
              소싱 정보도 함께 삭제되며 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-500 hover:bg-red-600 text-white" data-testid="confirm-delete-button">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AdminLayout>
  );
}

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AdminCategory[];
}

function CategoryManagerDialog({ open, onOpenChange, categories }: CategoryManagerDialogProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftSlug, setDraftSlug] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AdminCategory | null>(null);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
  }

  const createMut = useMutation({
    mutationFn: (data: { name: string; slug: string; description: string }) =>
      apiRequest("POST", "/api/admin/categories", {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "카테고리 생성 실패");
        }
        return r.json();
      }),
    onSuccess: () => {
      toast({ title: "카테고리 추가 완료" });
      invalidateAll();
      setNewName(""); setNewSlug(""); setNewDescription("");
    },
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; slug: string; description: string } }) =>
      apiRequest("PATCH", `/api/admin/categories/${id}`, {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "카테고리 수정 실패");
        }
        return r.json();
      }),
    onSuccess: () => {
      toast({ title: "카테고리 수정 완료" });
      invalidateAll();
      setEditingId(null);
    },
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/categories/${id}`).then(async r => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "카테고리 삭제 실패");
        }
      }),
    onSuccess: () => {
      toast({ title: "카테고리 삭제 완료", description: "해당 카테고리에 속한 상품은 미지정으로 변경되었습니다." });
      invalidateAll();
      setConfirmDelete(null);
    },
    onError: (e: any) => toast({ title: "오류", description: e.message, variant: "destructive" }),
  });

  function startEdit(c: AdminCategory) {
    setEditingId(c.id);
    setDraftName(c.name);
    setDraftSlug(c.slug);
    setDraftDescription(c.description || "");
  }

  function saveEdit(id: string) {
    if (!draftName.trim() || !draftSlug.trim()) {
      toast({ title: "이름과 슬러그는 필수입니다", variant: "destructive" });
      return;
    }
    updateMut.mutate({ id, data: { name: draftName.trim(), slug: draftSlug.trim(), description: draftDescription } });
  }

  function submitNew() {
    if (!newName.trim()) {
      toast({ title: "카테고리 이름을 입력하세요", variant: "destructive" });
      return;
    }
    const slug = (newSlug.trim() || slugify(newName)).trim();
    if (!slug) {
      toast({ title: "슬러그가 비어 있습니다", variant: "destructive" });
      return;
    }
    createMut.mutate({ name: newName.trim(), slug, description: newDescription });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1a3a2e] flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#4B9073]" />
              카테고리 관리
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div className="border rounded-lg p-4 bg-[#f8f5f0]">
              <div className="text-sm font-semibold text-[#1a3a2e] mb-3">새 카테고리 추가</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">이름 *</Label>
                  <Input
                    value={newName}
                    onChange={e => {
                      setNewName(e.target.value);
                      if (!newSlug) setNewSlug(slugify(e.target.value));
                    }}
                    placeholder="예: 장난감 (Toys)"
                    className="mt-1 text-sm"
                    data-testid="new-category-name"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">슬러그 *</Label>
                  <Input
                    value={newSlug}
                    onChange={e => setNewSlug(e.target.value)}
                    placeholder="toys"
                    className="mt-1 text-sm font-mono"
                    data-testid="new-category-slug"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium">설명 (선택)</Label>
                  <Input
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="공급사 자동 매핑은 이름·슬러그를 기준으로 동작합니다"
                    className="mt-1 text-sm"
                    data-testid="new-category-description"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  onClick={submitNew}
                  disabled={createMut.isPending}
                  className="bg-[#4B9073] hover:bg-[#3d7760] text-white text-sm"
                  data-testid="submit-new-category"
                >
                  <Plus className="w-4 h-4 mr-1" /> 추가
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">이름</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">슬러그</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">상품 수</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                        등록된 카테고리가 없습니다
                      </td>
                    </tr>
                  )}
                  {categories.map(c => {
                    const editing = editingId === c.id;
                    return (
                      <tr key={c.id} className="border-b last:border-b-0" data-testid={`category-row-${c.id}`}>
                        <td className="px-4 py-2 align-top">
                          {editing ? (
                            <Input
                              value={draftName}
                              onChange={e => setDraftName(e.target.value)}
                              className="text-sm h-8"
                              data-testid={`edit-category-name-${c.id}`}
                            />
                          ) : (
                            <div className="font-medium text-[#1a3a2e]">{c.name}</div>
                          )}
                          {editing && (
                            <Input
                              value={draftDescription}
                              onChange={e => setDraftDescription(e.target.value)}
                              placeholder="설명 (선택)"
                              className="text-xs h-7 mt-1"
                              data-testid={`edit-category-description-${c.id}`}
                            />
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          {editing ? (
                            <Input
                              value={draftSlug}
                              onChange={e => setDraftSlug(e.target.value)}
                              className="text-xs h-8 font-mono"
                              data-testid={`edit-category-slug-${c.id}`}
                            />
                          ) : (
                            <span className="text-xs text-gray-500 font-mono">{c.slug}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top text-xs text-gray-600">
                          {typeof c.productCount === "number" ? `${c.productCount}` : "—"}
                        </td>
                        <td className="px-4 py-2 align-top text-right">
                          {editing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveEdit(c.id)}
                                disabled={updateMut.isPending}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="저장"
                                data-testid={`save-category-${c.id}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-gray-400 hover:bg-gray-50 rounded"
                                title="취소"
                                data-testid={`cancel-category-${c.id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(c)}
                                className="p-1.5 text-gray-400 hover:text-[#4B9073] hover:bg-green-50 rounded"
                                title="수정"
                                data-testid={`edit-category-${c.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(c)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                title="삭제"
                                data-testid={`delete-category-${c.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-gray-500 leading-relaxed">
              · 공급사에서 상품을 불러올 때 supplier가 보내준 카테고리 문자열을 우리 카테고리 이름·슬러그와 부분일치로 자동 매핑합니다.<br />
              · 자동 매핑 후에도 상품 목록의 카테고리 셀에서 언제든 변경할 수 있습니다.<br />
              · 카테고리를 삭제하면 속한 상품의 카테고리는 "미지정"으로 풀립니다 (상품 자체는 유지됩니다).
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.name}</strong> 카테고리를 삭제하시겠습니까?
              {typeof confirmDelete?.productCount === "number" && confirmDelete.productCount > 0 && (
                <> 이 카테고리에 속한 <strong>{confirmDelete.productCount}개</strong> 상품의 카테고리가 "미지정"으로 변경됩니다.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="confirm-delete-category"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
