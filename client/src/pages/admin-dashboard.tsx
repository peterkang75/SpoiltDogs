import { AdminLayout } from "@/components/admin-layout";
import { Link } from "wouter";
import { Package, Users, Megaphone, Palette, PawPrint } from "lucide-react";

const sections = [
  {
    label: "상품 관리",
    description: "상품 목록, 재고, Syncee 연동 관리",
    href: "/admin/products",
    icon: Package,
    accent: "#4B9073",
  },
  {
    label: "CRM",
    description: "고객 대화, 이메일, 채팅 관리",
    href: "/admin/crm",
    icon: Users,
    accent: "#3b82f6",
  },
  {
    label: "마케팅",
    description: "SNS 콘텐츠 생성 및 큐 관리",
    href: "/admin/marketing",
    icon: Megaphone,
    accent: "#f59e0b",
  },
  {
    label: "브랜드 스튜디오",
    description: "Gukdung 브랜드, AI 이미지 생성, LoRA 학습",
    href: "/admin/brand-studio",
    icon: Palette,
    accent: "#a855f7",
  },
];

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <PawPrint className="h-7 w-7" style={{ color: "#4B9073" }} />
          <div>
            <h1 className="text-2xl font-serif font-bold text-dark">
              어드민 대시보드
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">SpoiltDogs 관리 센터</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.href} href={s.href}>
                <div
                  className="group bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-150"
                  data-testid={`card-dashboard-${s.label}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="rounded-lg p-2.5 shrink-0"
                      style={{ backgroundColor: `${s.accent}18` }}
                    >
                      <Icon
                        className="h-6 w-6"
                        style={{ color: s.accent }}
                      />
                    </div>
                    <div>
                      <h2 className="font-semibold text-dark group-hover:text-sage transition-colors">
                        {s.label}
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                        {s.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
