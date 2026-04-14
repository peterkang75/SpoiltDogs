import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Minimize2, ShoppingBag } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useLocation } from "wouter";

interface ProductCardData {
  name: string;
  description?: string;
  price: string;
  comparePrice?: string;
  imageUrl?: string;
  productUrl: string;
  badge?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  from: "visitor" | "agent";
  time: string;
  productCard?: ProductCardData;
}

function parsePCARD(text: string): { displayText: string; productCard?: ProductCardData } {
  const match = text.match(/<!--PCARD:(.*?)-->/);
  if (match) {
    try {
      const productCard = JSON.parse(match[1]) as ProductCardData;
      const displayText = text.replace(/\n?<!--PCARD:.*?-->/, "").trim();
      return { displayText, productCard };
    } catch {}
  }
  return { displayText: text };
}

function generateVisitorId(): string {
  let id = localStorage.getItem("spoiltdogs_visitor_id");
  if (!id) {
    id = Math.random().toString(36).substring(2, 10);
    localStorage.setItem("spoiltdogs_visitor_id", id);
  }
  return id;
}

const CHAT_STORAGE_KEY = "spoiltdogs_chat";

function loadChatState() {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY) || sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveChatState(state: { messages: ChatMessage[]; visitorName: string; visitorEmail: string; hasIntro: boolean; isOpen: boolean }) {
  try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function clearChatState() {
  try { localStorage.removeItem(CHAT_STORAGE_KEY); sessionStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
}

function toRelativePath(url: string): string | null {
  if (url.startsWith("//")) return null;
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin === window.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {}
  return null;
}

export default function ChatWidget() {
  const [, navigate] = useLocation();
  const saved = loadChatState();
  const [isOpen, setIsOpen] = useState(saved?.isOpen || false);
  const [messages, setMessages] = useState<ChatMessage[]>(saved?.messages || []);
  const [input, setInput] = useState("");
  const [visitorName, setVisitorName] = useState(saved?.visitorName || "");
  const [visitorEmail, setVisitorEmail] = useState(saved?.visitorEmail || "");
  const [hasIntro, setHasIntro] = useState(saved?.hasIntro || false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const visitorId = useRef(generateVisitorId());

  useEffect(() => {
    saveChatState({ messages, visitorName, visitorEmail, hasIntro, isOpen });
  }, [messages, visitorName, visitorEmail, hasIntro, isOpen]);

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/socket.io",
      query: {
        visitorId: visitorId.current,
        email: visitorEmail || `visitor-${visitorId.current}@chat.spoiltdogs.com.au`,
      },
    });
    socketRef.current = socket;

    socket.on("chat:message:ack", (data: { id: string; createdAt: string }) => {
      setMessages(prev => prev.map(m => m.id.startsWith("pending-") ? { ...m, id: data.id } : m));
    });

    socket.on("chat:reply", (data: { text: string; id: string; createdAt: string; productCard?: ProductCardData }) => {
      const parsed = data.productCard ? { displayText: data.text.replace(/\n?<!--PCARD:.*?-->/, "").trim(), productCard: data.productCard } : parsePCARD(data.text);
      setMessages(prev => [...prev, {
        id: data.id,
        text: parsed.displayText,
        from: "agent",
        time: new Date(data.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
        productCard: parsed.productCard,
      }]);
    });

    return () => { socket.disconnect(); };
  }, [visitorEmail]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !socketRef.current) return;
    const text = input.trim();
    const tempId = `pending-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      text,
      from: "visitor",
      time: new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
    }]);
    socketRef.current.emit("chat:message", { text, visitorName: visitorName || undefined });
    setInput("");
  }, [input, visitorName]);

  const startChat = async () => {
    if (!visitorEmail.trim()) return;
    setHasIntro(true);

    try {
      const res = await fetch(`/api/chat/history/${encodeURIComponent(visitorEmail.trim())}`);
      if (res.ok) {
        const history: ChatMessage[] = await res.json();
        if (history.length > 0) {
          setMessages(history);
          return;
        }
      }
    } catch {}

    setMessages([{
      id: "welcome",
      text: "Welcome to SpoiltDogs! How can we help you and your furry friend today?",
      from: "agent",
      time: new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
    }]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100] h-14 w-14 rounded-full bg-amber-700 text-white shadow-lg hover:bg-amber-800 transition-all hover:scale-105 flex items-center justify-center"
        data-testid="button-open-chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-[360px] h-[500px] rounded-2xl shadow-2xl border border-stone-200 bg-white flex flex-col overflow-hidden" data-testid="chat-widget">
      <div className="bg-amber-700 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">SpoiltDogs Live Chat</p>
            <p className="text-[10px] opacity-80">Premium Pet Concierge</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-white/20 transition" data-testid="button-minimize-chat">
            <Minimize2 className="h-4 w-4" />
          </button>
          <button onClick={() => { setIsOpen(false); setMessages([]); setHasIntro(false); setVisitorEmail(""); setVisitorName(""); clearChatState(); }} className="p-1.5 rounded-full hover:bg-white/20 transition" data-testid="button-close-chat">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!hasIntro ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <MessageCircle className="h-12 w-12 text-amber-700" />
          <h3 className="text-lg font-semibold text-stone-800">Welcome to SpoiltDogs</h3>
          <p className="text-sm text-stone-500">Chat with our pet concierge team. We're here to help you find the perfect products for your furry family member.</p>
          <div className="w-full space-y-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              data-testid="input-visitor-name"
            />
            <input
              type="email"
              placeholder="Your email"
              value={visitorEmail}
              onChange={(e) => setVisitorEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              data-testid="input-visitor-email"
            />
            <button
              onClick={startChat}
              disabled={!visitorEmail.trim()}
              className="w-full py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-start-chat"
            >
              Start Chat
            </button>
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === "visitor" ? "justify-end" : "justify-start"}`}>
                {msg.productCard ? (
                  <div className="max-w-[85%] rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm rounded-bl-md" data-testid={`product-chat-card-${msg.id}`}>
                    {msg.productCard.imageUrl && (
                      <img src={msg.productCard.imageUrl} alt={msg.productCard.name} className="w-full h-32 object-cover" />
                    )}
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-stone-800 leading-tight">{msg.productCard.name}</p>
                        {msg.productCard.badge && (
                          <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">{msg.productCard.badge}</span>
                        )}
                      </div>
                      {msg.productCard.description && (
                        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{msg.productCard.description}</p>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-amber-700">{msg.productCard.price}</span>
                        {msg.productCard.comparePrice && (
                          <span className="text-xs text-stone-400 line-through">{msg.productCard.comparePrice}</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const url = msg.productCard!.productUrl;
                          const relativePath = toRelativePath(url);
                          if (relativePath) {
                            setIsOpen(false);
                            navigate(relativePath);
                          } else {
                            window.open(url, "_blank", "noopener,noreferrer");
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 w-full py-2 mt-1 bg-amber-700 text-white text-xs font-semibold rounded-lg hover:bg-amber-800 transition"
                        data-testid={`link-view-product-${msg.id}`}
                      >
                        <ShoppingBag className="h-3 w-3" />
                        View Product
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-400 px-3 pb-2">{msg.time}</p>
                  </div>
                ) : (
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm
                  ${msg.from === "visitor"
                    ? "bg-amber-700 text-white rounded-br-md"
                    : "bg-white border border-stone-200 text-stone-800 rounded-bl-md shadow-sm"
                  }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.from === "visitor" ? "text-amber-200" : "text-stone-400"}`}>{msg.time}</p>
                </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t p-3 bg-white shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                data-testid="input-chat-message"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-3 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition disabled:opacity-50"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
