import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Dog, Sparkles, ShoppingBag, Star, Truck, User } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { usePet } from "@/context/pet-context";
import { formatAud } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import imgTreats from "@assets/product-treats.png";
import imgBed from "@assets/product-bed.png";
import imgBall from "@assets/product-ball.png";
import imgCollar from "@assets/product-collar.png";

const PRODUCT_CATALOG: Record<string, {
  id: string;
  name: string;
  description: string;
  priceAud: number;
  image: string;
  badge: string | null;
  tags: string[];
  rating: number;
  reviews: number;
  localShipping: boolean;
}> = {
  "prod-1": {
    id: "prod-1",
    name: "Organic Kangaroo & Turmeric Bites",
    description: "High-protein, anti-inflammatory treats made with wild-caught Australian kangaroo and golden turmeric.",
    priceAud: 2495,
    image: imgTreats,
    badge: "Best Seller",
    tags: ["Local Aussie Made", "High Protein"],
    rating: 4.9,
    reviews: 128,
    localShipping: true,
  },
  "prod-2": {
    id: "prod-2",
    name: "Orthopedic Memory Foam Bed — Seafoam Green",
    description: "Veterinary-grade memory foam with organic cotton cover. Machine washable.",
    priceAud: 12900,
    image: imgBed,
    badge: null,
    tags: ["Joint Support", "AU Fast Shipping"],
    rating: 4.8,
    reviews: 87,
    localShipping: true,
  },
  "prod-3": {
    id: "prod-3",
    name: "Smart Interactive Ball with App Control",
    description: "Connects via Bluetooth, auto-rolls patterns, and tracks play time.",
    priceAud: 8900,
    image: imgBall,
    badge: "Trending",
    tags: ["Bestseller", "High Tech"],
    rating: 4.7,
    reviews: 203,
    localShipping: false,
  },
  "prod-4": {
    id: "prod-4",
    name: "Hand-Stitched Italian Leather Collar",
    description: "Full-grain Italian leather with solid brass hardware.",
    priceAud: 5500,
    image: imgCollar,
    badge: "Limited",
    tags: ["Premium Quality", "Limited Edition"],
    rating: 5.0,
    reviews: 64,
    localShipping: false,
  },
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function extractProductIds(text: string): string[] {
  const matches = text.matchAll(/\[PRODUCT:(prod-\d+)\]/g);
  return [...matches].map((m) => m[1]).filter((id) => PRODUCT_CATALOG[id]);
}

function cleanMessageText(text: string): string {
  return text.replace(/\[PRODUCT:prod-\d+\]/g, "").trim();
}

function InlineProductCard({ productId }: { productId: string }) {
  const product = PRODUCT_CATALOG[productId];
  const { addItem } = useCart();
  const { toast } = useToast();

  if (!product) return null;

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      priceAud: product.priceAud,
      imageUrl: product.image,
    });
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <Card
      className="group mt-3 overflow-hidden bg-white hover-elevate transition-all duration-300"
      style={{ border: "1px solid rgba(0,0,0,0.05)" }}
      data-testid={`chat-product-${product.id}`}
    >
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          <div className="h-20 w-20 shrink-0 rounded-lg bg-neutral-50 overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
              data-testid={`img-chat-product-${product.id}`}
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-serif text-sm font-bold text-dark leading-snug" data-testid={`text-chat-product-name-${product.id}`}>
                {product.name}
              </h4>
              {product.badge && (
                <Badge className="shrink-0 bg-gold text-dark border-none text-[10px] font-bold px-2">
                  {product.badge}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3 w-3 fill-terracotta text-terracotta" />
              ))}
              <span className="text-[10px] text-muted-foreground ml-0.5">({product.reviews})</span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-sm font-bold text-dark">
                {formatAud(product.priceAud)}
                <span className="text-[9px] font-normal text-muted-foreground ml-0.5">AUD</span>
              </span>
              <Button
                size="sm"
                className="h-7 bg-sage text-cream rounded-full gap-1 text-xs px-3"
                onClick={handleAdd}
                data-testid={`button-chat-add-${product.id}`}
              >
                <ShoppingBag className="h-3 w-3" />
                Add
              </Button>
            </div>
            {product.localShipping && (
              <div className="flex items-center gap-1 text-sage">
                <Truck className="h-3 w-3" />
                <span className="text-[10px] font-medium">AU Fast Shipping</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const SUGGESTIONS = [
  "What treats are best for an active dog?",
  "My dog has joint pain — any recommendations?",
  "What's your best-selling product?",
  "I need a gift for a dog lover",
];

export function AiConcierge() {
  const { pet } = usePet();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          petName: pet?.name,
          petBreed: pet?.breed,
          petAge: pet?.age,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              setIsStreaming(false);
              break;
            }
            if (data.content) {
              fullContent += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullContent };
                return updated;
              });
            }
            if (data.error) {
              fullContent = data.error;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullContent };
                return updated;
              });
              setIsStreaming(false);
              break;
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't process that right now. Please try again!",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, pet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const petName = pet?.name || "Buddy";

  return (
    <section id="ai-concierge" className="bg-cream py-16 sm:py-24" data-testid="section-ai-concierge">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-medium uppercase tracking-widest text-terracotta mb-3" data-testid="text-concierge-eyebrow">
            AI Pet Concierge
          </p>
          <h2 className="font-serif text-3xl font-bold text-dark sm:text-4xl" data-testid="text-concierge-title">
            Ask <span className="text-sage">{petName}'s Guide</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground text-sm" data-testid="text-concierge-subtitle">
            Our AI knows every product in the shop. Ask for recommendations, compare options, or get advice tailored to your pup.
          </p>
        </div>

        <div
          className="rounded-2xl bg-white overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
          data-testid="container-chat"
        >
          <div
            ref={scrollRef}
            className="h-[400px] overflow-y-auto px-5 py-5 space-y-4"
            data-testid="chat-messages"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage/10">
                  <Dog className="h-7 w-7 text-sage" />
                </div>
                <div className="text-center">
                  <p className="font-serif text-lg font-bold text-dark" data-testid="text-chat-welcome">
                    G'day! I'm {petName}'s Guide
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ask me anything about our products
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      className="text-xs font-medium text-sage rounded-full px-4 py-2 transition-colors bg-sage/6"
                      style={{ border: "1px solid rgba(45,90,71,0.12)" }}
                      onClick={() => sendMessage(s)}
                      data-testid={`button-suggestion-${s.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const productIds = isUser ? [] : extractProductIds(msg.content);
              const displayText = isUser ? msg.content : cleanMessageText(msg.content);
              const isCurrentStreaming = isStreaming && i === messages.length - 1 && !isUser;

              return (
                <div
                  key={i}
                  className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                  data-testid={`chat-message-${i}`}
                >
                  <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
                    isUser ? "bg-sage/10" : "bg-sage"
                  }`}>
                    {isUser ? (
                      <User className="h-4 w-4 text-sage" />
                    ) : (
                      <Dog className="h-4 w-4 text-cream" />
                    )}
                  </div>
                  <div className={`max-w-[80%] ${isUser ? "text-right" : ""}`}>
                    <div
                      className={`inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? "bg-sage text-cream rounded-br-md"
                          : "bg-neutral-50 text-dark rounded-bl-md"
                      }`}
                      style={isUser ? {} : { boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                      data-testid={`text-message-${i}`}
                    >
                      {displayText}
                      {isCurrentStreaming && !displayText && (
                        <span className="inline-flex gap-1 items-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-sage/40 animate-pulse" />
                          <span className="h-1.5 w-1.5 rounded-full bg-sage/40 animate-pulse [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-sage/40 animate-pulse [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>
                    {productIds.map((pid) => (
                      <InlineProductCard key={pid} productId={pid} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
            data-testid="form-chat"
          >
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sage/40" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${petName}'s Guide anything...`}
                disabled={isStreaming}
                className="w-full h-11 rounded-full bg-neutral-50 pl-10 pr-4 text-sm text-dark placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                data-testid="input-chat"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="rounded-full bg-sage text-cream shrink-0 shadow-sm px-3"
              disabled={isStreaming || !input.trim()}
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
