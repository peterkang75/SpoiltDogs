import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Users, ShoppingCart, Mail, DollarSign, LogOut, Send, Plus,
  Dog, PencilLine, Wand2, Loader2, Brain, Sparkles,
  ChevronLeft, ChevronRight, Package, MessageSquare, Clock,
  Reply, X, Search, Eye, EyeOff, Phone, MessageCircle,
  ExternalLink, FileText, Paperclip, Radio, Languages, Zap, BellRing, Volume2, Link2,
  ShoppingBag, Star, Tag, ArrowRight, Image as ImageIcon, Menu, UserCircle, ArrowLeft
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import type { Profile, Order, Message, Product } from "@shared/schema";

type Channel = "email" | "whatsapp" | "sms" | "chat";

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    gain.gain.value = 0.15;
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function inferChannel(msg: Message): Channel {
  if (msg.status === "chat") return "chat";
  return "email";
}

interface ParsedPCARD {
  name: string;
  description?: string;
  price: string;
  comparePrice?: string;
  imageUrl?: string;
  productUrl: string;
  badge?: string;
}

function parsePCARD(body: string): { displayText: string; card?: ParsedPCARD } {
  const match = body?.match(/<!--PCARD:([\s\S]*?)-->/);
  if (match) {
    try {
      const card = JSON.parse(match[1]) as ParsedPCARD;
      const displayText = body.replace(/\n?<!--PCARD:[\s\S]*?-->/g, "").trim();
      return { displayText, card };
    } catch {}
  }
  return { displayText: (body || "").replace(/\n?<!--PCARD:[\s\S]*?-->/g, "").trim() };
}

function ProductCardInBubble({ card }: { card: ParsedPCARD }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-white dark:bg-stone-900 overflow-hidden mt-1 shadow-sm" data-testid="admin-product-card">
      {card.imageUrl && (
        <img src={card.imageUrl} alt={card.name} className="w-full h-28 object-cover" />
      )}
      <div className="p-2.5 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 leading-tight flex-1">{card.name}</p>
          {card.badge && (
            <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">{card.badge}</span>
          )}
        </div>
        {card.description && (
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2">{card.description}</p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-amber-700">{card.price}</span>
          {card.comparePrice && (
            <span className="text-xs text-stone-400 line-through">{card.comparePrice}</span>
          )}
        </div>
        {card.productUrl && (
          <a href={card.productUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 mt-0.5 bg-amber-700 text-white text-xs font-semibold rounded-lg hover:bg-amber-800 transition"
            data-testid="admin-product-card-link">
            <ShoppingBag className="h-3 w-3" /> 상품 보기
          </a>
        )}
      </div>
    </div>
  );
}

const CHANNEL_CONFIG: Record<Channel, {
  label: string; icon: typeof Mail; badgeClass: string;
  bubbleIncoming: string; bubbleOutgoing: string; accentColor: string;
}> = {
  email: {
    label: "Email",
    icon: Mail,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    bubbleIncoming: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    bubbleOutgoing: "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700",
    accentColor: "text-blue-600",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    bubbleIncoming: "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800",
    bubbleOutgoing: "bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700",
    accentColor: "text-green-600",
  },
  sms: {
    label: "SMS",
    icon: Phone,
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    bubbleIncoming: "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700",
    bubbleOutgoing: "bg-gray-100 dark:bg-gray-800/40 border-gray-300 dark:border-gray-600",
    accentColor: "text-gray-600",
  },
  chat: {
    label: "Live Chat",
    icon: Radio,
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    bubbleIncoming: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800",
    bubbleOutgoing: "bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700",
    accentColor: "text-orange-600",
  },
};

function SafeHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = useMemo(() => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "span", "div", "table", "tr", "td", "th", "thead", "tbody", "img", "hr"],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class", "src", "alt", "width", "height", "dir"],
  }), [html]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = DOMPurify.sanitize(html);
  return (tmp.textContent || tmp.innerText || "").trim();
}

const STATUS_LABELS: Record<string, string> = {
  pending: "대기중", paid: "결제완료", shipped: "배송중", complete: "완료", cancelled: "취소됨",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800", paid: "bg-green-100 text-green-800",
  shipped: "bg-blue-100 text-blue-800", complete: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

function fmtTime(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleString("ko-KR", { timeZone: "Australia/Sydney", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ko-KR", { timeZone: "Australia/Sydney" });
}

function ProfileMergeButton({ profileId, profiles }: { profileId: string; profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const mergeMutation = useMutation({
    mutationFn: async (mergeId: string) => {
      await apiRequest("POST", "/api/admin/profiles/merge", { keepId: profileId, mergeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      toast({ title: "프로필 병합 완료" });
      setOpen(false);
    },
    onError: () => { toast({ title: "병합 실패", variant: "destructive" }); },
  });

  const candidates = profiles.filter(p => p.id !== profileId && (
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.name || "").toLowerCase().includes(search.toLowerCase())
  )).slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full text-xs gap-1" data-testid="button-merge-profile">
          <Link2 className="h-3 w-3" /> 프로필 병합
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">프로필 병합</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">병합할 프로필을 선택하세요. 선택한 프로필의 메시지와 주문이 현재 프로필로 이동됩니다.</p>
        <Input placeholder="이메일 또는 이름 검색..." value={search} onChange={e => setSearch(e.target.value)} className="text-xs" data-testid="input-merge-search" />
        <div className="max-h-48 overflow-y-auto space-y-1">
          {candidates.map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded border text-xs hover:bg-muted/50 cursor-pointer" data-testid={`merge-candidate-${p.id}`}>
              <div className="min-w-0 mr-2">
                <p className="font-medium truncate">{p.name || p.email.split("@")[0]}</p>
                <p className="text-muted-foreground truncate">{p.email}</p>
              </div>
              <Button size="sm" variant="destructive" className="h-6 text-[10px] shrink-0" disabled={mergeMutation.isPending} onClick={() => {
                if (confirm(`"${p.email}" 프로필을 현재 프로필로 병합합니다. 이 작업은 되돌릴 수 없습니다.`)) {
                  mergeMutation.mutate(p.id);
                }
              }} data-testid={`button-confirm-merge-${p.id}`}>
                {mergeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "병합"}
              </Button>
            </div>
          ))}
          {search && candidates.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">검색 결과 없음</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PhoneInput({ profile }: { profile: Profile }) {
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    let p: Record<string, any> = {};
    try { p = profile.preferences ? JSON.parse(profile.preferences) : {}; } catch {}
    setPhone(p.phone || "");
  }, [profile.id, profile.preferences]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let currentPrefs: Record<string, any> = {};
      try { currentPrefs = profile.preferences ? JSON.parse(profile.preferences) : {}; } catch {}
      currentPrefs.phone = phone.trim() || undefined;
      await apiRequest("PATCH", `/api/admin/profiles/${profile.id}`, { preferences: JSON.stringify(currentPrefs) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profiles"] });
      toast({ title: "전화번호 저장됨" });
    },
  });

  return (
    <div className="flex items-center gap-1.5">
      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="전화번호..." className="h-6 text-xs flex-1" data-testid="input-phone" />
      <Button size="sm" variant="ghost" className="h-6 text-xs px-2 shrink-0" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-phone">
        저장
      </Button>
    </div>
  );
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildCompactEmailCardHtml(product: Product): string {
  const price = `$${(product.priceAud / 100).toFixed(2)} AUD`;
  const comparePrice = product.compareAtPriceAud ? `$${(product.compareAtPriceAud / 100).toFixed(2)} AUD` : "";
  const url = `https://spoiltdogs.com.au/products/${encodeURIComponent(product.slug)}`;
  const name = escHtml(product.name);
  const badge = product.badge ? escHtml(product.badge) : "";
  const imgUrl = product.imageUrl ? escHtml(product.imageUrl) : "";
  return `<table cellpadding="0" cellspacing="0" border="0" style="width:200px;max-width:200px;border:1px solid #e5e0d8;border-radius:8px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:inline-table;vertical-align:top;margin:4px;">
  ${imgUrl ? `<tr><td style="padding:0;"><img src="${imgUrl}" alt="${name}" style="width:200px;height:120px;object-fit:cover;display:block;border-radius:8px 8px 0 0;" /></td></tr>` : ""}
  <tr><td style="padding:10px;">
    ${badge ? `<span style="display:inline-block;background:#f59e0b;color:#fff;font-size:9px;font-weight:600;padding:1px 6px;border-radius:999px;margin-bottom:4px;">${badge}</span>` : ""}
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1a1a1a;line-height:1.3;">${name}</p>
    <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#b45309;">${price}${comparePrice ? ` <span style="font-size:11px;color:#999;text-decoration:line-through;">${comparePrice}</span>` : ""}</p>
    <a href="${url}" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:600;">View Product</a>
  </td></tr>
</table>`;
}

function ProductCard({ product, channel, profileId, onSent, onInsertToDraft }: {
  product: Product; channel?: Channel; profileId?: string;
  onSent?: () => void; onInsertToDraft?: (product: Product) => void;
}) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const isInsertMode = !!onInsertToDraft;

  const handleSend = async () => {
    if (isInsertMode) {
      onInsertToDraft!(product);
      return;
    }
    if (!profileId) return;
    setSending(true);
    try {
      const res = await apiRequest("POST", "/api/admin/products/send-card", {
        productId: product.id, profileId, channel: channel || "email",
      });
      const data = await res.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/profile", profileId] });
        const toastTitle = data.type === "email-fallback"
          ? "고객 오프라인 — 이메일로 전송됨"
          : data.type === "chat-only"
            ? "채팅 저장됨 (이메일 전송 실패)"
            : "제품 카드 전송 완료";
        toast({ title: toastTitle, variant: data.emailFailed ? "destructive" : "default" });
        onSent?.();
      } else if (data.text) {
        await navigator.clipboard.writeText(data.text);
        toast({ title: "텍스트 복사됨 (클립보드)" });
      }
    } catch { toast({ title: "제품 카드 전송 실패", variant: "destructive" }); }
    finally { setSending(false); }
  };

  return (
    <div className="rounded-lg border bg-white dark:bg-stone-800 overflow-hidden flex" data-testid={`product-card-${product.id}`}>
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-cover shrink-0" />
      ) : (
        <div className="w-16 h-16 bg-stone-100 dark:bg-stone-700 flex items-center justify-center shrink-0">
          <ImageIcon className="h-5 w-5 text-muted-foreground opacity-40" />
        </div>
      )}
      <div className="flex-1 min-w-0 p-1.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h4 className="text-[11px] font-semibold leading-tight truncate">{product.name}</h4>
            {product.badge && (
              <Badge variant="secondary" className="text-[8px] h-3.5 px-1 shrink-0">{product.badge}</Badge>
            )}
          </div>
          {product.description && (
            <p className="text-[9px] text-muted-foreground truncate leading-snug mt-0.5">{product.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[11px] font-bold text-amber-700">${(product.priceAud / 100).toFixed(2)}</span>
          {product.compareAtPriceAud && (
            <span className="text-[9px] text-muted-foreground line-through">${(product.compareAtPriceAud / 100).toFixed(2)}</span>
          )}
          {!product.inStock && <Badge variant="destructive" className="text-[8px] h-3.5 px-1">품절</Badge>}
          <div className="flex gap-0.5 ml-auto shrink-0">
            {(profileId && channel) || isInsertMode ? (
              <Button size="sm" className={`h-5 text-[9px] px-1.5 gap-0.5 ${isInsertMode ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"}`} disabled={sending} onClick={handleSend} data-testid={`button-send-product-${product.id}`}>
                {sending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : isInsertMode ? <Plus className="h-2.5 w-2.5" /> : <Send className="h-2.5 w-2.5" />}
                {isInsertMode ? "삽입" : "전송"}
              </Button>
            ) : profileId && !channel ? (
              <span className="text-[8px] text-muted-foreground">채널 선택 필요</span>
            ) : null}
            <Button size="sm" variant="outline" className="h-5 text-[9px] px-1 shrink-0" asChild data-testid={`button-view-product-${product.id}`}>
              <a href={`https://spoiltdogs.com.au/products/${product.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductRecommendationPanel({ messages, profile, channel: explicitChannel, slashKeyword, onSlashConsumed, focusMessage, onFocusConsumed, onInsertToDraft }: {
  messages: Message[]; profile: Profile; channel?: Channel;
  slashKeyword?: string; onSlashConsumed?: () => void;
  focusMessage?: Message | null; onFocusConsumed?: () => void;
  onInsertToDraft?: (product: Product) => void;
}) {
  const inferredChannel = useMemo(() => {
    if (explicitChannel) return explicitChannel;
    const lastMsg = messages[0];
    if (lastMsg) return inferChannel(lastMsg);
    return "email" as Channel;
  }, [explicitChannel, messages]);
  const channel = inferredChannel;
  const [recommendations, setRecommendations] = useState<Array<{ productId: string; reason: string; confidence: number; product: Product }>>([]);
  const [threadSummary, setThreadSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "search">("ai");
  const { toast } = useToast();

  const [activeFocus, setActiveFocus] = useState<Message | null>(null);

  useEffect(() => {
    if (slashKeyword && slashKeyword.trim()) {
      setActiveTab("search");
      setSearchQuery(slashKeyword);
      handleSearch(slashKeyword);
      onSlashConsumed?.();
    }
  }, [slashKeyword]);

  useEffect(() => {
    if (focusMessage) {
      setActiveFocus(focusMessage);
      setActiveTab("ai");
      setRecommendations([]);
      onFocusConsumed?.();
      handleRecommend(focusMessage);
    }
  }, [focusMessage]);

  const handleRecommend = async (singleMessage?: Message | null) => {
    setIsLoading(true);
    try {
      let profileContext = "";
      if (profile.name) profileContext += `Name: ${profile.name}, `;
      if (profile.dogName) profileContext += `Dog: ${profile.dogName}, `;
      if (profile.dogBreed) profileContext += `Breed: ${profile.dogBreed}, `;
      if (profile.dogAge) profileContext += `Age: ${profile.dogAge}`;

      const targetMsg = singleMessage || activeFocus;
      const payload: any = {
        profileContext: profileContext || undefined,
      };
      if (targetMsg) {
        payload.focusMessageBody = targetMsg.body;
        payload.focusMessageSubject = targetMsg.subject;
        payload.messages = [{ direction: targetMsg.direction, subject: targetMsg.subject, body: targetMsg.body }];
      } else {
        payload.messages = messages.slice(-10).map(m => ({
          direction: m.direction, subject: m.subject, body: m.body,
        }));
      }

      const res = await apiRequest("POST", "/api/admin/ai/recommend-products", payload);
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setThreadSummary(data.threadSummary || "");
      if (data.recommendations?.length === 0 && data.reason) {
        toast({ title: data.reason });
      }
    } catch { toast({ title: "AI 추천 실패", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await apiRequest("GET", `/api/admin/products/search?q=${encodeURIComponent(q)}`);
      setSearchResults(await res.json());
    } catch { toast({ title: "검색 실패", variant: "destructive" }); }
    finally { setIsSearching(false); }
  };

  return (
    <div className="border-t bg-gradient-to-b from-amber-50/50 to-white dark:from-stone-800 dark:to-stone-800" data-testid="panel-product-recommendations">
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-amber-600" />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">제품 추천</span>
        <div className="flex gap-0.5 ml-auto">
          <Button size="sm" variant={activeTab === "ai" ? "default" : "ghost"} className="h-6 text-[10px] px-2" onClick={() => setActiveTab("ai")} data-testid="tab-ai-recommend">
            <Sparkles className="h-3 w-3 mr-0.5" /> AI
          </Button>
          <Button size="sm" variant={activeTab === "search" ? "default" : "ghost"} className="h-6 text-[10px] px-2" onClick={() => setActiveTab("search")} data-testid="tab-product-search">
            <Search className="h-3 w-3 mr-0.5" /> 검색
          </Button>
        </div>
      </div>

      <div className="p-2 space-y-1.5 max-h-[280px] overflow-y-auto">
        {activeTab === "ai" ? (
          <>
            {activeFocus && (
              <div className="flex items-center gap-1.5 px-1 py-1 rounded border border-amber-300 bg-amber-100/50 dark:bg-amber-900/30 mb-1">
                <ShoppingBag className="h-3 w-3 text-amber-600 shrink-0" />
                <span className="text-[10px] text-amber-800 dark:text-amber-300 truncate flex-1">
                  메시지 기반 추천: "{stripHtml(activeFocus.body).slice(0, 50)}..."
                </span>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-amber-600" onClick={() => { setActiveFocus(null); setRecommendations([]); }} data-testid="button-clear-focus">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {recommendations.length === 0 ? (
              <div className="text-center py-4">
                <Button size="sm" variant="outline" className="text-xs gap-1 border-amber-200 text-amber-700 hover:bg-amber-50" disabled={isLoading} onClick={() => handleRecommend()} data-testid="button-ai-recommend">
                  {isLoading ? <><Loader2 className="h-3 w-3 animate-spin" /> 분석 중...</> : <><Brain className="h-3 w-3" /> {activeFocus ? "메시지 기반 AI 추천" : "대화 기반 AI 추천"}</>}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2">{activeFocus ? "선택한 메시지를 분석하여 적합한 제품을 추천합니다" : "대화 내용을 분석하여 적합한 제품을 추천합니다"}</p>
              </div>
            ) : (
              <>
                {threadSummary && (
                  <div className="rounded border border-amber-200 bg-amber-50/80 dark:bg-amber-900/20 p-2 text-xs text-amber-800 dark:text-amber-300" data-testid="text-thread-summary">
                    <span className="font-medium"><Brain className="h-3 w-3 inline mr-1" />고객 니즈:</span> {threadSummary}
                  </div>
                )}
                <div className="space-y-1.5">
                  {recommendations.map((rec) => (
                    <div key={rec.productId} className="space-y-0.5">
                      <ProductCard product={rec.product} channel={channel} profileId={profile.id} onInsertToDraft={onInsertToDraft} />
                      <div className="flex items-center gap-1 px-0.5">
                        <div className="flex shrink-0">
                          {Array.from({ length: Math.round(rec.confidence * 5) }).map((_, si) => (
                            <Star key={si} className="h-2 w-2 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-[9px] text-muted-foreground truncate">{rec.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="w-full text-[10px] h-6" onClick={() => handleRecommend()} disabled={isLoading} data-testid="button-refresh-recommend">
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "다시 추천"}
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex gap-1.5">
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="제품 검색... (이름, 설명)" className="text-xs h-7 flex-1" data-testid="input-product-search"
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(searchQuery); }} />
              <Button size="sm" variant="outline" className="h-7 px-2 shrink-0" disabled={isSearching} onClick={() => handleSearch(searchQuery)} data-testid="button-search-products">
                {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </div>
            {searchResults.length > 0 ? (
              <div className="space-y-1.5">
                {searchResults.slice(0, 6).map(p => (
                  <ProductCard key={p.id} product={p} channel={channel} profileId={profile.id} onInsertToDraft={onInsertToDraft} />
                ))}
              </div>
            ) : searchQuery && !isSearching ? (
              <p className="text-xs text-muted-foreground text-center py-3">검색 결과 없음</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const loginMutation = useMutation({
    mutationFn: async (pw: string) => { await apiRequest("POST", "/api/admin/login", { password: pw }); },
    onSuccess: () => onLogin(),
    onError: () => toast({ title: "비밀번호가 올바르지 않습니다", variant: "destructive" }),
  });
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50 dark:from-stone-900 dark:to-stone-800">
      <Card className="w-full max-w-md" data-testid="admin-login-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">SpoiltDogs 관리자</CardTitle>
          <p className="text-sm text-muted-foreground">관리자 비밀번호를 입력하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(password); }} className="space-y-4">
            <Input type="password" placeholder="관리자 비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-admin-password" />
            <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-admin-login">
              {loginMutation.isPending ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AiSummaryCard({ message }: { message: Message }) {
  const [analysis, setAnalysis] = useState<{ koreanSummary: string; mood: string; moodEmoji: string; suggestedAction: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await apiRequest("POST", "/api/admin/ai/analyze-message", { messageBody: message.body, subject: message.subject });
      setAnalysis(await res.json());
    } catch { toast({ title: "AI 분석 실패", variant: "destructive" }); }
    finally { setIsAnalyzing(false); }
  };
  if (!analysis) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAnalyze(); }} disabled={isAnalyzing}
            className="text-xs border-purple-200 text-purple-700 h-6 w-6 p-0" data-testid={`button-analyze-${message.id}`}>
            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>AI 요약</p></TooltipContent>
      </Tooltip>
    );
  }
  return (
    <div className="mt-1.5 rounded border border-purple-200 bg-purple-50/80 dark:bg-purple-950/30 p-2 text-xs space-y-0.5" data-testid={`analysis-result-${message.id}`}>
      <span className="font-medium text-purple-700">{analysis.moodEmoji} {analysis.mood}</span>
      <p className="text-muted-foreground leading-snug">{analysis.koreanSummary}</p>
      <p className="text-purple-600"><span className="font-medium">권장:</span> {analysis.suggestedAction}</p>
    </div>
  );
}

function AiTranslateButton({ message }: { message: Message }) {
  const [translation, setTranslation] = useState<{ translated: string; detectedLang: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();
  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const res = await apiRequest("POST", "/api/admin/ai/translate", { text: message.body, targetLang: "ko" });
      setTranslation(await res.json());
    } catch { toast({ title: "번역 실패", variant: "destructive" }); }
    finally { setIsTranslating(false); }
  };
  if (!translation) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleTranslate(); }} disabled={isTranslating}
            className="text-xs border-indigo-200 text-indigo-700 h-6 w-6 p-0" data-testid={`button-translate-${message.id}`}>
            {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>AI 번역</p></TooltipContent>
      </Tooltip>
    );
  }
  return (
    <div className="mt-1.5 rounded border border-indigo-200 bg-indigo-50/80 dark:bg-indigo-950/30 p-2 text-xs space-y-0.5" data-testid={`translate-result-${message.id}`}>
      <span className="font-medium text-indigo-700"><Languages className="h-3 w-3 inline mr-1" />{translation.detectedLang} → 한국어</span>
      <p className="text-muted-foreground leading-snug whitespace-pre-wrap">{translation.translated}</p>
    </div>
  );
}

function AiRecommendButton({ message, onRecommend }: { message: Message; onRecommend: (msg: Message) => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onRecommend(message); }}
          className="text-xs border-amber-200 text-amber-700 h-6 w-6 p-0" data-testid={`button-recommend-${message.id}`}>
          <ShoppingBag className="h-3 w-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top"><p>이 메시지 기반 제품 추천</p></TooltipContent>
    </Tooltip>
  );
}

function ChatBubble({ msg, isOutgoing, onReply, onRecommend }: {
  msg: Message; isOutgoing: boolean; onReply: (msg: Message) => void; onRecommend: (msg: Message) => void;
}) {
  const config = CHANNEL_CONFIG.chat;
  const ChannelIcon = config.icon;
  const { displayText, card } = useMemo(() => parsePCARD(msg.body), [msg.body]);
  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`} data-testid={`bubble-chat-${msg.id}`}>
      <div className={`max-w-[75%] rounded-2xl border px-3.5 py-2.5 space-y-1
        ${isOutgoing ? config.bubbleOutgoing : config.bubbleIncoming}
        ${isOutgoing ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.badgeClass}`}>
            <ChannelIcon className="h-3 w-3" /> Live Chat
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">{fmtTime(msg.createdAt)}</span>
        </div>
        {displayText && <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>}
        {card && <ProductCardInBubble card={card} />}
        <div className="flex items-center gap-1">
          <AiSummaryCard message={msg} />
          <AiTranslateButton message={msg} />
          <AiRecommendButton message={msg} onRecommend={onRecommend} />
        </div>
        {!isOutgoing && (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-100"
              onClick={(e) => { e.stopPropagation(); onReply(msg); }} data-testid={`button-bubble-reply-${msg.id}`}>
              <Reply className="h-3 w-3 mr-0.5" /> 답장
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmailBubble({ msg, isOutgoing, onViewFull, onReply, onRecommend }: {
  msg: Message; isOutgoing: boolean;
  onViewFull: (msg: Message) => void; onReply: (msg: Message) => void; onRecommend: (msg: Message) => void;
}) {
  const config = CHANNEL_CONFIG.email;
  const ChannelIcon = config.icon;
  const preview = useMemo(() => {
    const text = stripHtml(msg.body);
    return text.length > 120 ? text.slice(0, 120) + "..." : text;
  }, [msg.body]);

  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`} data-testid={`bubble-email-${msg.id}`}>
      <div className={`max-w-[85%] rounded-2xl border px-4 py-3 space-y-1.5 transition-shadow hover:shadow-md
        ${isOutgoing ? config.bubbleOutgoing : config.bubbleIncoming}
        ${isOutgoing ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.badgeClass}`}>
            <ChannelIcon className="h-3 w-3" /> Email
          </span>
          <span className="text-[10px] text-muted-foreground">{isOutgoing ? "발송" : "수신"}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">{fmtTime(msg.createdAt)}</span>
        </div>

        {msg.subject && (
          <p className="text-sm font-semibold leading-tight">{msg.subject}</p>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed">{preview}</p>

        <div className="flex items-center gap-1 flex-wrap">
          <AiSummaryCard message={msg} />
          <AiTranslateButton message={msg} />
          <AiRecommendButton message={msg} onRecommend={onRecommend} />
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            onClick={(e) => { e.stopPropagation(); onViewFull(msg); }} data-testid={`button-view-full-${msg.id}`}>
            <Eye className="h-3 w-3 mr-1" /> 전체 보기
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            onClick={(e) => { e.stopPropagation(); onReply(msg); }} data-testid={`button-bubble-reply-${msg.id}`}>
            <Reply className="h-3 w-3 mr-1" /> 답장
          </Button>
        </div>
      </div>
    </div>
  );
}

function WhatsAppBubble({ msg, isOutgoing, onReply, onRecommend }: {
  msg: Message; isOutgoing: boolean; onReply: (msg: Message) => void; onRecommend: (msg: Message) => void;
}) {
  const config = CHANNEL_CONFIG.whatsapp;
  const ChannelIcon = config.icon;
  const { displayText, card } = useMemo(() => {
    const parsed = parsePCARD(msg.body);
    return { displayText: stripHtml(parsed.displayText), card: parsed.card };
  }, [msg.body]);

  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`} data-testid={`bubble-whatsapp-${msg.id}`}>
      <div className={`max-w-[75%] rounded-2xl border px-3.5 py-2.5 space-y-1
        ${isOutgoing ? config.bubbleOutgoing : config.bubbleIncoming}
        ${isOutgoing ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.badgeClass}`}>
            <ChannelIcon className="h-3 w-3" /> WhatsApp
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">{fmtTime(msg.createdAt)}</span>
        </div>
        {displayText && <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>}
        {card && <ProductCardInBubble card={card} />}
        <div className="flex items-center gap-1 flex-wrap">
          <AiSummaryCard message={msg} />
          <AiTranslateButton message={msg} />
          <AiRecommendButton message={msg} onRecommend={onRecommend} />
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 text-green-600 hover:text-green-800 hover:bg-green-100"
            onClick={(e) => { e.stopPropagation(); onReply(msg); }} data-testid={`button-bubble-reply-${msg.id}`}>
            <Reply className="h-3 w-3 mr-0.5" /> 답장
          </Button>
        </div>
      </div>
    </div>
  );
}

function SmsBubble({ msg, isOutgoing, onReply, onRecommend }: {
  msg: Message; isOutgoing: boolean; onReply: (msg: Message) => void; onRecommend: (msg: Message) => void;
}) {
  const config = CHANNEL_CONFIG.sms;
  const ChannelIcon = config.icon;
  const { displayText, card } = useMemo(() => {
    const parsed = parsePCARD(msg.body);
    return { displayText: stripHtml(parsed.displayText), card: parsed.card };
  }, [msg.body]);

  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`} data-testid={`bubble-sms-${msg.id}`}>
      <div className={`max-w-[70%] rounded-2xl border px-3.5 py-2.5 space-y-1
        ${isOutgoing ? config.bubbleOutgoing : config.bubbleIncoming}
        ${isOutgoing ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.badgeClass}`}>
            <ChannelIcon className="h-3 w-3" /> SMS
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">{fmtTime(msg.createdAt)}</span>
        </div>
        {displayText && <p className="text-sm leading-relaxed">{displayText}</p>}
        {card && <ProductCardInBubble card={card} />}
        <div className="flex items-center gap-1 flex-wrap">
          <AiSummaryCard message={msg} />
          <AiTranslateButton message={msg} />
          <AiRecommendButton message={msg} onRecommend={onRecommend} />
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            onClick={(e) => { e.stopPropagation(); onReply(msg); }} data-testid={`button-bubble-reply-${msg.id}`}>
            <Reply className="h-3 w-3 mr-0.5" /> 답장
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmailDetailPanel({ message, onClose }: { message: Message; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 w-[480px] max-w-full bg-white dark:bg-stone-800 border-l shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-200" data-testid="panel-email-detail">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold">이메일 상세</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-detail"><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={message.direction === "incoming" ? "secondary" : "default"} className="text-xs">
              {message.direction === "incoming" ? "수신" : "발송"}
            </Badge>
            <span className="text-xs text-muted-foreground">{fmtTime(message.createdAt)}</span>
          </div>
          {message.subject && <h3 className="text-base font-semibold">{message.subject}</h3>}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>보낸 사람: {message.fromEmail}</p>
            <p>받는 사람: {message.toEmail}</p>
            {message.resendId && <p className="font-mono">Resend ID: {message.resendId}</p>}
          </div>
        </div>
        <Separator />
        <SafeHtml html={message.body} className="text-sm leading-relaxed prose prose-sm max-w-none" />
      </div>
    </div>
  );
}

function EmailReplyComposer({ profile, replyTo, onClose, onInsertToDraftRef }: {
  profile: Profile; replyTo?: Message; onClose: () => void;
  onInsertToDraftRef?: React.MutableRefObject<((product: Product) => void) | null>;
}) {
  const { toast } = useToast();
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject.replace(/^Re:\s*/i, "")}` : "");
  const [body, setBody] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [insertedCards, setInsertedCards] = useState<Product[]>([]);

  const insertedCardIdsRef = useRef<Set<string>>(new Set());
  const handleInsertProduct = useCallback((product: Product) => {
    if (insertedCardIdsRef.current.has(product.id)) {
      toast({ title: `"${product.name}" 이미 삽입됨` });
      return;
    }
    insertedCardIdsRef.current.add(product.id);
    setInsertedCards(prev => [...prev, product]);
    toast({ title: `"${product.name}" 이메일에 삽입됨` });
  }, [toast]);

  useEffect(() => {
    if (onInsertToDraftRef) onInsertToDraftRef.current = handleInsertProduct;
    return () => { if (onInsertToDraftRef) onInsertToDraftRef.current = null; };
  }, [handleInsertProduct, onInsertToDraftRef]);

  const buildFinalBody = () => {
    const textHtml = body
      .split("\n")
      .map(line => line.trim() ? `<p style="margin:0 0 8px 0;">${line}</p>` : `<p style="margin:0 0 8px 0;">&nbsp;</p>`)
      .join("");
    if (insertedCards.length === 0) return textHtml;
    const cardsHtml = `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:16px;padding-top:12px;border-top:1px solid #e5e0d8;">${insertedCards.map(p => buildCompactEmailCardHtml(p)).join("")}</div>`;
    return textHtml + cardsHtml;
  };

  const sendMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string; profileId?: string }) => {
      await apiRequest("POST", "/api/admin/messages/send", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/profile", profile.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      onClose();
      toast({ title: "이메일이 발송되었습니다" });
    },
    onError: () => toast({ title: "이메일 발송 실패", variant: "destructive" }),
  });

  const handleDraft = async () => {
    setIsDrafting(true);
    try {
      const res = await apiRequest("POST", "/api/admin/ai/draft-email", {
        instruction: aiInstruction, customerName: profile.name, customerEmail: profile.email,
        dogName: profile.dogName, dogBreed: profile.dogBreed, dogAge: profile.dogAge,
      });
      const draft = await res.json();
      if (draft.subject) setSubject(draft.subject);
      if (draft.body) setBody(draft.body);
      toast({ title: "AI 초안 생성 완료" });
    } catch { toast({ title: "AI 초안 생성 실패", variant: "destructive" }); }
    finally { setIsDrafting(false); }
  };

  return (
    <div className="border-t bg-white dark:bg-stone-800 p-3 space-y-2.5 shrink-0" data-testid="composer-email">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
          <Mail className="h-4 w-4" />
          <span>이메일 답장: {profile.email}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose} data-testid="button-close-reply"><X className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-700"><Wand2 className="h-3 w-3" /> AI 초안</div>
        <div className="flex gap-1.5">
          <Input value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} placeholder="한국어 지시: 배송 안내, 감사 인사 등" className="bg-white text-xs h-7" data-testid="input-reply-ai-instruction" />
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 h-7 px-2 shrink-0" disabled={isDrafting || !aiInstruction.trim()} onClick={handleDraft} data-testid="button-reply-ai-draft">
            {isDrafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); sendMutation.mutate({ to: profile.email, subject, body: buildFinalBody(), profileId: profile.id }); }} className="space-y-1.5">
        <div className="flex flex-col sm:flex-row gap-1.5">
          <Input value={profile.email} disabled className="text-xs h-7 sm:w-40 shrink-0 opacity-60" />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="제목" className="text-xs h-7" data-testid="input-email-subject" />
        </div>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={3} placeholder="내용 (HTML 지원)" className="text-xs" data-testid="input-email-body" />
        {insertedCards.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-2 space-y-1.5" data-testid="draft-inserted-cards">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-700">
              <ShoppingBag className="h-3 w-3" />
              <span>삽입된 제품 카드 ({insertedCards.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {insertedCards.map(p => (
                <div key={p.id} className="flex items-center gap-1 rounded border border-blue-200 bg-white dark:bg-stone-700 px-1.5 py-0.5" data-testid={`draft-card-${p.id}`}>
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-5 h-5 rounded object-cover" />}
                  <span className="text-[10px] font-medium truncate max-w-[100px]">{p.name}</span>
                  <span className="text-[9px] text-amber-700 font-bold">${(p.priceAud / 100).toFixed(2)}</span>
                  <Button type="button" size="sm" variant="ghost" className="h-4 w-4 p-0 text-red-500 hover:text-red-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const removeId = p.id; insertedCardIdsRef.current.delete(removeId); setInsertedCards(prev => prev.filter(x => x.id !== removeId)); }} data-testid={`button-remove-card-${p.id}`}>
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={sendMutation.isPending} className="h-7 text-xs" data-testid="button-send-email">
            <Send className="h-3 w-3 mr-1" /> {sendMutation.isPending ? "발송 중..." : "이메일 발송"}
          </Button>
          {insertedCards.length > 0 && (
            <span className="text-[9px] text-blue-600">{insertedCards.length}개 제품 카드 포함</span>
          )}
        </div>
      </form>
    </div>
  );
}

function detectIsKorean(text: string): boolean {
  const koreanChars = text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g);
  return !!koreanChars && koreanChars.length >= text.replace(/\s/g, "").length * 0.3;
}

function QuickChatComposer({ profile, channel, onClose, onSlashRecommend }: { profile: Profile; channel: Channel; onClose: () => void; onSlashRecommend?: (keyword: string) => void }) {
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const config = CHANNEL_CONFIG[channel];
  const ChannelIcon = config.icon;
  const isKorean = detectIsKorean(text);

  const handleAiProcess = async () => {
    if (!text.trim()) return;
    if (text.startsWith("/recommend")) {
      const keyword = text.replace(/^\/recommend\s*/, "").trim();
      onSlashRecommend?.(keyword);
      setText("");
      return;
    }
    setIsProcessing(true);
    try {
      const payload = isKorean
        ? { text: text.trim(), targetLang: "en", tone: "chat" }
        : { text: text.trim(), targetLang: "en", tone: "refine" };
      const res = await apiRequest("POST", "/api/admin/ai/translate", payload);
      const data = await res.json();
      if (data.translated) setText(data.translated);
    } catch { toast({ title: "AI 처리 실패", variant: "destructive" }); }
    finally { setIsProcessing(false); }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    toast({ title: `${config.label} 연동 준비 중` });
    setText("");
  };

  return (
    <div className="border-t bg-white dark:bg-stone-800 shrink-0" data-testid={`composer-${channel}`}>
      <SlashCommandHint text={text} onTrigger={(kw) => { onSlashRecommend?.(kw); setText(""); }} />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <ChannelIcon className={`h-4 w-4 ${config.accentColor}`} />
          <span className="text-xs font-medium">{config.label} 빠른 답장</span>
          <span className="text-[9px] text-muted-foreground ml-1">Enter: AI | Shift+Enter: 전송 | /recommend</span>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={onClose} data-testid="button-close-reply"><X className="h-3 w-3" /></Button>
        </div>
        <div className="flex gap-1.5">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지 입력 | /recommend [키워드]" className="text-sm h-8 flex-1" data-testid={`input-quick-${channel}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiProcess(); }
              else if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); handleSend(); }
            }} />
          <Button size="sm" variant="outline" className="h-8 px-2 shrink-0 text-[10px] border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            disabled={!text.trim() || isProcessing} onClick={handleAiProcess} data-testid={`button-ai-process-${channel}`}>
            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : isKorean ? <><Languages className="h-3 w-3 mr-0.5" /> EN</> : <><Sparkles className="h-3 w-3 mr-0.5" /> Refine</>}
          </Button>
          <Button size="sm" className="h-8 px-3 shrink-0" disabled={!text.trim()}
            onClick={handleSend} data-testid={`button-send-${channel}`}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SlashCommandHint({ text, onTrigger }: { text: string; onTrigger: (keyword: string) => void }) {
  if (!text.startsWith("/recommend")) return null;
  const keyword = text.replace(/^\/recommend\s*/, "");
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b text-xs" data-testid="slash-command-hint">
      <ShoppingBag className="h-3 w-3 text-amber-600" />
      <span className="text-amber-800 dark:text-amber-300">/recommend {keyword || "..."}</span>
      <span className="text-muted-foreground">Enter 를 눌러 제품 검색</span>
      {keyword.trim() && (
        <Button size="sm" variant="outline" className="h-5 text-[10px] px-1.5 ml-auto border-amber-200 text-amber-700" onClick={() => onTrigger(keyword)} data-testid="button-slash-search">
          <Search className="h-2.5 w-2.5 mr-0.5" /> 검색
        </Button>
      )}
    </div>
  );
}

function LiveChatComposer({ profile, socket, onClose, onSlashRecommend }: { profile: Profile; socket: Socket | null; onClose: () => void; onSlashRecommend?: (keyword: string) => void }) {
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const config = CHANNEL_CONFIG.chat;
  const ChannelIcon = config.icon;
  const isKorean = detectIsKorean(text);

  const handleSend = () => {
    if (!text.trim() || !socket) return;
    socket.emit("admin:reply", { profileId: profile.id, text: text.trim() });
    setText("");
  };

  const handleAiProcess = async () => {
    if (!text.trim()) return;
    if (text.startsWith("/recommend")) {
      const keyword = text.replace(/^\/recommend\s*/, "").trim();
      onSlashRecommend?.(keyword);
      setText("");
      return;
    }
    setIsProcessing(true);
    try {
      const payload = isKorean
        ? { text: text.trim(), targetLang: "en", tone: "chat" }
        : { text: text.trim(), targetLang: "en", tone: "refine" };
      const res = await apiRequest("POST", "/api/admin/ai/translate", payload);
      const data = await res.json();
      if (data.translated) setText(data.translated);
    } catch { toast({ title: "AI 처리 실패", variant: "destructive" }); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="border-t bg-white dark:bg-stone-800 shrink-0" data-testid="composer-chat">
      <SlashCommandHint text={text} onTrigger={(kw) => { onSlashRecommend?.(kw); setText(""); }} />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <ChannelIcon className={`h-4 w-4 ${config.accentColor}`} />
          <span className="text-xs font-medium">Live Chat 답장</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground mr-1">Enter: AI | Shift+Enter: 전송 | /recommend</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-green-600"><Zap className="h-3 w-3" /> 실시간</span>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClose} data-testid="button-close-reply"><X className="h-3 w-3" /></Button>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지 입력 | /recommend [키워드]" className="text-sm h-8 flex-1" data-testid="input-live-chat"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiProcess(); }
              else if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); handleSend(); }
            }} />
          <Button size="sm" variant="outline" className="h-8 px-2 shrink-0 text-[10px] border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            disabled={!text.trim() || isProcessing} onClick={handleAiProcess} data-testid="button-ai-process-chat">
            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : isKorean ? <><Languages className="h-3 w-3 mr-0.5" /> EN</> : <><Sparkles className="h-3 w-3 mr-0.5" /> Refine</>}
          </Button>
          <Button size="sm" className="h-8 px-3 shrink-0 bg-orange-600 hover:bg-orange-700" disabled={!text.trim() || !socket}
            onClick={handleSend} data-testid="button-send-chat">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function GlobalOverview({ allMessages, orders, profiles, onSelectProfile, onUpdateOrder }: {
  allMessages: Message[]; orders: Order[]; profiles: Profile[];
  onSelectProfile: (id: string) => void; onUpdateOrder: (id: string, status: string) => void;
}) {
  const [tab, setTab] = useState<"messages" | "orders">("messages");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b bg-white dark:bg-stone-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h2 className="text-sm font-semibold">전체 보기</h2>
        <div className="flex gap-1 ml-auto">
          <Button size="sm" variant={tab === "messages" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => setTab("messages")} data-testid="button-global-messages">
            <Mail className="h-3.5 w-3.5 mr-1" /> 메시지 ({allMessages.length})
          </Button>
          <Button size="sm" variant={tab === "orders" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => setTab("orders")} data-testid="button-global-orders">
            <ShoppingCart className="h-3.5 w-3.5 mr-1" /> 주문 ({orders.length})
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tab === "messages" ? (
          allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Mail className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm">아직 메시지가 없습니다</p>
            </div>
          ) : (
            allMessages.map(msg => {
              const profile = profiles.find(p => p.id === msg.profileId);
              const channel = inferChannel(msg);
              const config = CHANNEL_CONFIG[channel];
              const ChannelIcon = config.icon;
              const isExpanded = expandedId === msg.id;
              const { displayText: cleanBody, card: msgCard } = parsePCARD(msg.body);
              const preview = stripHtml(cleanBody);
              return (
                <div key={msg.id} className={`rounded-xl border cursor-pointer transition-all ${config.bubbleIncoming} ${isExpanded ? "ring-1 ring-primary" : "hover:shadow-sm"}`}
                  onClick={() => setExpandedId(isExpanded ? null : msg.id)} data-testid={`global-message-${msg.id}`}>
                  <div className="px-4 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.badgeClass}`}>
                        <ChannelIcon className="h-3 w-3" /> {config.label}
                      </span>
                      <Badge variant={msg.direction === "incoming" ? "secondary" : "default"} className="text-[10px] h-5">{msg.direction === "incoming" ? "수신" : "발송"}</Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{fmtTime(msg.createdAt)}</span>
                    </div>
                    {msg.subject && <p className="text-sm font-medium truncate">{msg.subject}</p>}
                    {msgCard ? (
                      <p className="text-xs text-muted-foreground truncate">[상품 카드] {msgCard.name} — {msgCard.price}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate">{preview.slice(0, 100)}</p>
                    )}
                    <div className="text-[10px] text-muted-foreground flex gap-3 mt-1">
                      {profile && (
                        <button className="text-blue-600 hover:underline" onClick={(e) => { e.stopPropagation(); onSelectProfile(profile.id); }} data-testid={`link-profile-${msg.id}`}>
                          {profile.name || profile.email}
                        </button>
                      )}
                      <span>{msg.fromEmail} → {msg.toEmail}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                      {msgCard ? (
                        <div className="space-y-2">
                          {cleanBody && <SafeHtml html={cleanBody} className="text-sm p-3 rounded bg-white/80 dark:bg-stone-900/50" />}
                          <ProductCardInBubble card={msgCard} />
                        </div>
                      ) : (
                        <SafeHtml html={msg.body} className="text-sm p-3 rounded bg-white/80 dark:bg-stone-900/50 max-h-64 overflow-y-auto" />
                      )}
                      <AiSummaryCard message={msg} />
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm">아직 주문이 없습니다</p>
            </div>
          ) : (
            orders.map(order => {
              const profile = profiles.find(p => p.email === order.customerEmail);
              return (
                <div key={order.id} className="rounded-lg border bg-white dark:bg-stone-800 px-3 md:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3" data-testid={`global-order-${order.id}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Package className="h-4 w-4 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono">#{order.id.slice(0, 8)}</span>
                        {profile && (
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => onSelectProfile(profile.id)} data-testid={`link-order-profile-${order.id}`}>
                            {profile.name || profile.email}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">${(order.totalAud / 100).toFixed(2)} · {order.petName || "—"} · {fmtDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-6 sm:ml-0 shrink-0">
                    <select className="text-xs border rounded px-2 py-1" value={order.status} onChange={(e) => onUpdateOrder(order.id, e.target.value)} data-testid={`global-select-status-${order.id}`}>
                      <option value="pending">대기중</option>
                      <option value="paid">결제완료</option>
                      <option value="shipped">배송중</option>
                      <option value="complete">완료</option>
                      <option value="cancelled">취소됨</option>
                    </select>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>{STATUS_LABELS[order.status] || order.status}</span>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function AdminCRM() {
  const isMobile = useIsMobile();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(window.innerWidth < 768);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ email: "", name: "", dogName: "", dogBreed: "", dogAge: "", notes: "" });
  const socketRef = useRef<Socket | null>(null);
  const timelineEndRef = useRef<HTMLDivElement>(null);
  const [editNotes, setEditNotes] = useState("");
  const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [detailMessage, setDetailMessage] = useState<Message | null>(null);
  const [replyState, setReplyState] = useState<{ channel: Channel; replyTo?: Message } | null>(null);
  const [showProductPanel, setShowProductPanel] = useState(false);
  const [slashSearchKeyword, setSlashSearchKeyword] = useState("");
  const [focusRecommendMessage, setFocusRecommendMessage] = useState<Message | null>(null);
  const emailInsertRef = useRef<((product: Product) => void) | null>(null);
  const { toast } = useToast();

  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/me"], queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"], queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated || !!authStatus?.isAdmin,
  });
  const { data: profiles } = useQuery<Profile[]>({
    queryKey: ["/api/admin/profiles"], queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated || !!authStatus?.isAdmin,
  });
  const { data: allMessages } = useQuery<Message[]>({
    queryKey: ["/api/admin/messages"], queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated || !!authStatus?.isAdmin,
  });
  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"], queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated || !!authStatus?.isAdmin,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/admin/logout"); },
    onSuccess: () => { setIsAuthenticated(false); queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] }); toast({ title: "로그아웃" }); },
  });
  const addCustomerMutation = useMutation({
    mutationFn: async (data: typeof newCustomer) => { await apiRequest("POST", "/api/admin/profiles", data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setShowAddCustomer(false); setNewCustomer({ email: "", name: "", dogName: "", dogBreed: "", dogAge: "", notes: "" });
      toast({ title: "고객 추가 완료" });
    },
    onError: () => toast({ title: "고객 추가 실패", variant: "destructive" }),
  });
  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => { await apiRequest("PATCH", `/api/admin/profiles/${id}`, { notes }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/profiles"] }); toast({ title: "메모 저장 완료" }); },
    onError: () => toast({ title: "메모 저장 실패", variant: "destructive" }),
  });
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { await apiRequest("PATCH", `/api/admin/orders/${id}/status`, { status }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "주문 상태 변경 완료" });
    },
    onError: () => toast({ title: "주문 상태 변경 실패", variant: "destructive" }),
  });

  const selectedProfile = profiles?.find(p => p.id === selectedProfileId) || null;
  const profileMessages = useMemo(() => allMessages?.filter(m => m.profileId === selectedProfileId) || [], [allMessages, selectedProfileId]);
  const profileOrders = useMemo(() => orders?.filter(o => o.customerEmail === selectedProfile?.email) || [], [orders, selectedProfile]);

  const conversationGroups = useMemo(() => {
    if (!allMessages || !profiles) return [];
    const grouped = new Map<string, { profile: Profile; messages: Message[]; latestAt: string }>();
    for (const msg of allMessages) {
      if (!msg.profileId) continue;
      const profile = profiles.find(p => p.id === msg.profileId);
      if (!profile) continue;
      const existing = grouped.get(msg.profileId);
      if (existing) {
        existing.messages.push(msg);
        if (msg.createdAt && msg.createdAt > existing.latestAt) existing.latestAt = msg.createdAt;
      } else {
        grouped.set(msg.profileId, { profile, messages: [msg], latestAt: msg.createdAt || "" });
      }
    }
    const noMsgProfiles = profiles.filter(p => !grouped.has(p.id));
    for (const p of noMsgProfiles) {
      grouped.set(p.id, { profile: p, messages: [], latestAt: p.createdAt || "" });
    }
    return Array.from(grouped.values()).sort((a, b) => (b.latestAt > a.latestAt ? 1 : -1));
  }, [allMessages, profiles]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return conversationGroups;
    const q = searchQuery.toLowerCase();
    return conversationGroups.filter(g =>
      g.profile.email.toLowerCase().includes(q) ||
      (g.profile.name && g.profile.name.toLowerCase().includes(q)) ||
      (g.profile.dogName && g.profile.dogName.toLowerCase().includes(q)) ||
      g.messages.some(m => m.subject?.toLowerCase().includes(q))
    );
  }, [conversationGroups, searchQuery]);

  const timeline = useMemo(() => {
    const items: Array<{ type: "message"; data: Message; at: string } | { type: "order"; data: Order; at: string }> = [];
    for (const m of profileMessages) items.push({ type: "message", data: m, at: m.createdAt || "" });
    for (const o of profileOrders) items.push({ type: "order", data: o, at: o.createdAt || "" });
    items.sort((a, b) => (a.at > b.at ? 1 : -1));
    return items;
  }, [profileMessages, profileOrders]);

  const handleViewFull = useCallback((msg: Message) => setDetailMessage(msg), []);
  const handleBubbleReply = useCallback((msg: Message) => {
    const channel = inferChannel(msg);
    setReplyState({ channel, replyTo: msg });
  }, []);
  const handleBubbleRecommend = useCallback((msg: Message) => {
    setShowProductPanel(true);
    setFocusRecommendMessage(msg);
  }, []);

  useEffect(() => {
    if (selectedProfile) setEditNotes(selectedProfile.notes || "");
    setReplyState(null);
    setDetailMessage(null);
    if (selectedProfileId) {
      setUnreadChatIds(prev => {
        if (!prev.has(selectedProfileId)) return prev;
        const next = new Set(prev);
        next.delete(selectedProfileId);
        return next;
      });
    }
  }, [selectedProfileId]);

  const loggedIn = isAuthenticated || authStatus?.isAdmin;

  useEffect(() => {
    if (!loggedIn) return;
    const socket = io(window.location.origin, { path: "/socket.io" });
    socketRef.current = socket;
    socket.on("connect", () => { socket.emit("admin:join"); });
    socket.on("chat:new-message", (data: { message?: Message; profile?: Profile }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      if (data?.message?.profileId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/profile", data.message.profileId] });
      }

      if (data?.message?.direction === "incoming" && data?.message?.status === "chat") {
        playNotificationSound();
        const senderName = data.profile?.name || data.profile?.email || "Unknown";
        toast({
          title: "Live Chat",
          description: (() => {
            const { displayText, card } = parsePCARD(data.message.body || "");
            if (card) return `${senderName}: [상품 카드] ${card.name}`;
            const t = displayText.slice(0, 60);
            return `${senderName}: ${t}${displayText.length > 60 ? "..." : ""}`;
          })(),
        });
        if (data.message.profileId) {
          setUnreadChatIds(prev => {
            const next = new Set(prev);
            next.add(data.message!.profileId!);
            return next;
          });
        }
      }
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [loggedIn]);

  useEffect(() => {
    if (timelineEndRef.current) {
      timelineEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [timeline]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-8 w-48" /></div>;
  if (!loggedIn) return <LoginForm onLogin={() => setIsAuthenticated(true)} />;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-stone-50 dark:bg-stone-900">
      <header className="border-b bg-white dark:bg-stone-800 shrink-0 z-50">
        <div className="px-3 md:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="h-8 px-2 shrink-0 text-muted-foreground hover:text-foreground gap-1" data-testid="button-back-to-admin">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">어드민</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0 shrink-0" onClick={() => setLeftCollapsed(!leftCollapsed)} data-testid="button-mobile-menu">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base md:text-lg font-serif font-bold truncate" data-testid="text-admin-title">SpoiltDogs CRM</h1>
            <div className="hidden md:flex items-center gap-3 ml-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-blue-500" /> {stats?.totalCustomers ?? 0}</span>
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-purple-500" /> {stats?.totalMessages ?? 0}</span>
              <span className="flex items-center gap-1"><ShoppingCart className="h-3.5 w-3.5 text-green-500" /> {stats?.totalOrders ?? 0}</span>
              <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-amber-500" /> ${((stats?.totalRevenue ?? 0) / 100).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isMobile && selectedProfile && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setRightCollapsed(!rightCollapsed)} data-testid="button-mobile-profile">
                <UserCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isMobile && !leftCollapsed && (
          <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setLeftCollapsed(true)} />
        )}
        {/* LEFT: Conversation List */}
        <div className={`border-r bg-white dark:bg-stone-800 flex flex-col shrink-0 transition-all duration-200
          ${isMobile
            ? `fixed inset-y-0 left-0 z-40 w-[85vw] max-w-xs shadow-2xl ${leftCollapsed ? "-translate-x-full" : "translate-x-0"} transition-transform`
            : `${leftCollapsed ? "w-12" : "w-72"}`
          }`} style={isMobile ? { top: "49px" } : undefined}>
          <div className="flex items-center justify-between p-2 border-b shrink-0">
            {(!leftCollapsed || isMobile) && <span className="text-xs font-semibold text-muted-foreground pl-1">대화 목록</span>}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto hidden md:flex" onClick={() => setLeftCollapsed(!leftCollapsed)} data-testid="button-toggle-left">
              {leftCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            {isMobile && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto" onClick={() => setLeftCollapsed(true)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {!leftCollapsed && (
            <>
              <div className="p-2 border-b shrink-0 space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="고객 검색..." className="h-8 text-xs pl-7" data-testid="input-search" />
                </div>
                <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs" data-testid="button-add-customer"><Plus className="h-3 w-3 mr-1" /> 고객 추가</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>새 고객 추가</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); addCustomerMutation.mutate(newCustomer); }} className="space-y-3">
                      <div><Label>이메일 *</Label><Input type="email" required value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} data-testid="input-customer-email" /></div>
                      <div><Label>이름</Label><Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} data-testid="input-customer-name" /></div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div><Label>반려견</Label><Input value={newCustomer.dogName} onChange={(e) => setNewCustomer({ ...newCustomer, dogName: e.target.value })} data-testid="input-dog-name" /></div>
                        <div><Label>견종</Label><Input value={newCustomer.dogBreed} onChange={(e) => setNewCustomer({ ...newCustomer, dogBreed: e.target.value })} data-testid="input-dog-breed" /></div>
                        <div><Label>나이</Label><Input value={newCustomer.dogAge} onChange={(e) => setNewCustomer({ ...newCustomer, dogAge: e.target.value })} data-testid="input-dog-age" /></div>
                      </div>
                      <div><Label>메모</Label><Textarea value={newCustomer.notes} onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })} data-testid="input-customer-notes" /></div>
                      <Button type="submit" disabled={addCustomerMutation.isPending} data-testid="button-save-customer">{addCustomerMutation.isPending ? "추가 중..." : "고객 추가"}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredGroups.map(({ profile, messages }) => {
                  const lastMsg = messages[0];
                  const unread = messages.filter(m => m.direction === "incoming" && m.status === "received").length;
                  const lastChannel = lastMsg ? inferChannel(lastMsg) : "email";
                  const ChannelIcon = CHANNEL_CONFIG[lastChannel].icon;
                  return (
                    <div
                      key={profile.id}
                      className={`px-3 py-2.5 border-b cursor-pointer hover:bg-accent/50 transition-colors ${selectedProfileId === profile.id ? "bg-accent" : ""}`}
                      onClick={() => { setSelectedProfileId(profile.id); if (isMobile) setLeftCollapsed(true); }}
                      data-testid={`conversation-${profile.id}`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium truncate">{profile.name || profile.email.split("@")[0]}</span>
                        <div className="flex items-center gap-1">
                          {unreadChatIds.has(profile.id) && (
                            <span className="relative flex h-2.5 w-2.5" data-testid={`badge-unread-chat-${profile.id}`}>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
                            </span>
                          )}
                          <ChannelIcon className={`h-3 w-3 ${CHANNEL_CONFIG[lastChannel].accentColor}`} />
                          {unread > 0 && <Badge className="h-5 min-w-[20px] text-[10px] px-1.5">{unread}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {profile.dogName && <span className="flex items-center gap-0.5"><Dog className="h-3 w-3" />{profile.dogName}</span>}
                        <span className="ml-auto">{lastMsg ? fmtTime(lastMsg.createdAt) : ""}</span>
                      </div>
                      {lastMsg && <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg.subject}</p>}
                    </div>
                  );
                })}
                {filteredGroups.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">검색 결과가 없습니다</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* CENTER: Messenger Timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedProfile ? (
            <>
              <div className="border-b bg-white dark:bg-stone-800 px-3 md:px-4 py-2 shrink-0">
                <div className="flex items-center justify-between mb-1.5 md:mb-0">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold truncate">{selectedProfile.name || selectedProfile.email}</h2>
                    <p className="text-xs text-muted-foreground truncate">{selectedProfile.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 hidden md:flex" onClick={() => setRightCollapsed(!rightCollapsed)} data-testid="button-toggle-right">
                    {rightCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
                  <Button size="sm" variant={replyState?.channel === "email" ? "default" : "outline"} className="h-7 text-xs gap-1 border-blue-200 text-blue-700 shrink-0"
                    onClick={() => setReplyState({ channel: "email" })} data-testid="button-reply-email">
                    <Mail className="h-3 w-3" /> <span className="hidden sm:inline">이메일</span>
                  </Button>
                  <Button size="sm" variant={replyState?.channel === "chat" ? "default" : "outline"} className="h-7 text-xs gap-1 border-orange-200 text-orange-700 shrink-0"
                    onClick={() => setReplyState({ channel: "chat" })} data-testid="button-reply-chat">
                    <Radio className="h-3 w-3" /> Chat
                  </Button>
                  <Button size="sm" variant={replyState?.channel === "whatsapp" ? "default" : "outline"} className="h-7 text-xs gap-1 border-green-200 text-green-700 shrink-0"
                    onClick={() => setReplyState({ channel: "whatsapp" })} data-testid="button-reply-whatsapp">
                    <MessageCircle className="h-3 w-3" /> <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                  <Button size="sm" variant={replyState?.channel === "sms" ? "default" : "outline"} className="h-7 text-xs gap-1 border-gray-200 text-gray-700 shrink-0"
                    onClick={() => setReplyState({ channel: "sms" })} data-testid="button-reply-sms">
                    <Phone className="h-3 w-3" /> SMS
                  </Button>
                  <Separator orientation="vertical" className="h-5 mx-0.5 shrink-0" />
                  <Button size="sm" variant={showProductPanel ? "default" : "outline"} className="h-7 text-xs gap-1 border-amber-200 text-amber-700 shrink-0"
                    onClick={() => setShowProductPanel(!showProductPanel)} data-testid="button-toggle-products">
                    <ShoppingBag className="h-3 w-3" /> <span className="hidden sm:inline">제품</span>
                  </Button>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto px-2 md:px-4 py-3 space-y-2.5 ${showProductPanel ? "max-h-[50%]" : ""}`} style={{ background: "linear-gradient(180deg, hsl(40 20% 97%) 0%, hsl(40 15% 95%) 100%)" }}>
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-3 opacity-40" />
                    <p className="text-sm">아직 대화 기록이 없습니다</p>
                  </div>
                ) : (
                  timeline.map((item) => {
                    if (item.type === "order") {
                      const order = item.data;
                      return (
                        <div key={`order-${order.id}`} className="flex justify-center" data-testid={`timeline-order-${order.id}`}>
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-stone-800/80 border text-xs text-muted-foreground shadow-sm">
                            <Package className="h-3.5 w-3.5 text-blue-500" />
                            <span>주문 #{order.id.slice(0, 8)}</span>
                            <span className="font-medium">${(order.totalAud / 100).toFixed(2)}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                            <span>{fmtTime(order.createdAt)}</span>
                          </div>
                        </div>
                      );
                    }
                    const msg = item.data;
                    const isOutgoing = msg.direction === "outgoing";
                    const channel = inferChannel(msg);

                    if (channel === "chat") {
                      return <ChatBubble key={`msg-${msg.id}`} msg={msg} isOutgoing={isOutgoing} onReply={handleBubbleReply} onRecommend={handleBubbleRecommend} />;
                    }
                    if (channel === "whatsapp") {
                      return <WhatsAppBubble key={`msg-${msg.id}`} msg={msg} isOutgoing={isOutgoing} onReply={handleBubbleReply} onRecommend={handleBubbleRecommend} />;
                    }
                    if (channel === "sms") {
                      return <SmsBubble key={`msg-${msg.id}`} msg={msg} isOutgoing={isOutgoing} onReply={handleBubbleReply} onRecommend={handleBubbleRecommend} />;
                    }
                    return <EmailBubble key={`msg-${msg.id}`} msg={msg} isOutgoing={isOutgoing} onViewFull={handleViewFull} onReply={handleBubbleReply} onRecommend={handleBubbleRecommend} />;
                  })
                )}
                <div ref={timelineEndRef} />
              </div>

              {showProductPanel && selectedProfile && (
                <ProductRecommendationPanel
                  messages={profileMessages}
                  profile={selectedProfile}
                  channel={replyState?.channel}
                  slashKeyword={slashSearchKeyword}
                  onSlashConsumed={() => setSlashSearchKeyword("")}
                  focusMessage={focusRecommendMessage}
                  onFocusConsumed={() => setFocusRecommendMessage(null)}
                  onInsertToDraft={replyState?.channel === "email" ? (product: Product) => { emailInsertRef.current?.(product); } : undefined}
                />
              )}

              {replyState && selectedProfile && (
                replyState.channel === "email" ? (
                  <EmailReplyComposer profile={selectedProfile} replyTo={replyState.replyTo} onClose={() => setReplyState(null)} onInsertToDraftRef={emailInsertRef} />
                ) : replyState.channel === "chat" ? (
                  <LiveChatComposer profile={selectedProfile} socket={socketRef.current} onClose={() => setReplyState(null)} onSlashRecommend={(kw) => { setShowProductPanel(true); setSlashSearchKeyword(kw); }} />
                ) : (
                  <QuickChatComposer profile={selectedProfile} channel={replyState.channel} onClose={() => setReplyState(null)} onSlashRecommend={(kw) => { setShowProductPanel(true); setSlashSearchKeyword(kw); }} />
                )
              )}
            </>
          ) : (
            <GlobalOverview
              allMessages={allMessages || []}
              orders={orders || []}
              profiles={profiles || []}
              onSelectProfile={(id) => setSelectedProfileId(id)}
              onUpdateOrder={(id, status) => updateOrderMutation.mutate({ id, status })}
            />
          )}
        </div>

        {/* RIGHT: Profile & Orders Panel */}
        {isMobile && selectedProfile && !rightCollapsed && (
          <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setRightCollapsed(true)} />
        )}
        {selectedProfile && !rightCollapsed && (
          <div className={`border-l bg-white dark:bg-stone-800 flex flex-col shrink-0 overflow-y-auto
            ${isMobile
              ? "fixed inset-y-0 right-0 z-40 w-[85vw] max-w-xs shadow-2xl"
              : "w-80"
            }`} style={isMobile ? { top: "49px" } : undefined}>
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                  {(selectedProfile.name || selectedProfile.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{selectedProfile.name || selectedProfile.email.split("@")[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedProfile.email}</p>
                </div>
                {isMobile && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setRightCollapsed(true)} data-testid="button-close-right-panel-mobile">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground">주문</p>
                  <p className="font-semibold text-base">{selectedProfile.totalOrders}건</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground">결제액</p>
                  <p className="font-semibold text-base">${(selectedProfile.totalSpentAud / 100).toFixed(2)}</p>
                </div>
              </div>
              {selectedProfile.dogName && (
                <div className="flex items-center gap-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 text-sm">
                  <Dog className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="font-medium">{selectedProfile.dogName}</span>
                  {selectedProfile.dogBreed && <span className="text-muted-foreground">({selectedProfile.dogBreed})</span>}
                  {selectedProfile.dogAge && <span className="text-muted-foreground">, {selectedProfile.dogAge}</span>}
                </div>
              )}
              {(() => {
                try {
                  const prefs = selectedProfile.preferences ? JSON.parse(selectedProfile.preferences) : null;
                  const aliases: string[] = prefs?.aliases || [];
                  if (aliases.length === 0) return null;
                  return (
                    <div className="text-xs space-y-1">
                      <span className="text-muted-foreground font-medium">연결된 이메일:</span>
                      {aliases.map((a: string) => <p key={a} className="text-muted-foreground truncate pl-2">{a}</p>)}
                    </div>
                  );
                } catch { return null; }
              })()}
              <ProfileMergeButton profileId={selectedProfile.id} profiles={profiles || []} />
            </div>

            <div className="p-4 border-b space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">관리자 메모</Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => updateNotesMutation.mutate({ id: selectedProfile.id, notes: editNotes })} disabled={updateNotesMutation.isPending} data-testid="button-save-notes">
                  <PencilLine className="h-3 w-3 mr-1" /> 저장
                </Button>
              </div>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="메모를 입력하세요..." rows={2} className="text-xs" data-testid="textarea-notes" />
              <PhoneInput profile={selectedProfile} />
            </div>

            {profileOrders.length > 0 && (
              <div className="p-4 border-b space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">주문 내역</Label>
                <div className="space-y-1.5">
                  {profileOrders.map(order => (
                    <div key={order.id} className="p-2 rounded border text-xs space-y-1" data-testid={`panel-order-${order.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono">#{order.id.slice(0, 8)}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>${(order.totalAud / 100).toFixed(2)}</span>
                        <select className="text-[10px] border rounded px-1 py-0.5" value={order.status} onChange={(e) => updateOrderMutation.mutate({ id: order.id, status: e.target.value })} data-testid={`select-status-${order.id}`}>
                          <option value="pending">대기중</option>
                          <option value="paid">결제완료</option>
                          <option value="shipped">배송중</option>
                          <option value="complete">완료</option>
                          <option value="cancelled">취소됨</option>
                        </select>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(order.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profileMessages.length > 0 && (
              <div className="p-4 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">채널별 메시지 ({profileMessages.length}건)</Label>
                <div className="space-y-1">
                  {profileMessages.slice(0, 10).map(msg => {
                    const channel = inferChannel(msg);
                    const config = CHANNEL_CONFIG[channel];
                    const ChannelIcon = config.icon;
                    return (
                      <div
                        key={msg.id}
                        className="p-1.5 rounded text-xs hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => { if (channel === "email") setDetailMessage(msg); }}
                        data-testid={`panel-msg-${msg.id}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <ChannelIcon className={`h-3 w-3 ${config.accentColor}`} />
                          <Badge variant={msg.direction === "incoming" ? "secondary" : "default"} className="text-[9px] h-4 px-1">
                            {msg.direction === "incoming" ? "수신" : "발송"}
                          </Badge>
                          <span className="truncate">{msg.subject || (() => { const p = parsePCARD(msg.body); return p.card ? `[상품 카드] ${p.card.name}` : stripHtml(p.displayText).slice(0, 40); })()}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 pl-[18px]">{fmtTime(msg.createdAt)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {detailMessage && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[55]" onClick={() => setDetailMessage(null)} />
          <EmailDetailPanel message={detailMessage} onClose={() => setDetailMessage(null)} />
        </>
      )}
      </div>
    </TooltipProvider>
  );
}
