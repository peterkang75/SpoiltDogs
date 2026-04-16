import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Pencil,
  Trash2,
  Image,
  Cpu,
  BookOpen,
  Dog,
  Loader2,
  ImagePlus,
  X,
  CheckCircle,
  Save,
  Palette,
  Music,
  Upload,
  Play,
  Pause,
} from "lucide-react";
import type { BrandContext, GukdungImage } from "@shared/schema";

// ── Brand Identity constants ───────────────────────────────────────
const GOOGLE_FONTS = [
  "Inter", "Fraunces", "Playfair Display", "Montserrat",
  "Lato", "Poppins", "Raleway", "Nunito", "Merriweather",
  "Source Sans Pro", "Roboto", "Open Sans", "DM Sans",
  "DM Serif Display", "Cormorant Garamond", "Josefin Sans",
];

const MUSIC_MOODS = [
  { value: "calm", label: "잔잔" },
  { value: "upbeat", label: "경쾌" },
  { value: "emotional", label: "감성" },
  { value: "energetic", label: "에너지" },
  { value: "seasonal", label: "시즌" },
];

function formatDuration(sec: number): string {
  if (!sec || sec < 1) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface MusicMeta {
  url: string;
  mood: string;
  durationSec: number;
  fileName: string;
  sizeBytes: number;
}

const TEXT_STYLES = [
  { value: "light_on_dark", label: "밝은 텍스트 + 어두운 배경" },
  { value: "dark_on_light", label: "어두운 텍스트 + 밝은 배경" },
  { value: "brand_on_white", label: "브랜드 컬러 텍스트 + 흰 배경" },
];

interface BrandIdentity {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  textStyle: string;
}

const DEFAULT_BRAND_IDENTITY: BrandIdentity = {
  primaryColor: "#4B9073",
  secondaryColor: "#FCF9F1",
  accentColor: "#E8B84B",
  headingFont: "Fraunces",
  bodyFont: "Inter",
  textStyle: "light_on_dark",
};

const CONTEXT_TYPE_META: Record<string, { label: string; tab: string }> = {
  gukdung_profile: { label: "Gukdung 프로필", tab: "profile" },
  brand_voice: { label: "브랜드 보이스", tab: "voice" },
  campaign_memory: { label: "캠페인 메모리", tab: "memory" },
  post_guideline: { label: "포스트 가이드라인", tab: "memory" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-stone-200 ${className ?? ""}`} />;
}

function ContextCard({
  item,
  onEdit,
  onDelete,
}: {
  item: BrandContext;
  onEdit: (item: BrandContext) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
      data-testid={`context-card-${item.id}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#1a3a2e]">{item.title}</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              item.isActive
                ? "bg-green-100 text-green-700"
                : "bg-stone-100 text-stone-500"
            }`}
          >
            {item.isActive ? "활성" : "비활성"}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="ghost"
            data-testid={`edit-context-${item.id}`}
            onClick={() => onEdit(item)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-700"
            data-testid={`delete-context-${item.id}`}
            onClick={() => onDelete(item.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-stone-600 line-clamp-4">
        {item.content}
      </p>
    </div>
  );
}

function ImageCard({
  image,
  onEdit,
  onDelete,
  onToggleVideoRef,
  videoRefDisabled,
}: {
  image: GukdungImage;
  onEdit: (image: GukdungImage) => void;
  onDelete: (id: string) => void;
  onToggleVideoRef: (image: GukdungImage) => void;
  videoRefDisabled: boolean;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
      data-testid={`image-card-${image.id}`}
    >
      <div className="relative aspect-square bg-stone-100">
        <img
          src={image.imageUrl}
          alt={image.description ?? "Gukdung image"}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.pexels.com/photos/4587998/pexels-photo-4587998.jpeg?auto=compress&cs=tinysrgb&w=400";
          }}
        />
        <div className="absolute right-2 top-2 flex gap-1">
          {image.isTrainingData && (
            <span className="rounded-full bg-[#4B9073] px-2 py-0.5 text-xs font-semibold text-white">
              학습용
            </span>
          )}
          {image.isVideoReference && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
              ⭐ 영상참조
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleVideoRef(image)}
          disabled={videoRefDisabled && !image.isVideoReference}
          title={image.isVideoReference ? "영상참조 해제" : (videoRefDisabled ? "이미 7장 선택됨 — 다른 장 해제 후 선택 가능" : "영상참조로 지정")}
          className={`absolute left-2 top-2 rounded-full p-1.5 text-xs font-semibold transition ${
            image.isVideoReference
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : videoRefDisabled
                ? "bg-white/80 text-stone-300 cursor-not-allowed"
                : "bg-white/80 text-stone-500 hover:bg-amber-100 hover:text-amber-600"
          }`}
          data-testid={`toggle-video-ref-${image.id}`}
        >
          {image.isVideoReference ? "⭐" : "☆"}
        </button>
      </div>
      <div className="p-3">
        {image.description && (
          <p className="mb-1 text-sm font-medium text-[#1a3a2e] line-clamp-2">
            {image.description}
          </p>
        )}
        {image.tags && (
          <p className="mb-2 text-xs text-stone-400">{image.tags}</p>
        )}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-xs"
            data-testid={`edit-image-${image.id}`}
            onClick={() => onEdit(image)}
          >
            <Pencil size={12} className="mr-1" />
            수정
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-700"
            data-testid={`delete-image-${image.id}`}
            onClick={() => onDelete(image.id)}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBrandStudio() {
  const { toast } = useToast();

  // ── Context dialog state ──────────────────────────────────────────
  const [contextDialogOpen, setContextDialogOpen] = useState(false);
  const [editingContext, setEditingContext] = useState<BrandContext | null>(null);
  const [ctxType, setCtxType] = useState("gukdung_profile");
  const [ctxTitle, setCtxTitle] = useState("");
  const [ctxContent, setCtxContent] = useState("");
  const [ctxActive, setCtxActive] = useState(true);

  // ── Image dialog state ────────────────────────────────────────────
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GukdungImage | null>(null);
  const [imgDesc, setImgDesc] = useState("");
  const [imgTags, setImgTags] = useState("");
  const [imgTraining, setImgTraining] = useState(false);

  // ── Upload dialog state ───────────────────────────────────────────
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadTraining, setUploadTraining] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  // ── Delete confirm state ──────────────────────────────────────────
  const [deleteContextId, setDeleteContextId] = useState<string | null>(null);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);

  // ── LoRA polling state ────────────────────────────────────────────
  const [loraRequestId, setLoraRequestId] = useState<string | null>(null);
  const [loraPollingStatus, setLoraPollingStatus] = useState<"in_queue" | "in_progress" | "completed" | "failed" | null>(null);
  const [loraResultModelId, setLoraResultModelId] = useState<string>("");
  const [loraProgress, setLoraProgress] = useState<number>(0);
  const [loraQueuePosition, setLoraQueuePosition] = useState<number | null>(null);
  const [loraStartTime, setLoraStartTime] = useState<number | null>(null);
  const loraPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loraTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Brand Identity state ───────────────────────────────────────────
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>(DEFAULT_BRAND_IDENTITY);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  // ── Music library state ───────────────────────────────────────────
  const [musicDialogOpen, setMusicDialogOpen] = useState(false);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTitle, setMusicTitle] = useState("");
  const [musicMood, setMusicMood] = useState("calm");
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────
  const { data: contextItems = [], isLoading: contextLoading } = useQuery<BrandContext[]>({
    queryKey: ["/api/admin/brand/context"],
  });

  const { data: images = [], isLoading: imagesLoading } = useQuery<GukdungImage[]>({
    queryKey: ["/api/admin/brand/images"],
  });

  // ── Load brand identity from contextItems ─────────────────────────
  useEffect(() => {
    const identityItem = contextItems.find((i) => i.type === "brand_identity" && i.isActive);
    if (identityItem) {
      try {
        const parsed = JSON.parse(identityItem.content);
        setBrandIdentity({ ...DEFAULT_BRAND_IDENTITY, ...parsed });
      } catch {}
    }
  }, [contextItems]);

  // ── Save brand identity ───────────────────────────────────────────
  const handleSaveBrandIdentity = async () => {
    setIsSavingIdentity(true);
    try {
      const response = await fetch("/api/admin/brand/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(brandIdentity),
      });
      if (!response.ok) throw new Error("Save failed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/context"] });
      toast({ title: "브랜드 아이덴티티 저장 완료 ✅" });
    } catch {
      toast({ title: "저장 실패", variant: "destructive" });
    } finally {
      setIsSavingIdentity(false);
    }
  };

  // ── Context mutations ─────────────────────────────────────────────
  const createContext = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/admin/brand/context", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/context"] });
      toast({ title: "항목이 추가됐습니다." });
      closeContextDialog();
    },
    onError: () => toast({ title: "오류가 발생했습니다.", variant: "destructive" }),
  });

  const updateContext = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      apiRequest("PATCH", `/api/admin/brand/context/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/context"] });
      toast({ title: "항목이 수정됐습니다." });
      closeContextDialog();
    },
    onError: () => toast({ title: "오류가 발생했습니다.", variant: "destructive" }),
  });

  const deleteContext = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/brand/context/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/context"] });
      toast({ title: "항목이 삭제됐습니다." });
      setDeleteContextId(null);
    },
    onError: () => toast({ title: "오류가 발생했습니다.", variant: "destructive" }),
  });

  // ── Image mutations ───────────────────────────────────────────────
  const createImage = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/admin/brand/images", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/images"] });
      toast({ title: "사진이 추가됐습니다." });
      closeImageDialog();
    },
    onError: () => toast({ title: "오류가 발생했습니다.", variant: "destructive" }),
  });

  const updateImage = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      apiRequest("PATCH", `/api/admin/brand/images/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/images"] });
      toast({ title: "사진이 수정됐습니다." });
      closeImageDialog();
    },
    onError: () => toast({ title: "오류가 발생했습니다.", variant: "destructive" }),
  });

  const deleteImage = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/brand/images/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/images"] });
      toast({ title: "사진이 삭제됐습니다." });
      setDeleteImageId(null);
    },
    onError: () => toast({ title: "오류가 발생했습니다.", variant: "destructive" }),
  });

  const loraTrainMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/brand/lora-train", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.requestId) {
        setLoraRequestId(data.requestId);
        setLoraPollingStatus("in_queue");
        setLoraProgress(0);
        setLoraStartTime(Date.now());
        toast({
          title: "LoRA 학습 시작됨",
          description: `${data.trainedWith}장으로 학습 중... 5~15분 소요됩니다.`,
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "LoRA 학습 실패",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // ── LoRA time-based progress timer ───────────────────────────────
  // FAL.AI doesn't expose step-level progress, so we estimate based on elapsed time.
  // Assumption: training takes ~10 minutes (600s). Progress goes 0→95% over that range.
  useEffect(() => {
    if (!loraStartTime || !loraRequestId) return;

    const ESTIMATED_DURATION_MS = 10 * 60 * 1000; // 10 minutes

    const tick = () => {
      const elapsed = Date.now() - loraStartTime;
      const raw = (elapsed / ESTIMATED_DURATION_MS) * 95;
      setLoraProgress(Math.min(Math.round(raw), 95));
    };

    tick();
    loraTimerRef.current = setInterval(tick, 3000); // update every 3s

    return () => {
      if (loraTimerRef.current) clearInterval(loraTimerRef.current);
    };
  }, [loraStartTime, loraRequestId]);

  // ── LoRA polling effect ───────────────────────────────────────────
  useEffect(() => {
    if (!loraRequestId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/brand/lora-status/${loraRequestId}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setLoraPollingStatus(data.status);

        if (data.queuePosition != null) setLoraQueuePosition(data.queuePosition);

        if (data.status === "completed") {
          setLoraProgress(100);
          setLoraResultModelId(data.loraModelId ?? "");
          setLoraRequestId(null);
          setLoraStartTime(null);
          if (loraTimerRef.current) clearInterval(loraTimerRef.current);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/images"] });
          toast({
            title: "LoRA 학습 완료!",
            description: `모델이 저장됐습니다.`,
          });
        } else if (data.status === "failed") {
          setLoraRequestId(null);
          setLoraStartTime(null);
          setLoraProgress(0);
          if (loraTimerRef.current) clearInterval(loraTimerRef.current);
          toast({
            title: "LoRA 학습 실패",
            description: "FAL.AI에서 학습에 실패했습니다.",
            variant: "destructive",
          });
        }
      } catch {
        // ignore network errors during poll
      }
    };

    poll();
    loraPollingRef.current = setInterval(poll, 10000);

    return () => {
      if (loraPollingRef.current) clearInterval(loraPollingRef.current);
    };
  }, [loraRequestId]);

  // ── Helpers ───────────────────────────────────────────────────────
  function openNewContext(type: string) {
    setEditingContext(null);
    setCtxType(type);
    setCtxTitle("");
    setCtxContent("");
    setCtxActive(true);
    setContextDialogOpen(true);
  }

  function openEditContext(item: BrandContext) {
    setEditingContext(item);
    setCtxType(item.type);
    setCtxTitle(item.title);
    setCtxContent(item.content);
    setCtxActive(item.isActive);
    setContextDialogOpen(true);
  }

  function closeContextDialog() {
    setContextDialogOpen(false);
    setEditingContext(null);
    setCtxTitle("");
    setCtxContent("");
  }

  function submitContext() {
    const payload = { type: ctxType, title: ctxTitle, content: ctxContent, isActive: ctxActive };
    if (editingContext) {
      updateContext.mutate({ id: editingContext.id, data: payload });
    } else {
      createContext.mutate(payload);
    }
  }

  function openNewImage() {
    setSelectedFiles([]);
    setUploadDesc("");
    setUploadTags("");
    setUploadTraining(true);
    setUploadCount(0);
    setUploadDialogOpen(true);
  }

  function closeUploadDialog() {
    setUploadDialogOpen(false);
    setSelectedFiles([]);
    setUploadDesc("");
    setUploadTags("");
    setUploadTraining(true);
    setIsUploading(false);
    setUploadCount(0);
  }

  function openEditImage(image: GukdungImage) {
    setEditingImage(image);
    setImgDesc(image.description ?? "");
    setImgTags(image.tags ?? "");
    setImgTraining(image.isTrainingData);
    setImageDialogOpen(true);
  }

  function closeImageDialog() {
    setImageDialogOpen(false);
    setEditingImage(null);
    setImgDesc("");
    setImgTags("");
    setImgTraining(false);
  }

  function submitImage() {
    if (!editingImage) return;
    const payload = { description: imgDesc || undefined, tags: imgTags || undefined, isTrainingData: imgTraining };
    updateImage.mutate({ id: editingImage.id, data: payload });
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadCount(0);
    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      if (uploadDesc) formData.append("description", uploadDesc);
      if (uploadTags) formData.append("tags", uploadTags);
      formData.append("isTrainingData", String(uploadTraining));

      const res = await fetch("/api/admin/brand/images/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadCount(data.uploaded ?? 0);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/images"] });
      toast({ title: `${data.uploaded ?? 0}장 업로드 완료!` });
      closeUploadDialog();
    } catch (err: any) {
      toast({ title: err.message || "업로드 실패", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    setSelectedFiles((prev) => [...prev, ...files]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const profileItems = contextItems.filter((i) => i.type === "gukdung_profile");
  const voiceItems = contextItems.filter((i) => i.type === "brand_voice");
  const memoryItems = contextItems.filter((i) => i.type === "campaign_memory" || i.type === "post_guideline");
  const imageGuidelineItems = contextItems.filter((i) => i.type === "image_guideline");
  const musicItems = contextItems.filter((i) => i.type === "brand_music");

  const handleUploadMusic = async () => {
    if (!musicFile || !musicTitle.trim()) {
      toast({ title: "파일과 제목을 입력하세요", variant: "destructive" });
      return;
    }
    setIsUploadingMusic(true);
    try {
      const formData = new FormData();
      formData.append("file", musicFile);
      formData.append("title", musicTitle);
      formData.append("mood", musicMood);
      const response = await fetch("/api/admin/brand/music/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "업로드 실패");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/context"] });
      toast({ title: "음악 업로드 완료" });
      setMusicDialogOpen(false);
      setMusicFile(null);
      setMusicTitle("");
      setMusicMood("calm");
    } catch (err: any) {
      toast({ title: "업로드 실패", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingMusic(false);
    }
  };

  const handleToggleMusicActive = async (id: string, isActive: boolean) => {
    try {
      await apiRequest("PATCH", `/api/admin/brand/music/${id}`, { isActive });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/context"] });
    } catch (err: any) {
      toast({ title: "변경 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteMusic = async (id: string) => {
    if (!confirm("이 음악을 삭제하시겠습니까?")) return;
    try {
      await apiRequest("DELETE", `/api/admin/brand/music/${id}`, undefined);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/context"] });
      toast({ title: "삭제 완료" });
    } catch (err: any) {
      toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
    }
  };
  const trainingCount = images.filter((i) => i.isTrainingData).length;
  const videoRefCount = images.filter((i) => i.isVideoReference).length;

  const handleToggleVideoRef = async (image: GukdungImage) => {
    const next = !image.isVideoReference;
    if (next && videoRefCount >= 7) {
      toast({
        title: "최대 7장까지",
        description: "Kling O1 제한 — 다른 사진을 해제한 뒤 다시 선택하세요.",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiRequest("PATCH", `/api/admin/brand/images/${image.id}`, { isVideoReference: next });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/brand/images"] });
    } catch (err: any) {
      toast({ title: "업데이트 실패", description: err.message, variant: "destructive" });
    }
  };
  const contextPending = createContext.isPending || updateContext.isPending;
  const imagePending = updateImage.isPending;

  function ContextTabContent({
    items,
    type,
    loading,
    addLabel,
    placeholder,
    description,
  }: {
    items: BrandContext[];
    type: string;
    loading: boolean;
    addLabel: string;
    placeholder: string;
    description?: { text: string; badge: string; badgeColor: string; bg: string; border: string };
  }) {
    return (
      <div>
        {description && (
          <div className={`mb-4 rounded-xl border px-4 py-3 flex items-start gap-3 ${description.bg} ${description.border}`}>
            <span className={`mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${description.badgeColor}`}>{description.badge}</span>
            <p className="text-sm text-stone-600 leading-relaxed">{description.text}</p>
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-stone-500">
            {items.length}개 항목
          </p>
          <Button
            size="sm"
            className="bg-[#4B9073] text-white hover:bg-[#3d7860]"
            data-testid={`add-context-${type}`}
            onClick={() => openNewContext(type)}
          >
            <Plus size={14} className="mr-1" />
            {addLabel}
          </Button>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((n) => <Skeleton key={n} className="h-40" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-stone-200 p-12 text-center">
            <p className="text-stone-400">아직 항목이 없습니다.</p>
            <p className="mt-1 text-sm text-stone-300">{placeholder}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <ContextCard
                key={item.id}
                item={item}
                onEdit={openEditContext}
                onDelete={setDeleteContextId}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      {/* Body */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-xl font-bold mb-6" style={{ color: "#1a3a2e", fontFamily: "Fraunces, serif" }}>브랜드 스튜디오</h1>
        <Tabs defaultValue="profile">
          <TabsList className="mb-6 w-full justify-start gap-1 bg-stone-100 p-1">
            <TabsTrigger value="profile" className="gap-1.5 data-testid:tab-profile" data-testid="tab-profile">
              <Dog size={14} />
              Gukdung 프로필
            </TabsTrigger>
            <TabsTrigger value="voice" data-testid="tab-voice">
              <BookOpen size={14} className="mr-1" />
              브랜드 보이스
            </TabsTrigger>
            <TabsTrigger value="images" data-testid="tab-images">
              <Image size={14} className="mr-1" />
              이미지 라이브러리
            </TabsTrigger>
            <TabsTrigger value="memory" data-testid="tab-memory">
              <Cpu size={14} className="mr-1" />
              캠페인 메모리
            </TabsTrigger>
            <TabsTrigger value="identity" data-testid="tab-identity">
              <Palette size={14} className="mr-1" />
              브랜드 아이덴티티
            </TabsTrigger>
            <TabsTrigger value="music" data-testid="tab-music">
              <Music size={14} className="mr-1" />
              음악 라이브러리
            </TabsTrigger>
          </TabsList>

          {/* Tab 1 — Gukdung 프로필 */}
          <TabsContent value="profile">
            <ContextTabContent
              items={profileItems}
              type="gukdung_profile"
              loading={contextLoading}
              addLabel="프로필 추가"
              placeholder="Gukdung의 품종, 나이, 성격 등을 입력하세요."
              description={{
                badge: "항상 적용",
                badgeColor: "bg-emerald-100 text-emerald-700",
                bg: "bg-emerald-50/50",
                border: "border-emerald-100",
                text: "브랜드 캐릭터 Gukdung의 기본 설정입니다. 품종·나이·성격·좋아하는 것 등을 적어두면 모든 포스트 생성 시 Claude가 자동으로 참조합니다.",
              }}
            />
          </TabsContent>

          {/* Tab 2 — 브랜드 보이스 */}
          <TabsContent value="voice">
            <ContextTabContent
              items={voiceItems}
              type="brand_voice"
              loading={contextLoading}
              addLabel="가이드 추가"
              placeholder="톤앤매너, 필수 해시태그, 금지어 등을 입력하세요."
              description={{
                badge: "항상 적용",
                badgeColor: "bg-emerald-100 text-emerald-700",
                bg: "bg-emerald-50/50",
                border: "border-emerald-100",
                text: "포스팅하는 나의 페르소나, 브랜드 말투, 금지어 등 기본 정체성을 정의합니다. 마케팅에서 프롬프트를 선택하지 않아도 이 내용은 항상 Claude에 포함됩니다. \"나는 누구인가\"를 여기에 적으세요.",
              }}
            />
          </TabsContent>

          {/* Tab 3 — 이미지 라이브러리 */}
          <TabsContent value="images">
            <div>
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-stone-500">
                    {images.length}장 총 &nbsp;·&nbsp; 학습용: {trainingCount}장 &nbsp;·&nbsp;{" "}
                    <span className={videoRefCount === 7 ? "text-amber-600 font-semibold" : videoRefCount > 7 ? "text-red-600 font-semibold" : ""}>
                      ⭐ 영상참조: {videoRefCount}/7
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loraTrainMut.mutate()}
                      disabled={loraTrainMut.isPending || !!loraRequestId}
                      data-testid="lora-train-btn"
                      className="border-[#4B9073] text-[#4B9073] gap-1.5"
                    >
                      {loraTrainMut.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          ZIP 준비 중...
                        </>
                      ) : loraRequestId ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          학습 진행 중...
                        </>
                      ) : (
                        <>
                          <Cpu size={14} />
                          LoRA 학습
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#4B9073] text-white hover:bg-[#3d7860]"
                      data-testid="add-image-btn"
                      onClick={openNewImage}
                    >
                      <Plus size={14} className="mr-1" />
                      사진 추가
                    </Button>
                  </div>
                </div>

                {/* LoRA training status bar */}
                {loraRequestId && loraPollingStatus && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 space-y-2" data-testid="lora-status-bar">
                    <div className="flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin shrink-0 text-amber-600" />
                      <span className="flex-1">
                        {loraPollingStatus === "in_queue" && (
                          loraQueuePosition != null
                            ? `학습 시작 대기 중 — 대기 ${loraQueuePosition}번째`
                            : "학습 시작 대기 중 — 잠시 후 자동으로 시작됩니다"
                        )}
                        {loraPollingStatus === "in_progress" && "AI 학습 진행 중 (예상)"}
                      </span>
                      <span className="font-mono font-semibold text-amber-600 shrink-0">
                        {loraPollingStatus === "in_progress" ? `${loraProgress}%` : ""}
                      </span>
                    </div>
                    {loraPollingStatus === "in_progress" && (
                      <Progress value={loraProgress} className="h-2 bg-amber-100 [&>div]:bg-amber-500 [&>div]:transition-all [&>div]:duration-1000" />
                    )}
                  </div>
                )}

                {/* LoRA completed result */}
                {loraPollingStatus === "completed" && loraResultModelId && (
                  <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800" data-testid="lora-complete-bar">
                    <CheckCircle size={13} className="mt-0.5 shrink-0 text-green-600" />
                    <div className="min-w-0">
                      <p className="font-semibold">LoRA 학습 완료!</p>
                      <p className="mt-0.5 break-all font-mono text-green-600">{loraResultModelId}</p>
                    </div>
                  </div>
                )}
              </div>
              {imagesLoading ? (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((n) => <Skeleton key={n} className="aspect-square rounded-xl" />)}
                </div>
              ) : images.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-stone-200 p-12 text-center">
                  <Image size={40} className="mx-auto mb-3 text-stone-300" />
                  <p className="text-stone-400">아직 사진이 없습니다.</p>
                  <p className="mt-1 text-sm text-stone-300">Gukdung 사진 15장 이상을 업로드하면 LoRA 학습이 가능합니다.</p>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  {images.map((img) => (
                    <ImageCard
                      key={img.id}
                      image={img}
                      onEdit={openEditImage}
                      onDelete={setDeleteImageId}
                      onToggleVideoRef={handleToggleVideoRef}
                      videoRefDisabled={videoRefCount >= 7}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 4 — 캠페인 메모리 */}
          <TabsContent value="memory">
            <div className="space-y-8">

              {/* ── 이미지 생성 가이드라인 ── */}
              <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: "#1a3a2e" }}>
                      🎨 이미지 생성 가이드라인
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      이미지 생성 시 FAL.AI에 직접 전달되는 시각적 가이드라인
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 bg-[#4B9073] text-white hover:bg-[#3d7860]"
                    data-testid="add-image-guideline-btn"
                    onClick={() => openNewContext("image_guideline")}
                  >
                    <Plus size={14} className="mr-1" />
                    이미지 가이드라인 추가
                  </Button>
                </div>
                {contextLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2].map((n) => <Skeleton key={n} className="h-40" />)}
                  </div>
                ) : imageGuidelineItems.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-blue-100 p-8 text-center bg-blue-50/30">
                    <p className="text-stone-400 text-sm">아직 이미지 가이드라인이 없습니다.</p>
                    <p className="mt-1 text-xs text-stone-300">배경, 조명, 스타일, 금지사항 등을 추가하세요.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {imageGuidelineItems.map((item) => (
                      <ContextCard
                        key={item.id}
                        item={item}
                        onEdit={openEditContext}
                        onDelete={setDeleteContextId}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── 캠페인 메모 & 포스트 가이드라인 ── */}
              <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: "#1a3a2e" }}>
                      📋 캠페인 메모 & 포스트 가이드라인
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Claude 캡션 생성 시 참조되는 컨텍스트
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#4B9073] text-[#4B9073]"
                      data-testid="add-campaign-btn"
                      onClick={() => openNewContext("campaign_memory")}
                    >
                      <Plus size={14} className="mr-1" />
                      캠페인 메모
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#4B9073] text-white hover:bg-[#3d7860]"
                      data-testid="add-guideline-btn"
                      onClick={() => openNewContext("post_guideline")}
                    >
                      <Plus size={14} className="mr-1" />
                      포스트 가이드라인
                    </Button>
                  </div>
                </div>
                {contextLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2].map((n) => <Skeleton key={n} className="h-40" />)}
                  </div>
                ) : memoryItems.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-stone-200 p-8 text-center">
                    <p className="text-stone-400 text-sm">아직 항목이 없습니다.</p>
                    <p className="mt-1 text-xs text-stone-300">과거 성공 사례, 시즌별 캠페인 메모 등을 기록하세요.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {memoryItems.map((item) => (
                      <ContextCard
                        key={item.id}
                        item={item}
                        onEdit={openEditContext}
                        onDelete={setDeleteContextId}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          </TabsContent>

          {/* Tab 5 — 브랜드 아이덴티티 */}
          <TabsContent value="identity">
            <div className="space-y-8">

              {/* 브랜드 컬러 */}
              <div>
                <h3 className="text-base font-semibold mb-1">브랜드 컬러</h3>
                <p className="text-sm text-gray-500 mb-4">카드뉴스 텍스트, 배경에 자동 적용됩니다</p>
                <div className="grid grid-cols-3 gap-4">
                  {/* Primary */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Primary (주색상)</label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer shadow-sm flex-shrink-0"
                        style={{ backgroundColor: brandIdentity.primaryColor }}
                        onClick={() => document.getElementById("primaryColorInput")?.click()}
                      />
                      <input
                        id="primaryColorInput"
                        type="color"
                        value={brandIdentity.primaryColor}
                        onChange={(e) => setBrandIdentity(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="sr-only"
                      />
                      <input
                        type="text"
                        value={brandIdentity.primaryColor}
                        onChange={(e) => setBrandIdentity(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1 text-sm border rounded-lg px-2 py-1.5 font-mono"
                        placeholder="#4B9073"
                        data-testid="input-primary-color"
                      />
                    </div>
                  </div>
                  {/* Secondary */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Secondary (보조색상)</label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer shadow-sm flex-shrink-0"
                        style={{ backgroundColor: brandIdentity.secondaryColor }}
                        onClick={() => document.getElementById("secondaryColorInput")?.click()}
                      />
                      <input
                        id="secondaryColorInput"
                        type="color"
                        value={brandIdentity.secondaryColor}
                        onChange={(e) => setBrandIdentity(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="sr-only"
                      />
                      <input
                        type="text"
                        value={brandIdentity.secondaryColor}
                        onChange={(e) => setBrandIdentity(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="flex-1 text-sm border rounded-lg px-2 py-1.5 font-mono"
                        placeholder="#FCF9F1"
                        data-testid="input-secondary-color"
                      />
                    </div>
                  </div>
                  {/* Accent */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Accent (강조색상)</label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer shadow-sm flex-shrink-0"
                        style={{ backgroundColor: brandIdentity.accentColor }}
                        onClick={() => document.getElementById("accentColorInput")?.click()}
                      />
                      <input
                        id="accentColorInput"
                        type="color"
                        value={brandIdentity.accentColor}
                        onChange={(e) => setBrandIdentity(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="sr-only"
                      />
                      <input
                        type="text"
                        value={brandIdentity.accentColor}
                        onChange={(e) => setBrandIdentity(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="flex-1 text-sm border rounded-lg px-2 py-1.5 font-mono"
                        placeholder="#E8B84B"
                        data-testid="input-accent-color"
                      />
                    </div>
                  </div>
                </div>
                {/* Color Preview */}
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
                  <div
                    className="h-16 flex items-center justify-center"
                    style={{ backgroundColor: brandIdentity.primaryColor }}
                  >
                    <span className="font-bold text-lg" style={{ color: brandIdentity.secondaryColor, fontFamily: brandIdentity.headingFont }}>
                      Spoilt Dogs
                    </span>
                  </div>
                  <div
                    className="h-8 flex items-center justify-center"
                    style={{ backgroundColor: brandIdentity.accentColor }}
                  >
                    <span className="text-xs font-medium" style={{ color: brandIdentity.primaryColor, fontFamily: brandIdentity.bodyFont }}>
                      Premium Pet Boutique
                    </span>
                  </div>
                </div>
              </div>

              {/* 브랜드 폰트 */}
              <div>
                <h3 className="text-base font-semibold mb-1">브랜드 폰트</h3>
                <p className="text-sm text-gray-500 mb-4">카드뉴스 텍스트 렌더링에 사용됩니다</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">헤딩 폰트</label>
                    <select
                      value={brandIdentity.headingFont}
                      onChange={(e) => setBrandIdentity(prev => ({ ...prev, headingFont: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      data-testid="select-heading-font"
                    >
                      {GOOGLE_FONTS.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                    <p className="text-xl text-gray-700 mt-1" style={{ fontFamily: brandIdentity.headingFont }}>
                      Life's Better Spoilt.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">본문 폰트</label>
                    <select
                      value={brandIdentity.bodyFont}
                      onChange={(e) => setBrandIdentity(prev => ({ ...prev, bodyFont: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      data-testid="select-body-font"
                    >
                      {GOOGLE_FONTS.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: brandIdentity.bodyFont }}>
                      Premium products for your beloved pets.
                    </p>
                  </div>
                </div>
              </div>

              {/* 카드뉴스 텍스트 스타일 */}
              <div>
                <h3 className="text-base font-semibold mb-1">카드뉴스 텍스트 스타일</h3>
                <p className="text-sm text-gray-500 mb-4">텍스트와 배경의 색상 조합을 선택하세요</p>
                <div className="grid grid-cols-3 gap-3">
                  {TEXT_STYLES.map(style => (
                    <button
                      key={style.value}
                      onClick={() => setBrandIdentity(prev => ({ ...prev, textStyle: style.value }))}
                      data-testid={`text-style-${style.value}`}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        brandIdentity.textStyle === style.value
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="w-full h-12 rounded-lg mb-2 flex items-center justify-center text-xs font-bold"
                        style={
                          style.value === "light_on_dark"
                            ? { backgroundColor: brandIdentity.primaryColor, color: brandIdentity.secondaryColor }
                            : style.value === "dark_on_light"
                            ? { backgroundColor: brandIdentity.secondaryColor, color: brandIdentity.primaryColor, border: "1px solid #e5e7eb" }
                            : { backgroundColor: "white", color: brandIdentity.primaryColor, border: "1px solid #e5e7eb" }
                        }
                      >
                        Aa
                      </div>
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 저장 버튼 */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSaveBrandIdentity}
                  disabled={isSavingIdentity}
                  style={{ backgroundColor: "#4B9073", color: "white" }}
                  className="gap-2 px-6"
                  data-testid="btn-save-identity"
                >
                  {isSavingIdentity ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />저장 중...</>
                  ) : (
                    <><Save className="h-4 w-4" />브랜드 아이덴티티 저장</>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tab 6 — 음악 라이브러리 */}
          <TabsContent value="music">
            <div className="space-y-4">
              <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-4">
                <p className="text-sm text-purple-900">
                  릴스/틱톡 영상 생성 시 배경음악으로 사용됩니다. Suno, YouTube Audio Library 등에서 저작권 프리 음원을 업로드하세요.
                </p>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold">업로드된 음악 ({musicItems.length})</h3>
                <Button onClick={() => setMusicDialogOpen(true)} data-testid="button-upload-music">
                  <Plus className="h-4 w-4 mr-1" />
                  음악 업로드
                </Button>
              </div>

              {musicItems.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center text-gray-500">
                  <Music className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">아직 업로드된 음악이 없습니다</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {musicItems.map((item) => {
                    let meta: MusicMeta;
                    try {
                      meta = JSON.parse(item.content ?? "{}");
                    } catch {
                      meta = { url: "", mood: "neutral", durationSec: 0, fileName: "", sizeBytes: 0 };
                    }
                    const moodLabel = MUSIC_MOODS.find((m) => m.value === meta.mood)?.label ?? meta.mood;
                    return (
                      <div key={item.id} className="rounded-lg border bg-white p-3 flex items-center gap-3" data-testid={`music-card-${item.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{item.title}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 flex-shrink-0">{moodLabel}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">{formatDuration(meta.durationSec)}</span>
                          </div>
                          {meta.url && (
                            <audio controls src={meta.url} className="w-full h-8" preload="none" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={item.isActive ?? false}
                              onCheckedChange={(checked) => handleToggleMusicActive(item.id, checked)}
                              data-testid={`switch-music-${item.id}`}
                            />
                            <span className="text-xs text-gray-600">{item.isActive ? "활성" : "비활성"}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMusic(item.id)}
                            data-testid={`button-delete-music-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Dialog open={musicDialogOpen} onOpenChange={setMusicDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>음악 업로드</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>파일 (MP3, WAV · 최대 50MB)</Label>
                    <Input
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/mp3,audio/x-wav,.mp3,.wav"
                      onChange={(e) => setMusicFile(e.target.files?.[0] ?? null)}
                      data-testid="input-music-file"
                    />
                    {musicFile && (
                      <p className="text-xs text-gray-500">{musicFile.name} · {(musicFile.size / 1024 / 1024).toFixed(1)}MB</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>제목</Label>
                    <Input
                      value={musicTitle}
                      onChange={(e) => setMusicTitle(e.target.value)}
                      placeholder="예: 국둥이 메인테마"
                      data-testid="input-music-title"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>분위기</Label>
                    <Select value={musicMood} onValueChange={setMusicMood}>
                      <SelectTrigger data-testid="select-music-mood"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MUSIC_MOODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setMusicDialogOpen(false)} disabled={isUploadingMusic}>취소</Button>
                  <Button onClick={handleUploadMusic} disabled={isUploadingMusic} data-testid="button-submit-music">
                    {isUploadingMusic ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />업로드 중...</> : <><Upload className="h-4 w-4 mr-1" />업로드</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

        </Tabs>
      </main>

      {/* ── Context Dialog ── */}
      <Dialog open={contextDialogOpen} onOpenChange={setContextDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingContext ? "항목 수정" : "항목 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingContext && (
              <div>
                <Label className="mb-1 block">타입</Label>
                <Select value={ctxType} onValueChange={setCtxType}>
                  <SelectTrigger data-testid="ctx-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gukdung_profile">Gukdung 프로필</SelectItem>
                    <SelectItem value="brand_voice">브랜드 보이스</SelectItem>
                    <SelectItem value="campaign_memory">캠페인 메모리</SelectItem>
                    <SelectItem value="post_guideline">포스트 가이드라인</SelectItem>
                    <SelectItem value="image_guideline">이미지 가이드라인</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="mb-1 block">제목</Label>
              <Input
                data-testid="ctx-title-input"
                value={ctxTitle}
                onChange={(e) => setCtxTitle(e.target.value)}
                placeholder="항목 제목"
              />
            </div>
            <div>
              <Label className="mb-1 block">내용</Label>
              <Textarea
                data-testid="ctx-content-input"
                value={ctxContent}
                onChange={(e) => setCtxContent(e.target.value)}
                rows={6}
                placeholder="상세 내용을 입력하세요..."
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="ctx-active"
                checked={ctxActive}
                onCheckedChange={setCtxActive}
                data-testid="ctx-active-switch"
              />
              <Label htmlFor="ctx-active">활성 (Claude 프롬프트에 포함)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeContextDialog}>취소</Button>
            <Button
              className="bg-[#4B9073] text-white hover:bg-[#3d7860]"
              disabled={!ctxTitle || !ctxContent || contextPending}
              data-testid="save-context-btn"
              onClick={submitContext}
            >
              {contextPending ? <Loader2 size={14} className="animate-spin" /> : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Dialog ── */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => { if (!open) closeUploadDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gukdung 사진 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Drop zone */}
            <div
              className="relative rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center cursor-pointer hover:border-[#4B9073] hover:bg-[#f0f7f4] transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById("file-input-hidden")?.click()}
              data-testid="upload-dropzone"
            >
              <input
                id="file-input-hidden"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-file-upload"
              />
              <ImagePlus className="mx-auto mb-2 h-8 w-8 text-stone-400" />
              <p className="text-sm font-medium text-stone-600">사진을 드래그하거나 클릭해서 선택</p>
              <p className="mt-1 text-xs text-stone-400">JPG, PNG, WEBP · 최대 20MB · 여러 장 동시 업로드 가능</p>
            </div>

            {/* File preview grid */}
            {selectedFiles.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-stone-500 font-medium">{selectedFiles.length}장 선택됨</p>
                <div className="grid grid-cols-4 gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-stone-200 aspect-square" data-testid={`file-preview-${idx}`}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        data-testid={`btn-remove-file-${idx}`}
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                      <p className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5 text-[9px] text-white truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shared metadata fields */}
            <div>
              <Label className="mb-1 block">설명 / 상황 메모 (선택)</Label>
              <Input
                data-testid="upload-desc-input"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="예: 해변에서 뛰는 국둥이, 생일 파티"
              />
            </div>
            <div>
              <Label className="mb-1 block">태그 (쉼표 구분, 선택)</Label>
              <Input
                data-testid="upload-tags-input"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="beach, birthday, indoor"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="upload-training"
                checked={uploadTraining}
                onCheckedChange={setUploadTraining}
                data-testid="upload-training-switch"
              />
              <Label htmlFor="upload-training">LoRA 학습용 사진으로 지정</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeUploadDialog} disabled={isUploading}>취소</Button>
            <Button
              className="bg-[#4B9073] text-white hover:bg-[#3d7860]"
              disabled={selectedFiles.length === 0 || isUploading}
              data-testid="btn-upload-submit"
              onClick={handleUpload}
            >
              {isUploading ? (
                <><Loader2 size={14} className="mr-1.5 animate-spin" />업로드 중...</>
              ) : (
                `업로드 (${selectedFiles.length}장)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Image Edit Dialog ── */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>사진 수정</DialogTitle>
          </DialogHeader>
          {editingImage && (
            <img
              src={editingImage.imageUrl}
              alt="미리보기"
              className="h-36 w-full rounded-lg object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 block">설명 / 상황 메모</Label>
              <Input
                data-testid="img-desc-input"
                value={imgDesc}
                onChange={(e) => setImgDesc(e.target.value)}
                placeholder="예: 해변에서 뛰는 국둥이, 생일 파티"
              />
            </div>
            <div>
              <Label className="mb-1 block">태그 (쉼표 구분)</Label>
              <Input
                data-testid="img-tags-input"
                value={imgTags}
                onChange={(e) => setImgTags(e.target.value)}
                placeholder="beach, birthday, indoor"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="img-training"
                checked={imgTraining}
                onCheckedChange={setImgTraining}
                data-testid="img-training-switch"
              />
              <Label htmlFor="img-training">LoRA 학습용 사진으로 지정</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeImageDialog}>취소</Button>
            <Button
              className="bg-[#4B9073] text-white hover:bg-[#3d7860]"
              disabled={imagePending}
              data-testid="save-image-btn"
              onClick={submitImage}
            >
              {imagePending ? <Loader2 size={14} className="animate-spin" /> : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Context Confirm ── */}
      <AlertDialog open={!!deleteContextId} onOpenChange={() => setDeleteContextId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>항목을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제된 항목은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteContextId && deleteContext.mutate(deleteContextId)}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Image Confirm ── */}
      <AlertDialog open={!!deleteImageId} onOpenChange={() => setDeleteImageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사진을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제된 사진은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteImageId && deleteImage.mutate(deleteImageId)}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AdminLayout>
  );
}
