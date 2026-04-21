import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  CheckCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X as XIcon,
  Check,
  RefreshCw,
  AlertCircle,
  Zap,
} from "lucide-react";
import type { ContentScheduleTemplate, ContentScheduleItem } from "@shared/schema";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "threads", label: "Threads" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "text", label: "텍스트" },
  { value: "post", label: "이미지 포스트" },
  { value: "reel", label: "릴스 영상" },
  { value: "story_image", label: "스토리" },
  { value: "tiktok", label: "틱톡 영상" },
  { value: "card_news", label: "카드뉴스" },
  { value: "carousel", label: "캐러셀" },
  { value: "motion_reel", label: "모션 릴" },
];

const PLATFORM_CONTENT_TYPES: Record<string, string[]> = {
  instagram: ["post", "reel", "story_image", "card_news", "carousel", "motion_reel"],
  facebook: ["post", "reel", "story_image", "card_news"],
  tiktok: ["tiktok"],
  threads: ["text", "post", "carousel"],
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-700",
  facebook: "bg-blue-100 text-blue-700",
  tiktok: "bg-gray-100 text-gray-700",
  threads: "bg-purple-100 text-purple-700",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  text: "텍스트",
  post: "포스트",
  reel: "릴스",
  story_image: "스토리",
  tiktok: "틱톡",
  card_news: "카드뉴스",
  carousel: "캐러셀",
  motion_reel: "모션 릴",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-700",
  generating: "bg-blue-100 text-blue-700",
  generated: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  approved: "승인",
  generating: "생성중",
  generated: "생성완료",
  failed: "실패",
};

// ─── Weekly Pattern Tab ──────────────────────────────────
function WeeklyPatternTab() {
  const { toast } = useToast();
  const [newDay, setNewDay] = useState("1");
  const [newPlatform, setNewPlatform] = useState("instagram");
  const [newContentType, setNewContentType] = useState("post");
  const [newTime, setNewTime] = useState("18:00");

  const filteredContentTypes = CONTENT_TYPE_OPTIONS.filter(
    (c) => (PLATFORM_CONTENT_TYPES[newPlatform] || []).includes(c.value)
  );

  const { data: templates = [], isLoading } = useQuery<ContentScheduleTemplate[]>({
    queryKey: ["/api/admin/schedule/templates"],
  });

  const createMut = useMutation({
    mutationFn: (data: { dayOfWeek: number; platform: string; contentType: string; preferredTime: string }) =>
      apiRequest("POST", "/api/admin/schedule/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/templates"] });
      toast({ title: "패턴 추가됨" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/schedule/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/templates"] });
      toast({ title: "패턴 삭제됨" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/schedule/templates/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/templates"] });
    },
  });

  const grouped = DAY_NAMES.map((name, i) => ({
    day: i,
    name,
    items: templates.filter((t) => t.dayOfWeek === i),
  }));

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        매주 반복할 콘텐츠 패턴을 설정하세요. 월간 스케줄 생성 시 이 패턴을 기반으로 날짜별 콘텐츠가 배치됩니다.
      </div>

      <div className="flex items-end gap-3 p-4 bg-gray-50 rounded-lg">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">요일</label>
          <Select value={newDay} onValueChange={setNewDay}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAY_NAMES.map((name, i) => (
                <SelectItem key={i} value={String(i)}>{name}요일</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">플랫폼</label>
          <Select value={newPlatform} onValueChange={(v) => {
            setNewPlatform(v);
            const allowed = PLATFORM_CONTENT_TYPES[v] || [];
            if (!allowed.includes(newContentType)) setNewContentType(allowed[0] || "post");
          }}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">콘텐츠</label>
          <Select value={newContentType} onValueChange={setNewContentType}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {filteredContentTypes.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">시간</label>
          <Input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="w-28 h-9"
          />
        </div>
        <Button
          size="sm"
          onClick={() => createMut.mutate({ dayOfWeek: Number(newDay), platform: newPlatform, contentType: newContentType, preferredTime: newTime })}
          disabled={createMut.isPending}
          className="h-9 gap-1"
          style={{ backgroundColor: "#4B9073" }}
        >
          <Plus className="h-4 w-4" /> 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {grouped.map(({ day, name, items }) => (
            <div key={day} className="border rounded-lg overflow-hidden">
              <div className={`text-center text-xs font-semibold py-2 ${day === 0 ? "bg-red-50 text-red-600" : day === 6 ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-700"}`}>
                {name}
              </div>
              <div className="p-2 space-y-1.5 min-h-[80px]">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className={`text-xs rounded px-1.5 py-1 flex items-center justify-between gap-1 ${t.isActive ? PLATFORM_COLORS[t.platform] || "bg-gray-100" : "bg-gray-50 text-gray-400 line-through"}`}
                  >
                    <span className="truncate">
                      {CONTENT_TYPE_LABELS[t.contentType] || t.contentType}
                      <span className="ml-1 opacity-60">{t.preferredTime || "18:00"}</span>
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => toggleMut.mutate({ id: t.id, isActive: !t.isActive })}
                        className="hover:opacity-70"
                        title={t.isActive ? "비활성화" : "활성화"}
                      >
                        {t.isActive ? "✓" : "○"}
                      </button>
                      <button
                        onClick={() => deleteMut.mutate(t.id)}
                        className="hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-gray-300 text-center py-2">-</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Weekly-List Tab ──────────────────────────────────
function getSydneyNow(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}

function formatMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

type BulkPreview = {
  total: number;
  byType: Record<string, number>;
  estimatedCostUsd: number;
  estimatedMinutes: number;
};

type BulkProgress = {
  counts: {
    draft: number;
    approved: number;
    generating: number;
    generated: number;
    failed: number;
    total: number;
  };
  generatingDetails: {
    scheduleItemId: string;
    queueItemId: string;
    percent: number;
    stage: string;
  }[];
  failedDetails: {
    scheduleItemId: string;
    queueItemId: string | null;
    rejectionReason: string | null;
  }[];
};

function MonthlyCalendarTab() {
  const { toast } = useToast();
  const sydneyDate = getSydneyNow();
  const [viewYear, setViewYear] = useState(sydneyDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(sydneyDate.getMonth() + 1);
  const [theme, setTheme] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [bulkPreview, setBulkPreview] = useState<BulkPreview | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [openWeeks, setOpenWeeks] = useState<string[]>([]);
  const [creditAlert, setCreditAlert] = useState<{ open: boolean; service: string; chargeUrl: string } | null>(null);

  const { data: items = [], isLoading } = useQuery<ContentScheduleItem[]>({
    queryKey: ["/api/admin/schedule/items", viewYear, viewMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/schedule/items?year=${viewYear}&month=${viewMonth}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Progress polling — only when there are items in progress or the month has any activity
  const { data: progress } = useQuery<BulkProgress>({
    queryKey: ["/api/admin/schedule/bulk-progress", viewYear, viewMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/schedule/bulk-progress?year=${viewYear}&month=${viewMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("progress fetch failed");
      return res.json();
    },
    refetchInterval: (query) => {
      const d = query.state.data as BulkProgress | undefined;
      if (!d) return 3000;
      return d.counts.generating > 0 ? 3000 : false;
    },
    enabled: items.length > 0,
  });

  // CREDIT_EXHAUSTED detection — fire alert once per failure (tracked by scheduleItemId),
  // not on every 3s poll. Dismissing the dialog must not cause it to reappear.
  const dismissedCreditIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!progress) return;
    const creditFailure = progress.failedDetails.find(
      (f) =>
        (f.rejectionReason || "").startsWith("CREDIT_EXHAUSTED:") &&
        !dismissedCreditIds.current.has(f.scheduleItemId)
    );
    if (creditFailure) {
      dismissedCreditIds.current.add(creditFailure.scheduleItemId);
      const service = (creditFailure.rejectionReason || "")
        .replace("CREDIT_EXHAUSTED:", "") || "fal.ai";
      setCreditAlert({
        open: true,
        service,
        chargeUrl: "https://fal.ai/dashboard/usage-billing/credits",
      });
    }
  }, [progress]);

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/schedule/generate", { year: viewYear, month: viewMonth, theme });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/items", viewYear, viewMonth] });
      toast({ title: `${data.count}개 스케줄 생성 완료` });
    },
    onError: (err: any) => {
      toast({ title: "생성 실패", description: err.message, variant: "destructive" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/admin/schedule/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/items", viewYear, viewMonth] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/schedule/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/items", viewYear, viewMonth] });
      toast({ title: "삭제됨" });
    },
  });

  const approveAllMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/schedule/approve-all", { year: viewYear, month: viewMonth });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/items", viewYear, viewMonth] });
      toast({ title: `${data.approved}개 항목 승인 완료` });
    },
  });

  const runNowMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/schedule/run-now");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/items", viewYear, viewMonth] });
      toast({ title: "오늘 스케줄 실행 완료" });
    },
    onError: (err: any) => {
      toast({ title: "실행 실패", description: err.message, variant: "destructive" });
    },
  });

  const openBulkDialog = async () => {
    try {
      const res = await fetch(`/api/admin/schedule/bulk-generate/preview?year=${viewYear}&month=${viewMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("미리보기 실패");
      const data = await res.json();
      setBulkPreview(data);
      setShowBulkDialog(true);
    } catch (err: any) {
      toast({ title: "미리보기 실패", description: err.message, variant: "destructive" });
    }
  };

  const bulkGenerateMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/schedule/bulk-generate", { year: viewYear, month: viewMonth });
      return res.json();
    },
    onSuccess: (data) => {
      setShowBulkDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/items", viewYear, viewMonth] });
      toast({
        title: `${data.queued}개 항목 제작 시작`,
        description: `예상 비용 $${data.estimatedCostUsd.toFixed(2)}. 백그라운드에서 진행됩니다.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "일괄 제작 실패", description: err.message, variant: "destructive" });
    },
  });

  const regenerateMut = useMutation({
    mutationFn: async (scheduleItemId: string) => {
      const res = await fetch(`/api/admin/schedule/items/${scheduleItemId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "CREDIT_EXHAUSTED") {
          setCreditAlert({ open: true, service: body.service || "fal.ai", chargeUrl: body.chargeUrl || "https://fal.ai/dashboard/usage-billing/credits" });
          throw new Error("크레딧 부족");
        }
        throw new Error(body.error || body.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule/items", viewYear, viewMonth] });
      toast({ title: "재생성 시작됨" });
    },
    onError: (err: any) => {
      toast({ title: "재생성 실패", description: err.message, variant: "destructive" });
    },
  });

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); }
    else setViewMonth(viewMonth + 1);
  };

  // Week bucketing — 1주차 = 1일~첫째주 토요일, 이후 일요일 시작
  const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1);
  const firstDow = firstDayOfMonth.getDay(); // 0=일

  const getWeekIndex = (day: number): number => {
    // Day 1 is always week 1. Week 2 starts on the first Sunday of the month.
    if (day <= 7 - firstDow) return 1;
    return Math.floor((day - (7 - firstDow) - 1) / 7) + 2;
  };

  const getWeekRange = (weekIdx: number): { start: number; end: number } => {
    if (weekIdx === 1) {
      return { start: 1, end: 7 - firstDow };
    }
    const start = 7 - firstDow + (weekIdx - 2) * 7 + 1;
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const end = Math.min(start + 6, daysInMonth);
    return { start, end };
  };

  // Group items by week
  const itemsByWeek: Record<number, ContentScheduleItem[]> = {};
  for (const item of items) {
    const day = Number(item.scheduledDate.split("-")[2]);
    const wk = getWeekIndex(day);
    if (!itemsByWeek[wk]) itemsByWeek[wk] = [];
    itemsByWeek[wk].push(item);
  }
  // Sort items within each week by date + time
  for (const wk of Object.keys(itemsByWeek)) {
    itemsByWeek[Number(wk)].sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
      return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
    });
  }

  const weekIndexes = Object.keys(itemsByWeek).map(Number).sort((a, b) => a - b);

  const existingTheme = items.length > 0 ? items[0].theme : null;
  const draftCount = items.filter(i => i.status === "draft").length;
  const approvedCount = items.filter(i => i.status === "approved").length;

  const startEdit = (item: ContentScheduleItem) => {
    setEditingItem(item.id);
    setEditTopic(item.topic || "");
    setEditDesc(item.description || "");
  };

  const saveEdit = (id: string) => {
    updateMut.mutate({ id, data: { topic: editTopic, description: editDesc } });
    setEditingItem(null);
  };

  // Map schedule item id → live progress info
  const progressByItemId: Record<string, { percent: number; stage: string }> = {};
  const rejectionByItemId: Record<string, string | null> = {};
  if (progress) {
    for (const g of progress.generatingDetails) {
      progressByItemId[g.scheduleItemId] = { percent: g.percent, stage: g.stage };
    }
    for (const f of progress.failedDetails) {
      rejectionByItemId[f.scheduleItemId] = f.rejectionReason;
    }
  }

  const totalCounts = progress?.counts || {
    draft: draftCount,
    approved: approvedCount,
    generating: 0,
    generated: items.filter(i => i.status === "generated").length,
    failed: items.filter(i => i.status === "failed").length,
    total: items.length,
  };

  const progressPercent = totalCounts.total > 0
    ? Math.round((totalCounts.generated / totalCounts.total) * 100)
    : 0;

  const hasFailed = totalCounts.failed > 0;
  const canBulkGenerate = approvedCount > 0 || hasFailed;

  const scrollToFailed = () => {
    // Open the week accordions that contain failed items
    const failedWeeks = new Set<string>();
    for (const item of items) {
      if (rejectionByItemId[item.id] !== undefined || item.status === "failed") {
        const day = Number(item.scheduledDate.split("-")[2]);
        failedWeeks.add(`week-${getWeekIndex(day)}`);
      }
    }
    setOpenWeeks(Array.from(failedWeeks));
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[120px] text-center">
            {viewYear}년 {viewMonth}월
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runNowMut.mutate()}
            disabled={runNowMut.isPending}
            className="gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
          >
            {runNowMut.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> 실행중...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> 오늘 스케줄 실행</>
            )}
          </Button>
          {draftCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => approveAllMut.mutate()}
              disabled={approveAllMut.isPending}
              className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4" /> 전체 승인 ({draftCount})
            </Button>
          )}
          {canBulkGenerate && (
            <Button
              size="sm"
              onClick={openBulkDialog}
              className="gap-1"
              style={{ backgroundColor: "#7C3AED" }}
            >
              <Zap className="h-4 w-4" /> 전체 제작 ({approvedCount + totalCounts.failed})
            </Button>
          )}
        </div>
      </div>

      {/* Theme + generate */}
      <div className="flex items-end gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-purple-700">월간 테마</label>
          <Input
            placeholder="예: 가을 산책 시즌, 국둥이 아웃도어 활동"
            value={theme || existingTheme || ""}
            onChange={(e) => setTheme(e.target.value)}
            className="h-9"
          />
        </div>
        <Button
          size="sm"
          onClick={() => generateMut.mutate()}
          disabled={generateMut.isPending || !(theme || existingTheme)}
          className="gap-1.5 h-9"
          style={{ backgroundColor: "#7C3AED" }}
        >
          {generateMut.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> 생성중...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> AI 스케줄 생성</>
          )}
        </Button>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              제작 진행: {totalCounts.generated} / {totalCounts.total} 완료
              {totalCounts.generating > 0 && (
                <span className="ml-2 text-blue-600">· {totalCounts.generating}개 생성 중</span>
              )}
              {totalCounts.failed > 0 && (
                <button
                  onClick={scrollToFailed}
                  className="ml-2 text-red-600 hover:underline"
                >
                  · {totalCounts.failed}개 실패 (보기)
                </button>
              )}
            </span>
            <span className="text-xs text-gray-500">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${hasFailed ? "bg-gradient-to-r from-blue-500 to-red-400" : "bg-purple-500"}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {existingTheme && items.length > 0 && (
        <div className="text-sm text-gray-500">
          현재 테마: <span className="font-medium text-gray-700">"{existingTheme}"</span>
          {" · "}{items.length}개 항목
          {" · "}초안 {draftCount} / 승인 {approvedCount}
        </div>
      )}

      {/* Weekly Accordion */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : weekIndexes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border rounded-lg">
          스케줄이 없습니다. 월간 테마를 입력하고 "AI 스케줄 생성"을 클릭하세요.
        </div>
      ) : (
        <Accordion type="multiple" value={openWeeks} onValueChange={setOpenWeeks} className="border rounded-lg divide-y">
          {weekIndexes.map((wk) => {
            const weekItems = itemsByWeek[wk];
            const range = getWeekRange(wk);
            const byType: Record<string, number> = {};
            let weekFailed = 0;
            let weekGenerating = 0;
            let weekGenerated = 0;
            for (const it of weekItems) {
              byType[it.contentType] = (byType[it.contentType] || 0) + 1;
              const effStatus = progressByItemId[it.id] ? "generating"
                : rejectionByItemId[it.id] ? "failed"
                : it.status;
              if (effStatus === "failed") weekFailed++;
              if (effStatus === "generating") weekGenerating++;
              if (effStatus === "generated") weekGenerated++;
            }
            const typeSummary = Object.entries(byType)
              .map(([type, count]) => `${CONTENT_TYPE_LABELS[type] || type} ${count}`)
              .join(" · ");

            return (
              <AccordionItem key={wk} value={`week-${wk}`} className="border-0">
                <AccordionTrigger className="px-4 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center gap-3 text-left flex-1">
                    <span className="font-semibold">{wk}주차</span>
                    <span className="text-sm text-gray-500">
                      ({viewMonth}/{range.start}~{viewMonth}/{range.end})
                    </span>
                    <span className="text-sm text-gray-600">· {typeSummary}</span>
                    <span className="text-sm text-gray-500">· 총 {weekItems.length}개</span>
                    <div className="ml-auto flex items-center gap-2 pr-2">
                      {weekGenerated > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          완료 {weekGenerated}
                        </span>
                      )}
                      {weekGenerating > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> {weekGenerating}
                        </span>
                      )}
                      {weekFailed > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {weekFailed}
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 space-y-2">
                  {weekItems.map((item) => {
                    const day = Number(item.scheduledDate.split("-")[2]);
                    const date = new Date(viewYear, viewMonth - 1, day);
                    const dow = date.getDay();
                    const liveProgress = progressByItemId[item.id];
                    const rejection = rejectionByItemId[item.id];
                    const effectiveStatus = liveProgress ? "generating"
                      : rejection ? "failed"
                      : item.status;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 ${effectiveStatus === "failed" ? "border-red-300 bg-red-50/40" : "bg-white"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center justify-center min-w-[60px] py-1 bg-gray-50 rounded">
                            <span className={`text-xs font-medium ${dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-gray-600"}`}>
                              {DAY_NAMES[dow]}
                            </span>
                            <span className="text-lg font-bold text-gray-800">
                              {formatMonthDay(item.scheduledDate)}
                            </span>
                            {item.scheduledTime && (
                              <span className="text-[10px] text-gray-500">{item.scheduledTime}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${PLATFORM_COLORS[item.platform] || "bg-gray-100"}`}>
                                {PLATFORM_OPTIONS.find(p => p.value === item.platform)?.label || item.platform}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                {CONTENT_TYPE_LABELS[item.contentType] || item.contentType}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[effectiveStatus]}`}>
                                {STATUS_LABELS[effectiveStatus]}
                                {liveProgress && liveProgress.percent > 0 && ` ${liveProgress.percent}%`}
                              </span>
                              {liveProgress?.stage && (
                                <span className="text-[10px] text-blue-600">{liveProgress.stage}</span>
                              )}
                            </div>

                            {editingItem === item.id ? (
                              <div className="space-y-1.5">
                                <input
                                  className="w-full text-sm border rounded px-2 py-1"
                                  value={editTopic}
                                  onChange={(e) => setEditTopic(e.target.value)}
                                  placeholder="주제"
                                  autoFocus
                                />
                                <input
                                  className="w-full text-sm border rounded px-2 py-1"
                                  value={editDesc}
                                  onChange={(e) => setEditDesc(e.target.value)}
                                  placeholder="설명"
                                />
                                <div className="flex gap-1">
                                  <button onClick={() => saveEdit(item.id)} className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs">
                                    <Check className="h-3 w-3" /> 저장
                                  </button>
                                  <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs">
                                    <XIcon className="h-3 w-3" /> 취소
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="cursor-pointer" onClick={() => startEdit(item)}>
                                {item.topic && (
                                  <div className="text-sm font-medium text-gray-800">{item.topic}</div>
                                )}
                                {item.description && (
                                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                )}
                              </div>
                            )}

                            {effectiveStatus === "generating" && liveProgress && (
                              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all"
                                  style={{ width: `${liveProgress.percent}%` }}
                                />
                              </div>
                            )}

                            {effectiveStatus === "failed" && rejection && (
                              <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 border border-red-200" title={rejection}>
                                {rejection.length > 80 ? rejection.slice(0, 80) + "..." : rejection}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.status === "draft" && (
                              <button
                                onClick={() => updateMut.mutate({ id: item.id, data: { status: "approved", approvedAt: new Date().toISOString() } })}
                                className="text-green-600 hover:text-green-800 p-1"
                                title="승인"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            {(effectiveStatus === "generated" || effectiveStatus === "failed") && item.queueItemId && (
                              <button
                                onClick={() => regenerateMut.mutate(item.id)}
                                disabled={regenerateMut.isPending}
                                className="text-purple-600 hover:text-purple-800 p-1 disabled:opacity-40"
                                title="다시 만들기"
                              >
                                <RefreshCw className={`h-4 w-4 ${regenerateMut.isPending ? "animate-spin" : ""}`} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteMut.mutate(item.id)}
                              className="text-red-400 hover:text-red-600 p-1"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Bulk generate confirmation dialog */}
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전체 제작 확인</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {bulkPreview && (
                <>
                  <div>
                    <strong>{bulkPreview.total}개 항목</strong>을 일괄 제작합니다.
                  </div>
                  <div className="text-sm">
                    예상 비용: <strong>${bulkPreview.estimatedCostUsd.toFixed(2)}</strong> USD
                    {" · "}
                    예상 시간: <strong>약 {bulkPreview.estimatedMinutes}분</strong>
                  </div>
                  <div className="text-xs text-gray-500">
                    {Object.entries(bulkPreview.byType).map(([type, count]) => (
                      <span key={type} className="mr-2">
                        {CONTENT_TYPE_LABELS[type] || type}: {count}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    제작은 백그라운드에서 진행되며, 진행률은 상단 바에서 확인할 수 있습니다.
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkGenerateMut.mutate()}
              disabled={bulkGenerateMut.isPending}
              style={{ backgroundColor: "#7C3AED" }}
            >
              {bulkGenerateMut.isPending ? "요청 중..." : "제작 시작"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credit exhaustion alert (mirror of admin-marketing) */}
      {creditAlert && (
        <AlertDialog open={creditAlert.open} onOpenChange={(open) => !open && setCreditAlert(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>크레딧 부족</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{creditAlert.service}</strong> 크레딧이 부족해서 제작을 진행할 수 없습니다.
                <br />
                <a
                  href={creditAlert.chargeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 underline text-xs block mt-2"
                >
                  🔗 {creditAlert.chargeUrl}
                </a>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>닫기</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  window.open(creditAlert.chargeUrl, "_blank");
                  setCreditAlert(null);
                }}
                style={{ backgroundColor: "#7C3AED" }}
              >
                충전하러 가기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────
export default function AdminScheduler() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">콘텐츠 스케줄러</h1>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">월간 스케줄</TabsTrigger>
            <TabsTrigger value="pattern">주간 패턴</TabsTrigger>
          </TabsList>

          <TabsContent value="pattern">
            <WeeklyPatternTab />
          </TabsContent>

          <TabsContent value="calendar">
            <MonthlyCalendarTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
