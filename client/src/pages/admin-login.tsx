import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PawPrint, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");

  const loginMut = useMutation({
    mutationFn: async (pw: string) => {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "로그인 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "로그인 성공" });
      navigate("/admin/dashboard");
    },
    onError: (err: Error) => {
      toast({ title: "로그인 실패", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#1a3a2e" }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <PawPrint className="h-6 w-6 text-[#1a3a2e]" />
          <h1 className="text-xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            SpoiltDogs 어드민
          </h1>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!password) return;
            loginMut.mutate(password);
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="password">관리자 비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              data-testid="input-admin-password"
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={loginMut.isPending || !password}
            className="w-full bg-[#1a3a2e] hover:bg-[#1a3a2e]/90"
            data-testid="button-admin-login"
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            {loginMut.isPending ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </div>
    </div>
  );
}
