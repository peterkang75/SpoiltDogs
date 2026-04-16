import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Instagram,
  Facebook,
  Tv,
  RefreshCw,
  Inbox,
  Loader2,
  Image as ImageIcon,
  Film,
  Wand2,
  Paperclip,
  X as XIcon,
  Eye,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Play,
  Home,
  Search,
  Languages,
} from "lucide-react";
import type { MarketingPrompt, MarketingQueue } from "@shared/schema";

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "bg-pink-100 text-pink-700" },
  facebook: { label: "Facebook", color: "bg-blue-100 text-blue-700" },
  tiktok: { label: "TikTok", color: "bg-slate-100 text-slate-700" },
  threads: { label: "Threads", color: "bg-gray-100 text-gray-700" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "대기중", color: "bg-amber-100 text-amber-700" },
  generating: { label: "생성중 ⏳", color: "bg-blue-100 text-blue-700" },
  approved: { label: "승인됨", color: "bg-green-100 text-green-700" },
  rejected: { label: "반려됨", color: "bg-red-100 text-red-700" },
  failed: { label: "실패", color: "bg-red-100 text-red-700" },
};

const CONTENT_TYPE_META: Record<string, { label: string; color: string }> = {
  feed_image:  { label: "📸 피드",     color: "bg-purple-100 text-purple-700" },
  story_image: { label: "⭕ 스토리",   color: "bg-orange-100 text-orange-700" },
  reel:        { label: "🎬 릴스",     color: "bg-red-100 text-red-700" },
  card_news:   { label: "🃏 카드뉴스", color: "bg-cyan-100 text-cyan-700" },
  tiktok:      { label: "🎵 틱톡",     color: "bg-slate-100 text-slate-700" },
};

const VIDEO_DURATION_OPTIONS = [
  { value: "5", label: "5초", description: "짧고 임팩트" },
  { value: "8", label: "8초", description: "추천 ⭐" },
  { value: "10", label: "10초", description: "스토리텔링" },
];

const VIDEO_QUALITY_OPTIONS = [
  {
    value: "fast",
    label: "⚡ 빠름",
    description: "Kling 1.6 · ~$1.00",
    model: "kling",
    forTypes: ["reel", "tiktok"],
  },
  {
    value: "recommended",
    label: "⭐ 추천",
    description: "Kling 3.0 · ~$1.50",
    model: "kling-3",
    forTypes: ["reel", "tiktok"],
  },
  {
    value: "high",
    label: "✨ 고품질",
    description: "Veo 2 · ~$3.00",
    model: "veo2",
    forTypes: ["reel", "tiktok"],
  },
];

const IMAGE_MODEL_OPTIONS = [
  {
    value: "nano-banana-2",
    label: "🍌 Nano Banana 2",
    description: "Gemini 3.1 · 기본 추천",
    forTypes: ["feed_image", "story_image", "facebook_post"],
  },
  {
    value: "nano-banana-pro",
    label: "🍌✨ Nano Banana Pro",
    description: "Gemini 3 Pro · 최고 품질 · $0.15/장",
    forTypes: ["feed_image", "story_image", "facebook_post"],
  },
  {
    value: "ideogram",
    label: "📝 Ideogram V3",
    description: "텍스트 포함 이미지 · 카드뉴스 전용",
    forTypes: ["card_news"],
  },
];

const POST_FORMAT_OPTIONS = [
  {
    value: "instagram_feed",
    label: "📸 인스타 피드 사진",
    platform: "instagram",
    contentType: "feed_image",
    model: "nano-banana-2",
    aspectRatio: "1:1",
    description: "정방형 · Nano Banana 2",
  },
  {
    value: "instagram_story",
    label: "⭕ 인스타 스토리 사진",
    platform: "instagram",
    contentType: "story_image",
    model: "flux-pro",
    aspectRatio: "9:16",
    description: "세로형 · Flux Pro",
  },
  {
    value: "instagram_reel",
    label: "🎬 인스타 릴스 영상",
    platform: "instagram",
    contentType: "reel",
    model: "kling",
    aspectRatio: "9:16",
    description: "세로형 영상 · Kling",
  },
  {
    value: "facebook_post",
    label: "👥 페이스북 포스트",
    platform: "facebook",
    contentType: "feed_image",
    model: "flux-pro",
    aspectRatio: "1:1",
    description: "정방형 · Flux Pro",
  },
  {
    value: "tiktok_video",
    label: "🎵 틱톡 영상",
    platform: "tiktok",
    contentType: "tiktok",
    model: "kling",
    aspectRatio: "9:16",
    description: "세로형 영상 · Kling",
  },
  {
    value: "card_news",
    label: "🃏 카드뉴스",
    platform: "instagram",
    contentType: "card_news",
    model: "ideogram",
    aspectRatio: "1:1",
    description: "텍스트 포함 · Ideogram",
  },
];

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {text}
    </span>
  );
}

export default function AdminMarketing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // ── Freeform post dialog state ────────────────────────────────────
  const [freeformOpen, setFreeformOpen] = useState(false);
  const [freeformTopic, setFreeformTopic] = useState("");
  const [freeformTone, setFreeformTone] = useState("");
  const [freeformPostFormat, setFreeformPostFormat] = useState("instagram_feed");
  const [freeformAdditionalInstructions, setFreeformAdditionalInstructions] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);


  // ── Prompt dialog state ───────────────────────────────────────────
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<MarketingPrompt | null>(
    null,
  );
  const [promptName, setPromptName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [promptSection, setPromptSection] = useState("instagram_post");

  // ── Delete confirm state ──────────────────────────────────────────
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [deleteQueueId, setDeleteQueueId] = useState<string | null>(null);

  // ── Reject dialog state ───────────────────────────────────────────
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // ── Credit exhaustion alert state ─────────────────────────────────
  const [creditAlert, setCreditAlert] = useState<{
    open: boolean;
    service: string;
    chargeUrl: string;
  } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────
  const { data: prompts = [], isLoading: promptsLoading } = useQuery<
    MarketingPrompt[]
  >({
    queryKey: ["/api/admin/marketing/prompts"],
  });

  const { data: queue = [], isLoading: queueLoading } = useQuery<
    MarketingQueue[]
  >({
    queryKey: ["/api/admin/marketing/queue"],
    refetchInterval: (query) =>
      query.state.data?.some((item: any) => item.status === "generating") ? 10000 : false,
  });

  const { data: musicTracks = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/brand/music"],
  });

  // ── Prompt mutations ──────────────────────────────────────────────
  const createPromptMut = useMutation({
    mutationFn: (data: {
      name: string;
      systemInstruction: string;
      section: string;
    }) => apiRequest("POST", "/api/admin/marketing/prompts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/marketing/prompts"],
      });
      setPromptDialogOpen(false);
      toast({ title: "프롬프트가 생성되었습니다." });
    },
  });

  const updatePromptMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<MarketingPrompt>;
    }) => apiRequest("PATCH", `/api/admin/marketing/prompts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/marketing/prompts"],
      });
      setPromptDialogOpen(false);
      toast({ title: "프롬프트가 수정되었습니다." });
    },
  });

  const deletePromptMut = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/marketing/prompts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/marketing/prompts"],
      });
      setDeletePromptId(null);
      toast({ title: "프롬프트가 삭제되었습니다." });
    },
  });

  // ── Queue mutations ───────────────────────────────────────────────
  const approveMut = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/admin/marketing/queue/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/marketing/queue"],
      });
      toast({ title: "콘텐츠가 승인되었습니다." });
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("PATCH", `/api/admin/marketing/queue/${id}/reject`, {
        rejectionReason: reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/marketing/queue"],
      });
      setRejectId(null);
      setRejectReason("");
      toast({ title: "콘텐츠가 반려되었습니다." });
    },
  });

  const deleteQueueMut = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/marketing/queue/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/marketing/queue"],
      });
      setDeleteQueueId(null);
      toast({ title: "항목이 삭제되었습니다." });
    },
  });


  const generateImageMut = useMutation({
    mutationFn: async ({ id, model, duration, audioEnabled, musicUrl, musicVolume, motionDirective }: { id: string; model: string; duration: string; audioEnabled?: boolean; musicUrl?: string | null; musicVolume?: number; motionDirective?: string }) => {
      const response = await fetch(`/api/admin/marketing/queue/${id}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ model, duration, audioEnabled, musicUrl, musicVolume, motionDirective }),
      });
      if (!response.ok) {
        const data = await response.json();
        const err = new Error(data.message || "Generation failed") as any;
        err.responseData = data;
        throw err;
      }
      return response.json();
    },
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/marketing/queue"],
      });
      if (data.status === "generating") {
        toast({
          title: "영상 생성 시작",
          description: "2~5분 후 자동으로 완료됩니다. 페이지를 떠나도 괜찮습니다.",
        });
        const pollInterval = setInterval(async () => {
          const res = await fetch(`/api/admin/marketing/queue/${variables.id}`, { credentials: "include" });
          if (!res.ok) { clearInterval(pollInterval); return; }
          const item = await res.json();
          if (item.status !== "generating") {
            clearInterval(pollInterval);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/queue"] });
            if (item.videoUrl) {
              toast({ title: "영상 생성 완료!" });
            } else {
              toast({ title: "영상 생성 실패", variant: "destructive" });
            }
          }
        }, 15000);
        return;
      }
      if (variables.model === "card_news") {
        toast({
          title: "카드뉴스 생성 완료",
          description: "국둥이 이미지 + 텍스트 합성 완료",
        });
      } else {
        toast({ title: "이미지가 생성되었습니다!" });
      }
    },
    onError: (err: any) => {
      if (err.responseData?.error === "CREDIT_EXHAUSTED") {
        setCreditAlert({
          open: true,
          service: err.responseData.service || "FAL.AI",
          chargeUrl: err.responseData.chargeUrl || "https://fal.ai/dashboard/usage-billing/credits",
        });
        return;
      }
      toast({
        title: "이미지/영상 생성 실패",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const rewriteMut = useMutation({
    mutationFn: ({ topic, platform }: { topic: string; platform: string }) =>
      apiRequest("POST", "/api/admin/marketing/generate", { topic, platform }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/marketing/queue"],
      });
      toast({ title: "새 버전이 생성되었습니다!" });
    },
    onError: (err: Error) => {
      toast({
        title: "재작성 실패",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────
  function openCreatePrompt() {
    setEditingPrompt(null);
    setPromptName("");
    setPromptText("");
    setPromptSection("instagram_post");
    setPromptDialogOpen(true);
  }

  function openEditPrompt(p: MarketingPrompt) {
    setEditingPrompt(p);
    setPromptName(p.name);
    setPromptText(p.systemInstruction);
    setPromptSection(p.section);
    setPromptDialogOpen(true);
  }

  function handleSavePrompt() {
    if (!promptName.trim() || !promptText.trim()) return;
    const data = {
      name: promptName.trim(),
      systemInstruction: promptText.trim(),
      section: promptSection,
    };
    if (editingPrompt) {
      updatePromptMut.mutate({ id: editingPrompt.id, data });
    } else {
      createPromptMut.mutate(data);
    }
  }

  const generateMut = useMutation({
    mutationFn: (data: {
      topic: string;
      prompt_id: string;
      platform: string;
      contentType: string;
      model: string;
      additionalInstructions: string;
      attachedImageUrls?: string[];
    }) => apiRequest("POST", "/api/admin/marketing/generate", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/marketing/queue"],
      });
      setFreeformOpen(false);
      setFreeformTopic("");
      setFreeformTone("");
      setFreeformPostFormat("instagram_feed");
      setFreeformAdditionalInstructions("");
      setAttachedFiles([]);
      toast({
        title: "콘텐츠가 생성되었습니다!",
        description: "콘텐츠 큐에서 확인하세요.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "생성 실패",
        description: err.message ?? "콘텐츠 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  async function handleFreeformGenerate() {
    if (!freeformTopic.trim()) return;
    const fmt =
      POST_FORMAT_OPTIONS.find((f) => f.value === freeformPostFormat) ??
      POST_FORMAT_OPTIONS[0];

    let attachedImageUrls: string[] = [];
    if (attachedFiles.length > 0) {
      setIsUploadingAttachments(true);
      try {
        const formData = new FormData();
        attachedFiles.forEach((f) => formData.append("files", f));
        formData.append("isTrainingData", "false");
        const res = await fetch("/api/admin/brand/images/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          attachedImageUrls = (data.images ?? []).map((img: any) => img.imageUrl as string);
        }
      } catch (e) {
        console.error("Attachment upload failed:", e);
      } finally {
        setIsUploadingAttachments(false);
      }
    }

    generateMut.mutate({
      topic: freeformTopic.trim(),
      prompt_id: freeformTone,
      platform: fmt.platform,
      contentType: fmt.contentType,
      model: fmt.model,
      additionalInstructions: freeformAdditionalInstructions.trim(),
      attachedImageUrls,
    });
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <AdminLayout>
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold" style={{ color: "#1a3a2e", fontFamily: "Fraunces, serif" }}>마케팅 커맨드 센터</h1>
          <Button
            size="sm"
            onClick={() => setFreeformOpen(true)}
            className="gap-2 rounded-full font-semibold shadow"
            style={{ backgroundColor: "#FFD54F", color: "#1a3a2e" }}
            data-testid="button-create-freeform"
          >
            <Sparkles className="h-4 w-4" />
            Freeform Post 만들기
          </Button>
        </div>
        <Tabs defaultValue="queue">
          <TabsList
            className="mb-6 bg-white border border-gray-200 shadow-sm"
            data-testid="marketing-tabs"
          >
            <TabsTrigger
              value="queue"
              className="gap-2"
              data-testid="tab-content-queue"
            >
              <Inbox className="h-4 w-4" />
              콘텐츠 큐
              {queue.filter((q) => q.status === "pending").length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
                  {queue.filter((q) => q.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="prompts"
              className="gap-2"
              data-testid="tab-brand-prompts"
            >
              <Sparkles className="h-4 w-4" />
              상황별 톤 프리셋
            </TabsTrigger>
          </TabsList>

          {/* ── CONTENT QUEUE TAB ──────────────────────────────────── */}
          <TabsContent value="queue">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  className="font-semibold text-lg"
                  style={{ color: "#1a3a2e" }}
                >
                  콘텐츠 승인 큐
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  AI가 생성한 콘텐츠를 검토하고 승인 또는 반려합니다.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["/api/admin/marketing/queue"],
                  })
                }
                className="gap-2"
                data-testid="button-refresh-queue"
              >
                <RefreshCw className="h-4 w-4" />
                새로고침
              </Button>
            </div>

            {queueLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-xl bg-gray-200 animate-pulse"
                  />
                ))}
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">큐가 비어있습니다.</p>
                <p className="text-sm mt-1">
                  Make.com 웹훅으로 콘텐츠가 생성되면 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4" data-testid="queue-list">
                {queue.map((item) => (
                  <QueueCard
                    key={item.id}
                    item={item}
                    onApprove={() => approveMut.mutate(item.id)}
                    onReject={() => {
                      setRejectId(item.id);
                      setRejectReason("");
                    }}
                    onDelete={() => setDeleteQueueId(item.id)}
                    musicTracks={musicTracks}
                    onGenerateImage={(id, model, duration, opts) =>
                      generateImageMut.mutate({ id, model, duration, ...(opts ?? {}) })
                    }
                    onRewrite={(topic, platform) =>
                      rewriteMut.mutate({ topic, platform })
                    }
                    isApproving={approveMut.isPending}
                    isRejecting={rejectMut.isPending}
                    isGeneratingImage={
                      (generateImageMut.isPending &&
                      generateImageMut.variables?.id === item.id) ||
                      item.status === "generating"
                    }
                    isRewriting={rewriteMut.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── BRAND PROMPTS TAB ──────────────────────────────────── */}
          <TabsContent value="prompts">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  className="font-semibold text-lg"
                  style={{ color: "#1a3a2e" }}
                >
                  상황별 톤 프리셋
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  포스트 생성 시 직접 선택하는 추가 톤 지시 모음입니다.
                </p>
              </div>
              <Button
                size="sm"
                onClick={openCreatePrompt}
                className="gap-2 rounded-full"
                style={{ backgroundColor: "#4B9073", color: "white" }}
                data-testid="button-add-prompt"
              >
                <Plus className="h-4 w-4" />
                프롬프트 추가
              </Button>
            </div>

            {/* 기능 설명 박스 */}
            <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">선택 적용</span>
              <div className="text-sm text-stone-600 leading-relaxed space-y-1">
                <p>포스트를 생성할 때 드롭다운에서 직접 골라야 적용되는 추가 지시입니다. 선택하지 않으면 포함되지 않습니다.</p>
                <p className="text-xs text-stone-400">예: "신제품 런칭용 — 기대감을 높이는 톤" / "생일 이벤트용 — 따뜻하고 감성적인 톤"</p>
                <p className="text-xs text-stone-400 pt-0.5 border-t border-amber-100 mt-1">나의 기본 페르소나와 말투는 <span className="font-semibold text-stone-500">브랜드 스튜디오 → 브랜드 보이스</span>에 적으세요. 그 내용은 선택 없이 항상 적용됩니다.</p>
              </div>
            </div>

            {promptsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl bg-gray-200 animate-pulse"
                  />
                ))}
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">등록된 프롬프트가 없습니다.</p>
                <p className="text-sm mt-1">
                  첫 번째 브랜드 프롬프트를 추가해보세요.
                </p>
                <Button
                  size="sm"
                  onClick={openCreatePrompt}
                  className="mt-4 gap-2 rounded-full"
                  style={{ backgroundColor: "#4B9073", color: "white" }}
                  data-testid="button-add-prompt-empty"
                >
                  <Plus className="h-4 w-4" />첫 프롬프트 추가
                </Button>
              </div>
            ) : (
              <div className="space-y-3" data-testid="prompts-list">
                {prompts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-sage-300 transition-colors"
                    data-testid={`prompt-card-${p.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: "#1a3a2e" }}
                        >
                          {p.name}
                        </span>
                        <Badge
                          text={p.section.replace(/_/g, " ")}
                          color="bg-sage-100 text-sage-700 bg-emerald-50 text-emerald-700"
                        />
                        {p.isActive && (
                          <Badge
                            text="활성"
                            color="bg-green-100 text-green-700"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {p.systemInstruction}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditPrompt(p)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
                        data-testid={`button-edit-prompt-${p.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletePromptId(p.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                        data-testid={`button-delete-prompt-${p.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── FREEFORM POST DIALOG ──────────────────────────────────── */}
      <Dialog
        open={freeformOpen}
        onOpenChange={(open) => {
          if (!open && !generateMut.isPending) {
            setFreeformOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="dialog-freeform">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Freeform Post 생성
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="freeform-topic">Topic</Label>
              <Input
                id="freeform-topic"
                placeholder="예: Summer dog walking tips in Sydney"
                value={freeformTopic}
                onChange={(e) => setFreeformTopic(e.target.value)}
                disabled={generateMut.isPending}
                data-testid="input-freeform-topic"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="freeform-tone">상황별 톤 프리셋 (선택)</Label>
              <Select
                value={freeformTone}
                onValueChange={setFreeformTone}
                disabled={generateMut.isPending}
              >
                <SelectTrigger
                  id="freeform-tone"
                  data-testid="select-freeform-tone"
                >
                  <SelectValue placeholder="톤을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {prompts.length === 0 ? (
                    <SelectItem value="none" disabled>
                      등록된 프롬프트가 없습니다
                    </SelectItem>
                  ) : (
                    prompts.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        data-testid={`tone-option-${p.id}`}
                      >
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="freeform-post-format">게시 형태</Label>
              <Select
                value={freeformPostFormat}
                onValueChange={setFreeformPostFormat}
                disabled={generateMut.isPending}
              >
                <SelectTrigger
                  id="freeform-post-format"
                  data-testid="select-freeform-post-format"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const fmt = POST_FORMAT_OPTIONS.find(
                  (f) => f.value === freeformPostFormat
                );
                return fmt ? (
                  <p className="text-xs text-gray-400">{fmt.description}</p>
                ) : null;
              })()}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="freeform-instructions">추가 지시사항 (선택)</Label>
              <textarea
                id="freeform-instructions"
                rows={3}
                placeholder="예: 이번 포스트에 신제품 harness 자연스럽게 언급해줘 / 크리스마스 분위기로 / 3줄 이내로 짧게..."
                value={freeformAdditionalInstructions}
                onChange={(e) => setFreeformAdditionalInstructions(e.target.value)}
                disabled={generateMut.isPending}
                data-testid="textarea-freeform-instructions"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-50"
              />
            </div>

            {/* File attachment section */}
            <div className="space-y-2">
              <div>
                <Label>사진 / 영상 첨부 (선택)</Label>
                <p className="text-xs text-gray-400 mt-0.5">첨부된 파일이 있으면 AI 생성 이미지 대신 우선 사용됩니다</p>
              </div>
              <div
                className="relative rounded-lg border-2 border-dashed border-gray-200 p-4 text-center cursor-pointer hover:border-[#4B9073] transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  setAttachedFiles((prev) => [...prev, ...files]);
                }}
                onClick={() => document.getElementById("freeform-attach-input")?.click()}
                data-testid="dropzone-freeform-attach"
              >
                <input
                  id="freeform-attach-input"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  disabled={isUploadingAttachments || generateMut.isPending}
                  onChange={(e) => {
                    if (e.target.files) {
                      setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                      e.target.value = "";
                    }
                  }}
                />
                <Paperclip className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                <p className="text-sm text-gray-500">파일을 드래그하거나 클릭해서 선택</p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, MP4 · 최대 50MB · 여러 파일 가능</p>
              </div>
              {attachedFiles.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-500">{attachedFiles.length}개 첨부됨</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 text-xs text-gray-600"
                        data-testid={`chip-attach-${idx}`}
                      >
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="ml-0.5 text-gray-400 hover:text-gray-700"
                          data-testid={`button-remove-attach-${idx}`}
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isUploadingAttachments || generateMut.isPending ? (
              <div className="flex items-center gap-2.5 py-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: "#4B9073" }} />
                <span>{isUploadingAttachments ? "파일 업로드 중..." : "Claude가 포스트를 작성하고 있습니다... (3~5초)"}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 leading-relaxed">
                Claude가 브랜드 컨텍스트를 참고해 캡션, 해시태그, 이미지 프롬프트를 직접 생성합니다.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFreeformOpen(false)}
              disabled={generateMut.isPending}
              data-testid="button-freeform-cancel"
            >
              취소
            </Button>
            <Button
              onClick={handleFreeformGenerate}
              disabled={!freeformTopic.trim() || generateMut.isPending || isUploadingAttachments}
              className="gap-2"
              style={{ backgroundColor: "#4B9073", color: "white" }}
              data-testid="button-freeform-generate"
            >
              {isUploadingAttachments ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  파일 업로드 중...
                </>
              ) : generateMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PROMPT CREATE/EDIT DIALOG ─────────────────────────────── */}
      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-prompt">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "프롬프트 수정" : "새 프롬프트 추가"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prompt-name">제목 (Tone 이름)</Label>
              <Input
                id="prompt-name"
                placeholder="예: Aussie Humorous Tone"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                data-testid="input-prompt-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prompt-section">섹션 유형</Label>
              <Select value={promptSection} onValueChange={setPromptSection}>
                <SelectTrigger
                  id="prompt-section"
                  data-testid="select-prompt-section"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram_post">Instagram Post</SelectItem>
                  <SelectItem value="facebook_post">Facebook Post</SelectItem>
                  <SelectItem value="tiktok_caption">TikTok Caption</SelectItem>
                  <SelectItem value="email_subject">Email Subject</SelectItem>
                  <SelectItem value="product_description">
                    Product Description
                  </SelectItem>
                  <SelectItem value="global">Global (범용)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prompt-text">
                System Instruction (프롬프트 본문)
              </Label>
              <Textarea
                id="prompt-text"
                placeholder="예: You are a witty, Australian-flavored brand voice for SpoiltDogs. Use casual Aussie slang, humor, and warmth..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={6}
                className="resize-none text-sm"
                data-testid="textarea-prompt-text"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPromptDialogOpen(false)}
              data-testid="button-prompt-cancel"
            >
              취소
            </Button>
            <Button
              onClick={handleSavePrompt}
              disabled={
                !promptName.trim() ||
                !promptText.trim() ||
                createPromptMut.isPending ||
                updatePromptMut.isPending
              }
              style={{ backgroundColor: "#4B9073", color: "white" }}
              data-testid="button-prompt-save"
            >
              {createPromptMut.isPending || updatePromptMut.isPending
                ? "저장 중..."
                : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE PROMPT CONFIRM ────────────────────────────────── */}
      <AlertDialog
        open={!!deletePromptId}
        onOpenChange={(o) => !o && setDeletePromptId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프롬프트를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 해당 프롬프트와 연결된 큐 항목에
              영향을 줄 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-prompt-cancel">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletePromptId && deletePromptMut.mutate(deletePromptId)
              }
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-delete-prompt-confirm"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DELETE QUEUE CONFIRM ─────────────────────────────────── */}
      <AlertDialog
        open={!!deleteQueueId}
        onOpenChange={(o) => !o && setDeleteQueueId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>큐 항목을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 콘텐츠 항목이 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-queue-cancel">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteQueueId && deleteQueueMut.mutate(deleteQueueId)
              }
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-delete-queue-confirm"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── REJECT DIALOG ────────────────────────────────────────── */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="sm:max-w-sm" data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle>콘텐츠 반려</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reject-reason">반려 사유 (선택)</Label>
            <Textarea
              id="reject-reason"
              placeholder="예: 브랜드 톤이 맞지 않음, 수정 필요..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              data-testid="textarea-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectId(null)}
              data-testid="button-reject-cancel"
            >
              취소
            </Button>
            <Button
              onClick={() =>
                rejectId &&
                rejectMut.mutate({ id: rejectId, reason: rejectReason })
              }
              disabled={rejectMut.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-reject-confirm"
            >
              {rejectMut.isPending ? "반려 중..." : "반려"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Credit Exhaustion Alert ─────────────────────────────────────── */}
      {creditAlert && (
        <AlertDialog open={creditAlert.open} onOpenChange={(open) => !open && setCreditAlert(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <span>💳</span> 크레딧 부족
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  <strong>{creditAlert.service}</strong> 크레딧이 부족해서 영상/이미지를 생성할 수 없습니다.
                </p>
                <p className="text-sm text-gray-500">
                  아래 링크에서 크레딧을 충전한 후 다시 시도해주세요.
                </p>
                <a
                  href={creditAlert.chargeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                >
                  🔗 {creditAlert.chargeUrl}
                </a>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCreditAlert(null)}>
                닫기
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  window.open(creditAlert.chargeUrl, "_blank");
                  setCreditAlert(null);
                }}
                style={{ backgroundColor: "#4B9073", color: "white" }}
              >
                충전하러 가기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
    </AdminLayout>
  );
}

// ── Queue Card Component ──────────────────────────────────────────
function QueueCard({
  item,
  onApprove,
  onReject,
  onDelete,
  musicTracks,
  onGenerateImage,
  onRewrite,
  isApproving,
  isRejecting,
  isGeneratingImage,
  isRewriting,
}: {
  item: MarketingQueue;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  musicTracks: any[];
  onGenerateImage: (id: string, model: string, duration: string, opts?: { audioEnabled?: boolean; musicUrl?: string | null; musicVolume?: number; motionDirective?: string }) => void;
  onRewrite: (topic: string, platform: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  isGeneratingImage: boolean;
  isRewriting: boolean;
}) {
  const [selectedVideoQuality, setSelectedVideoQuality] = useState("recommended");
  const [selectedImageModel, setSelectedImageModel] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState("8");
  const [motionDirective, setMotionDirective] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [selectedMusicId, setSelectedMusicId] = useState<string>("");
  const [musicVolume, setMusicVolume] = useState(40);
  const [showPreview, setShowPreview] = useState(false);
  const [showRegenPanel, setShowRegenPanel] = useState(false);
  const [koCaption, setKoCaption] = useState<string | null>(null);
  const [koHashtags, setKoHashtags] = useState<string | null>(null);
  const { toast } = useToast();

  const translateMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/marketing/queue/${item.id}/translate`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      setKoCaption(data.captionKo || null);
      setKoHashtags(data.hashtagsKo || null);
    },
    onError: (err: Error) => {
      toast({
        title: "번역 실패",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const isVideo = item.contentType === "reel" || item.contentType === "tiktok";
    if (!isVideo) {
      if (item.contentType === "card_news") setSelectedImageModel("ideogram");
      else setSelectedImageModel("nano-banana-2");
    }
    // video default is already "recommended"
  }, [item.contentType]);

  // Auto-close regen panel when generation finishes (isGeneratingImage flips false)
  const prevGenerating = useRef(false);
  useEffect(() => {
    if (prevGenerating.current && !isGeneratingImage && showRegenPanel) {
      setShowRegenPanel(false);
    }
    prevGenerating.current = isGeneratingImage;
  }, [isGeneratingImage, showRegenPanel]);

  const availableModels = IMAGE_MODEL_OPTIONS.filter((m) =>
    m.forTypes.includes(item.contentType || "feed_image"),
  );

  const platform = PLATFORM_META[item.platform] ?? {
    label: item.platform,
    color: "bg-gray-100 text-gray-600",
  };
  const status = STATUS_META[item.status] ?? {
    label: item.status,
    color: "bg-gray-100 text-gray-600",
  };
  const isPending = item.status === "pending";
  const isApproved = item.status === "approved";

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-5 space-y-3"
      data-testid={`queue-card-${item.id}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge text={platform.label} color={platform.color} />
          <Badge text={status.label} color={status.color} />
          {item.contentType && CONTENT_TYPE_META[item.contentType] && (
            <Badge
              text={CONTENT_TYPE_META[item.contentType].label}
              color={CONTENT_TYPE_META[item.contentType].color}
            />
          )}
          {item.topic && (
            <span className="text-xs text-gray-500 font-medium">
              {item.topic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isPending && (
            <>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={isApproving}
                className="gap-1.5 h-8 text-xs rounded-full bg-green-600 hover:bg-green-700 text-white"
                data-testid={`button-approve-${item.id}`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onRewrite(
                    item.topic || item.caption?.slice(0, 50) || "rewrite",
                    item.platform,
                  )
                }
                disabled={isRewriting}
                className="gap-1.5 h-8 text-xs rounded-full"
                data-testid={`button-rewrite-${item.id}`}
              >
                {isRewriting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                재작성
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                disabled={isRejecting}
                className="gap-1.5 h-8 text-xs rounded-full border-red-300 text-red-600 hover:bg-red-50"
                data-testid={`button-reject-${item.id}`}
              >
                <XCircle className="h-3.5 w-3.5" />
                반려
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(true)}
            className="gap-1.5 h-8 text-xs rounded-full"
            data-testid={`button-preview-${item.id}`}
          >
            <Eye className="h-3.5 w-3.5" />
            미리보기
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
            data-testid={`button-delete-queue-${item.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Generated content */}
      {item.caption && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Caption
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => translateMut.mutate()}
              disabled={translateMut.isPending}
              className="h-6 px-2 text-xs gap-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
              data-testid={`button-translate-${item.id}`}
            >
              {translateMut.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Languages className="h-3 w-3" />
              )}
              한국어 번역
            </Button>
          </div>

          {/* 원본 영문 캡션 */}
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {item.caption}
          </p>

          {/* 원본 해시태그 */}
          {item.hashtags && (
            <p className="text-xs text-blue-600 leading-relaxed">{item.hashtags}</p>
          )}

          {/* 한국어 번역 (확인용 전용 — 미리보기/포스팅에서는 사용 안 함) */}
          {koCaption && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 mt-1">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Languages className="h-3 w-3" />
                한국어 번역 (확인용)
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {koCaption}
              </p>
              {koHashtags && (
                <p className="text-xs text-blue-500 leading-relaxed mt-1">
                  {koHashtags}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hashtags — 캡션 없을 때만 단독 표시 */}
      {!item.caption && item.hashtags && (
        <p className="text-xs text-blue-600 leading-relaxed">{item.hashtags}</p>
      )}

      {/* Image / Video motion prompt */}
      {item.imagePrompt && (
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            {item.videoUrl ? "VIDEO MOTION PROMPT" : "IMAGE PROMPT"}
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            {item.imagePrompt}
          </p>
        </div>
      )}

      {/* Video + optional thumbnail (2-step pipeline output) */}
      {item.videoUrl ? (
        <div className="space-y-2 mt-3">
          {item.imageUrl && !item.imageUrl.endsWith(".mp4") && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                THUMBNAIL (STEP 1)
              </p>
              <img
                src={item.imageUrl}
                className="w-full rounded-lg max-h-32 object-cover"
                alt="Thumbnail"
                data-testid={`img-thumbnail-${item.id}`}
              />
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              GENERATED VIDEO (STEP 2)
            </p>
            <video
              src={item.videoUrl}
              controls
              playsInline
              className="w-full rounded-lg max-h-64"
              data-testid={`video-generated-${item.id}`}
            />
          </div>
        </div>
      ) : item.imageUrl && !item.imageUrl.endsWith(".mp4") ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {item.imagePrompt ? "GENERATED IMAGE" : "첨부된 사진"}
          </p>
          <img
            src={item.imageUrl}
            className="w-full rounded-lg max-h-64 object-cover"
            alt={item.imagePrompt ? "Generated" : "첨부된 사진"}
            data-testid={`img-generated-${item.id}`}
          />
        </div>
      ) : item.imageUrl && item.imageUrl.endsWith(".mp4") ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            GENERATED VIDEO
          </p>
          <video
            src={item.imageUrl}
            controls
            playsInline
            className="w-full rounded-lg max-h-64"
            data-testid={`video-generated-${item.id}`}
          />
        </div>
      ) : null}

      {/* Regenerate button — approved + media already exists */}
      {isApproved && (item.imageUrl || item.videoUrl) && !showRegenPanel && (
        <div className="pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRegenPanel(true)}
            className="w-full gap-1.5 h-8 text-xs border-dashed"
            data-testid={`button-regen-${item.id}`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            다시 생성하기
          </Button>
        </div>
      )}

      {/* Image/Video generation controls — approved + no media yet OR regen panel open */}
      {isApproved && ((!item.imageUrl && !item.videoUrl) || showRegenPanel) && (() => {
        const isVideo = item.contentType === "reel" || item.contentType === "tiktok";
        return (
          <div className="space-y-2 pt-1">
            {showRegenPanel && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">다시 생성하기</span>
                <button
                  onClick={() => setShowRegenPanel(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                  data-testid={`button-cancel-regen-${item.id}`}
                >
                  취소
                </button>
              </div>
            )}
            {isVideo ? (
              <>
                {/* Quality selector */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">영상 품질</p>
                  <div className="flex gap-2">
                    {VIDEO_QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedVideoQuality(opt.value)}
                        data-testid={`button-quality-${opt.value}-${item.id}`}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                          selectedVideoQuality === opt.value
                            ? "border-green-600 bg-green-50 text-green-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <div>{opt.label}</div>
                        <div className="text-xs opacity-60 mt-0.5">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration selector */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">영상 길이</p>
                  <div className="flex gap-2">
                    {VIDEO_DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedDuration(opt.value)}
                        data-testid={`button-duration-${opt.value}-${item.id}`}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                          selectedDuration === opt.value
                            ? "border-green-600 bg-green-50 text-green-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <div>{opt.label}</div>
                        <div className="text-xs opacity-60">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motion directive */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">장면 연출 (선택)</p>
                  <textarea
                    value={motionDirective}
                    onChange={(e) => setMotionDirective(e.target.value)}
                    placeholder="예: 공원에서 공 쫓아가다 갑자기 카메라 쪽 돌아봄"
                    className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white resize-none"
                    rows={2}
                    data-testid={`input-motion-${item.id}`}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">비워두면 캡션 기반으로 자동 생성</p>
                </div>

                {/* Audio selector */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">배경음악</p>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setAudioEnabled(false)}
                      data-testid={`button-audio-off-${item.id}`}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                        !audioEnabled
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      🔇 없음
                      <div className="text-xs opacity-60">~$0.90/8초</div>
                    </button>
                    <button
                      onClick={() => setAudioEnabled(true)}
                      data-testid={`button-audio-on-${item.id}`}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                        audioEnabled
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      🎵 있음
                      <div className="text-xs opacity-60">~$1.34/8초</div>
                    </button>
                  </div>
                  {audioEnabled && (
                    <div className="space-y-2 pl-1">
                      <select
                        value={selectedMusicId}
                        onChange={(e) => setSelectedMusicId(e.target.value)}
                        className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white"
                        data-testid={`select-music-${item.id}`}
                      >
                        <option value="">음악 선택...</option>
                        {musicTracks.filter((m: any) => m.isActive).map((m: any) => {
                          let meta: any = {};
                          try { meta = JSON.parse(m.content ?? "{}"); } catch {}
                          return (
                            <option key={m.id} value={m.id}>
                              {m.title}{meta.mood ? ` · ${meta.mood}` : ""}
                            </option>
                          );
                        })}
                      </select>
                      {musicTracks.filter((m: any) => m.isActive).length === 0 && (
                        <p className="text-xs text-amber-600">
                          활성 음악이 없습니다. 브랜드 스튜디오 → 음악 라이브러리에서 업로드하세요.
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-10">볼륨</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={musicVolume}
                          onChange={(e) => setMusicVolume(Number(e.target.value))}
                          className="flex-1"
                          data-testid={`input-music-volume-${item.id}`}
                        />
                        <span className="text-xs text-gray-700 w-8 text-right">{musicVolume}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate video button */}
                <Button
                  size="sm"
                  onClick={() => {
                    const qualityOption = VIDEO_QUALITY_OPTIONS.find(q => q.value === selectedVideoQuality);
                    const selectedTrack = musicTracks.find((m: any) => m.id === selectedMusicId);
                    let musicUrl: string | null = null;
                    if (audioEnabled && selectedTrack) {
                      try {
                        musicUrl = JSON.parse(selectedTrack.content ?? "{}").url ?? null;
                      } catch {}
                    }
                    onGenerateImage(item.id, qualityOption?.model || "kling-3", selectedDuration, {
                      audioEnabled,
                      musicUrl,
                      musicVolume,
                      motionDirective: motionDirective || undefined,
                    });
                  }}
                  disabled={isGeneratingImage}
                  className="w-full gap-1.5 h-8 text-xs"
                  style={{ backgroundColor: "#4B9073", color: "white" }}
                  data-testid={`button-generate-image-${item.id}`}
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      영상 생성 중...
                    </>
                  ) : (
                    <>
                      <Film className="h-3.5 w-3.5" />
                      영상 생성
                    </>
                  )}
                </Button>
              </>
            ) : item.contentType === "card_news" ? (
              <>
                {/* Card news pipeline info */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                  <p className="text-xs font-medium text-blue-700 mb-0.5">🃏 카드뉴스 생성</p>
                  <p className="text-xs text-blue-600">
                    1단계: Nano Banana 2로 국둥이 이미지 생성<br/>
                    2단계: Sharp로 텍스트 오버레이 합성
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onGenerateImage(item.id, "card_news", "0")}
                  disabled={isGeneratingImage}
                  className="w-full gap-1.5 h-8 text-xs"
                  style={{ backgroundColor: "#4B9073", color: "white" }}
                  data-testid={`button-generate-image-${item.id}`}
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      카드뉴스 생성 중...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-3.5 w-3.5" />
                      카드뉴스 생성
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Image model selector */}
                <Select
                  value={selectedImageModel}
                  onValueChange={setSelectedImageModel}
                >
                  <SelectTrigger
                    className="w-full text-xs h-8"
                    data-testid={`select-model-${item.id}`}
                  >
                    <SelectValue placeholder="AI 모델 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{m.label}</span>
                          <span className="text-gray-400 text-xs">{m.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Generate image button */}
                <Button
                  size="sm"
                  onClick={() => onGenerateImage(item.id, selectedImageModel, "0")}
                  disabled={isGeneratingImage || !selectedImageModel}
                  className="w-full gap-1.5 h-8 text-xs"
                  style={{ backgroundColor: "#4B9073", color: "white" }}
                  data-testid={`button-generate-image-${item.id}`}
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-3.5 w-3.5" />
                      이미지 생성
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        );
      })()}

      {/* Rejection reason */}
      {item.rejectionReason && (
        <div className="bg-red-50 rounded-lg px-3 py-2">
          <p className="text-xs text-red-600">
            <span className="font-semibold">반려 사유:</span>{" "}
            {item.rejectionReason}
          </p>
        </div>
      )}

      {/* Timestamps */}
      <p className="text-xs text-gray-400">
        생성일:{" "}
        {item.createdAt
          ? new Date(item.createdAt).toLocaleString("ko-KR")
          : "—"}
      </p>

      {/* Instagram preview modal */}
      {showPreview && (
        <InstagramPreview item={item} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

// ── Instagram Preview Modal ───────────────────────────────────────────────────
function InstagramPreview({
  item,
  onClose,
}: {
  item: MarketingQueue;
  onClose: () => void;
}) {
  const isVideo = item.contentType === "reel" || item.contentType === "tiktok";
  const isStory = item.contentType === "story_image";
  const caption = item.caption || "";
  const hashtags = item.hashtags || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1"
        >
          <XIcon className="h-4 w-4" /> 닫기
        </button>

        {/* Platform label */}
        <div className="text-white/60 text-xs uppercase tracking-widest">
          {item.platform === "instagram"
            ? "Instagram 미리보기"
            : item.platform === "facebook"
              ? "Facebook 미리보기"
              : item.platform === "tiktok"
                ? "TikTok 미리보기"
                : "미리보기"}
        </div>

        {/* iPhone frame */}
        <div
          className="relative bg-white rounded-[44px] overflow-hidden shadow-2xl border-4 border-gray-800"
          style={{ width: 375, height: 812 }}
        >
          {/* Status bar */}
          <div className="bg-white flex justify-between items-center px-6 pt-3 pb-1 relative">
            <span className="text-xs font-semibold">9:41</span>
            <div
              className="absolute left-1/2 -translate-x-1/2 top-2 bg-black rounded-full"
              style={{ width: 120, height: 28 }}
            />
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 border border-black rounded-sm relative">
                <div
                  className="absolute inset-0.5 bg-black rounded-sm"
                  style={{ width: "70%" }}
                />
              </div>
            </div>
          </div>

          {/* Instagram UI */}
          <div className="overflow-y-auto bg-white" style={{ height: 700 }}>
            {/* Instagram Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <span
                className="font-bold text-base"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Instagram
              </span>
              <div className="flex items-center gap-4">
                <Heart className="h-6 w-6" />
                <MessageCircle className="h-6 w-6" />
              </div>
            </div>

            {/* Story bar */}
            <div className="flex gap-3 px-4 py-3 overflow-x-auto border-b border-gray-100">
              {["spoiltdogs", "gukdung", "australia", "pets"].map((name, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
                    <div className="w-full h-full rounded-full bg-gray-200 border-2 border-white" />
                  </div>
                  <span className="text-xs text-gray-600 truncate w-14 text-center">
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {/* Post */}
            <div className="border-b border-gray-100 pb-2">
              {/* Post header */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
                    <div className="w-full h-full rounded-full bg-amber-100 border border-white flex items-center justify-center">
                      <span className="text-xs">🐾</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold">
                      spoiltdogs.com.au
                    </div>
                    <div className="text-xs text-gray-400">
                      Sydney, Australia
                    </div>
                  </div>
                </div>
                <span className="text-gray-400 text-lg">···</span>
              </div>

              {/* Post image / video / placeholder */}
              {item.videoUrl ? (
                <div
                  className="w-full bg-black relative overflow-hidden"
                  style={{
                    aspectRatio: isStory ? "9/16" : "9/16",
                    maxHeight: isStory ? 500 : 375,
                  }}
                >
                  <video
                    src={item.videoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <Film className="h-5 w-5 text-white drop-shadow" />
                  </div>
                </div>
              ) : item.imageUrl ? (
                <div
                  className="w-full bg-gray-100 relative overflow-hidden"
                  style={{
                    aspectRatio: isStory ? "9/16" : "1/1",
                    maxHeight: isStory ? 500 : 375,
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white fill-white ml-1" />
                      </div>
                    </div>
                  )}
                  {isVideo && (
                    <div className="absolute top-3 right-3">
                      <Film className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="w-full bg-gradient-to-br from-amber-50 to-green-50 flex items-center justify-center"
                  style={{ height: 375 }}
                >
                  <div className="text-center text-gray-400">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">이미지 생성 후 미리보기 가능</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-4">
                  <Heart className="h-6 w-6" />
                  <MessageCircle className="h-6 w-6" />
                  <Send className="h-6 w-6 -rotate-12" />
                </div>
                <Bookmark className="h-6 w-6" />
              </div>

              {/* Likes */}
              <div className="px-3">
                <span className="text-xs font-semibold">좋아요 0개</span>
              </div>

              {/* Caption */}
              <div className="px-3 pt-1 pb-2">
                <span className="text-xs font-semibold mr-1">
                  spoiltdogs.com.au
                </span>
                <span className="text-xs text-gray-800 whitespace-pre-line">
                  {caption.length > 150
                    ? caption.slice(0, 150) + "... 더 보기"
                    : caption}
                </span>
                {hashtags && (
                  <div className="mt-1">
                    <span className="text-xs text-blue-500">
                      {hashtags.length > 100
                        ? hashtags.slice(0, 100) + "..."
                        : hashtags}
                    </span>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="px-3">
                <span className="text-xs text-gray-400">방금 전</span>
              </div>
            </div>

            <div className="px-3 py-4 text-center text-gray-300 text-xs">
              — 피드 끝 —
            </div>
          </div>

          {/* Instagram bottom nav */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-4">
            <Home className="h-6 w-6" />
            <Search className="h-6 w-6 text-gray-400" />
            <div className="w-6 h-6 rounded-md bg-gray-200" />
            <Film className="h-6 w-6 text-gray-400" />
            <div className="w-7 h-7 rounded-full bg-amber-100 border border-gray-300" />
          </div>
        </div>

        <p className="text-white/40 text-xs">
          실제 게시 시 보이는 화면과 유사합니다
        </p>
      </div>
    </div>
  );
}
