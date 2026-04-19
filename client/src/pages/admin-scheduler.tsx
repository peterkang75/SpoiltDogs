import { useState } from "react";
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
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  CheckCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X as XIcon,
  Check,
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
];

const PLATFORM_CONTENT_TYPES: Record<string, string[]> = {
  instagram: ["post", "reel", "story_image", "card_news", "carousel"],
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

      {/* Add new pattern */}
      <div className="flex items-end gap-3 p-4 bg-gray-50 rounded-lg">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">요일</label>
          <Select value={newDay} onValueChange={setNewDay}>
            <SelectTrigger className="w-24 h-9">
              <SelectValue />
            </SelectTrigger>
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
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
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
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
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

      {/* Weekly grid */}
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

// ─── Monthly Calendar Tab ──────────────────────────────────
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

function MonthlyCalendarTab() {
  const { toast } = useToast();
  const sydneyDate = getSydneyNow();
  const [viewYear, setViewYear] = useState(sydneyDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(sydneyDate.getMonth() + 1);
  const [theme, setTheme] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const { data: items = [], isLoading } = useQuery<ContentScheduleItem[]>({
    queryKey: ["/api/admin/schedule/items", viewYear, viewMonth],
    queryFn: async () => {
      const res = await fetch(`/api/admin/schedule/items?year=${viewYear}&month=${viewMonth}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

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
      toast({ title: "오늘 스케줄 실행 완료", description: "마케팅 큐에서 생성된 항목을 확인하세요" });
    },
    onError: (err: any) => {
      toast({ title: "실행 실패", description: err.message, variant: "destructive" });
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

  // Calendar grid calculation
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const itemsByDate: Record<string, ContentScheduleItem[]> = {};
  for (const item of items) {
    if (!itemsByDate[item.scheduledDate]) itemsByDate[item.scheduledDate] = [];
    itemsByDate[item.scheduledDate].push(item);
  }

  const existingTheme = items.length > 0 ? items[0].theme : null;
  const draftCount = items.filter(i => i.status === "draft").length;

  const startEdit = (item: ContentScheduleItem) => {
    setEditingItem(item.id);
    setEditTopic(item.topic || "");
    setEditDesc(item.description || "");
  };

  const saveEdit = (id: string) => {
    updateMut.mutate({ id, data: { topic: editTopic, description: editDesc } });
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Month navigation + theme */}
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

      {existingTheme && items.length > 0 && (
        <div className="text-sm text-gray-500">
          현재 테마: <span className="font-medium text-gray-700">"{existingTheme}"</span>
          {" · "}{items.length}개 항목
          {" · "}초안 {draftCount} / 승인 {items.filter(i => i.status === "approved").length}
        </div>
      )}

      {/* Calendar grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {DAY_NAMES.map((name, i) => (
              <div key={i} className={`text-center text-xs font-semibold py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-600"}`}>
                {name}
              </div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dateStr = day ? `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const dayItems = day ? (itemsByDate[dateStr] || []) : [];
              const dow = idx % 7;
              const isToday = day && viewYear === sydneyDate.getFullYear() && viewMonth === sydneyDate.getMonth() + 1 && day === sydneyDate.getDate();

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r p-1 ${day ? "bg-white" : "bg-gray-50"} ${isToday ? "ring-2 ring-inset ring-green-400" : ""}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-medium mb-1 ${dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-gray-500"}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayItems.map((item) => (
                          <div
                            key={item.id}
                            className={`text-xs rounded px-1.5 py-1 border cursor-pointer group relative ${PLATFORM_COLORS[item.platform] || "bg-gray-100"}`}
                          >
                            {editingItem === item.id ? (
                              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  className="w-full text-xs border rounded px-1 py-0.5"
                                  value={editTopic}
                                  onChange={(e) => setEditTopic(e.target.value)}
                                  placeholder="주제"
                                  autoFocus
                                />
                                <input
                                  className="w-full text-xs border rounded px-1 py-0.5"
                                  value={editDesc}
                                  onChange={(e) => setEditDesc(e.target.value)}
                                  placeholder="설명"
                                />
                                <div className="flex gap-1">
                                  <button onClick={() => saveEdit(item.id)} className="text-green-600 hover:text-green-800">
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                                    <XIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div onClick={() => startEdit(item)}>
                                <div className="flex items-center justify-between gap-0.5">
                                  <span className="font-medium truncate">
                                    {CONTENT_TYPE_LABELS[item.contentType]}
                                  </span>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.status === "draft" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateMut.mutate({ id: item.id, data: { status: "approved", approvedAt: new Date().toISOString() } });
                                        }}
                                        className="text-green-600 hover:text-green-800"
                                        title="승인"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteMut.mutate(item.id);
                                      }}
                                      className="text-red-400 hover:text-red-600"
                                      title="삭제"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                {item.topic && (
                                  <div className="text-[10px] mt-0.5 opacity-80 truncate">{item.topic}</div>
                                )}
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`text-[9px] px-1 rounded ${STATUS_COLORS[item.status]}`}>
                                    {STATUS_LABELS[item.status]}
                                  </span>
                                  {item.scheduledTime && (
                                    <span className="text-[9px] opacity-60">{item.scheduledTime}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
            <TabsTrigger value="calendar">캘린더</TabsTrigger>
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
