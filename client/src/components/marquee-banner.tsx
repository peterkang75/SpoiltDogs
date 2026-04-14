import { Truck, Leaf, ShieldCheck, Heart } from "lucide-react";

const messages = [
  { icon: Truck, text: "Free Shipping on Orders Over $99 AUD" },
  { icon: Leaf, text: "100% Natural Ingredients" },
  { icon: ShieldCheck, text: "Australian Made & Owned" },
  { icon: Heart, text: "Loved by 10,000+ Aussie Dogs" },
  { icon: Truck, text: "Free Shipping on Orders Over $99 AUD" },
  { icon: Leaf, text: "100% Natural Ingredients" },
  { icon: ShieldCheck, text: "Australian Made & Owned" },
  { icon: Heart, text: "Loved by 10,000+ Aussie Dogs" },
];

export function MarqueeBanner() {
  return (
    <div className="bg-dark text-cream overflow-hidden py-2.5" data-testid="marquee-banner">
      <div className="flex animate-marquee whitespace-nowrap">
        {messages.map((msg, i) => (
          <span key={i} className="mx-8 inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <msg.icon className="h-3.5 w-3.5" />
            {msg.text}
          </span>
        ))}
      </div>
    </div>
  );
}
