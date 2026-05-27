"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inter, Sora } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const API_BASE = "https://api.ray.exchange";

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

type Role = "user" | "assistant";
type PricePeriod = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

interface Message { id: string; role: Role; text: string; }
interface Unit {
  category: string; size: string; location: string; available: number;
  price_regular: number; price_from: number; features: string[];
  sq_ft: string; book_url: string; image: string;
}

const THEMES = {
  blue: { label: "Ocean", primary: "221 83% 53%", fg: "0 0% 100%" },
  green: { label: "Forest", primary: "142 76% 36%", fg: "0 0% 100%" },
  orange: { label: "Sunset", primary: "25 95% 53%", fg: "0 0% 100%" },
} as const;
type ThemeKey = keyof typeof THEMES;

const PERIODS = [
  { value: "daily" as PricePeriod, label: "Daily", mult: 1 / 30 },
  { value: "weekly" as PricePeriod, label: "Weekly", mult: 7 / 30 },
  { value: "biweekly" as PricePeriod, label: "Bi-weekly", mult: 14 / 30 },
  { value: "monthly" as PricePeriod, label: "Monthly", mult: 1 },
  { value: "yearly" as PricePeriod, label: "Yearly", mult: 12 },
];

const EMOJI: Record<string, string> = {
  compact: "📦", small: "🚪", medium: "🏠", large: "🏭", parking: "🚗",
};

const CAT_BG: Record<string, string> = {
  compact: "#dbeafe", small: "#d1fae5", medium: "#fef3c7",
  large: "#ffe4e6", parking: "#ede9fe",
};
const CAT_TEXT: Record<string, string> = {
  compact: "#1e40af", small: "#065f46", medium: "#92400e",
  large: "#9f1239", parking: "#5b21b6",
};

function uid() { return Math.random().toString(36).slice(2); }

function formatPrice(monthly: number, period: PricePeriod) {
  const p = PERIODS.find((x) => x.value === period)!;
  const v = monthly * p.mult;
  return v < 10 ? `$${v.toFixed(2)}` : `$${Math.round(v)}`;
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "12px 8px" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: "50%", display: "block",
          background: "hsl(var(--muted-foreground) / 0.4)",
          animation: `tdot 1s ${i * 0.15}s infinite`,
        }} />
      ))}
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const text = msg.text.replace(/\*\*(.*?)\*\*/g, "$1");
  return (
    <div style={{
      display: "flex", width: "100%", marginBottom: 12,
      justifyContent: isUser ? "flex-end" : "flex-start",
      animation: "fi 0.22s ease both",
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 10,
          fontWeight: 700, flexShrink: 0, marginRight: 8, marginTop: 4,
          background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
        }}>XYZ</div>
      )}
      <div style={{
        maxWidth: "82%",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "10px 16px",
        fontSize: 14,
        lineHeight: 1.7,
        fontWeight: 400,
        letterSpacing: "-0.01em",
        background: isUser ? "hsl(var(--primary))" : "hsl(var(--muted))",
        color: isUser ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
      }}>{text}</div>
    </div>
  );
}

function UnitCard({ unit, idx, period, dark }: { unit: Unit; idx: number; period: PricePeriod; dark: boolean }) {
  const hasPromo = unit.price_from > 0 && unit.price_from < unit.price_regular;
  const pLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();
  const [imgOk, setImgOk] = useState(true);

  const goodFeatures = unit.features.filter(
    (f) => f.trim().length > 2 && f.trim().length < 70 &&
      !f.toLowerCase().includes("a compact") &&
      !f.toLowerCase().includes("a medium") &&
      !f.toLowerCase().includes("a small") &&
      !f.toLowerCase().includes("a large")
  );

  const priceDisplay = hasPromo ? unit.price_from : unit.price_regular;
  const oldPrice = hasPromo ? unit.price_regular : null;

  const cardBg = dark ? "#1c1c1e" : "#ffffff";
  const cardBorder = dark ? "1px solid #3a3a3c" : "1px solid #e5e7eb";
  const priceColor = "hsl(var(--primary))";

  return (
    <div style={{
      background: cardBg,
      borderRadius: 12,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      border: cardBorder,
      boxShadow: dark
        ? "0 2px 12px rgba(0,0,0,0.5)"
        : "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
      animation: `fi 0.28s ease ${idx * 0.07}s both`,
    }}>
      {/* Image */}
      <div style={{
        height: 160, background: dark ? "#2c2c2e" : "#f9fafb",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", flexShrink: 0,
      }}>
        {unit.image && imgOk ? (
          <img src={unit.image} alt={unit.category} onError={() => setImgOk(false)}
            style={{ height: "100%", width: "100%", objectFit: "contain", padding: 24 }} />
        ) : (
          <span style={{ fontSize: 48 }}>{EMOJI[unit.category] ?? "📦"}</span>
        )}
        <span style={{
          position: "absolute", top: 8, left: 8, fontSize: 11, fontWeight: 600,
          padding: "2px 8px", borderRadius: 20,
          background: CAT_BG[unit.category] ?? "#f3f4f6",
          color: CAT_TEXT[unit.category] ?? "#374151",
        }}>{unit.category}</span>
        {unit.available > 0 && unit.available <= 3 && (
          <span style={{
            position: "absolute", top: 8, right: 8, fontSize: 11, fontWeight: 600,
            padding: "2px 8px", borderRadius: 20, background: "#ef4444", color: "#fff",
          }}>Only {unit.available} left</span>
        )}
        {hasPromo && (
          <span style={{
            position: "absolute", bottom: 8, right: 8, fontSize: 11, fontWeight: 600,
            padding: "2px 8px", borderRadius: 20, background: "#22c55e", color: "#fff",
          }}>Promo</span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 12px", flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: dark ? "#ffffff" : "#111827", letterSpacing: "-0.02em" }}>
          {unit.size}
        </p>
        <p style={{ fontSize: 12, color: dark ? "#9ca3af" : "#6b7280", margin: "2px 0 0" }}>
          {unit.location} · {unit.sq_ft} sq ft
        </p>
        <div style={{ height: 1, background: dark ? "#3a3a3c" : "#e5e7eb", margin: "12px 0" }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{
            fontSize: 24,
            fontWeight: 800,
            color: priceColor,
            letterSpacing: "-0.03em",
            fontFamily: "var(--font-sora)",
          }}>
            {formatPrice(priceDisplay, period)}
          </span>
          {oldPrice !== null && (
            <span style={{ fontSize: 12, color: dark ? "#9ca3af" : "#9ca3af", textDecoration: "line-through" }}>
              {formatPrice(oldPrice, period)}
            </span>
          )}
          <span style={{ fontSize: 12, color: dark ? "#9ca3af" : "#6b7280" }}>/{pLabel}</span>
        </div>
        <div style={{ marginTop: 10 }}>
          {goodFeatures.slice(0, 3).map((f, j) => (
            <p key={j} style={{
              fontSize: 12, color: dark ? "#9ca3af" : "#6b7280",
              margin: "3px 0", display: "flex", gap: 4,
            }}>
              <span style={{ color: priceColor }}>•</span>{f.trim()}
            </p>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ padding: "0 16px 16px", display: "flex", gap: 8 }}>
        {/* <button onClick={() => window.open(unit.book_url, "_blank")} style={{
          flex: 1, height: 34, fontSize: 12,
          fontWeight: 700,
          letterSpacing: "-0.01em", borderRadius: 8,
          border: "none", cursor: "pointer",
          background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
        }}>Book now</button> */}
        <button onClick={() => window.open(
          `https://www.xyzstorage.com/locations/${unit.location.toLowerCase().replace(/\s+/g, "-")}/`, "_blank"
        )} style={{
          flex: 1, height: 34, fontSize: 12,
          fontWeight: 700,
          letterSpacing: "-0.01em", borderRadius: 8, cursor: "pointer",
          background: "transparent", color: "hsl(var(--primary))",
          border: "1.5px solid hsl(var(--primary))",
        }}>View location</button>
      </div>
    </div>
  );
}

// ── Chat Panel Content (reused in both desktop and mobile modal) ──
function ChatContent({
  messages, loading, input, setInput, send, inputRef, bottomRef,
}: {
  messages: Message[]; loading: boolean; input: string;
  setInput: (v: string) => void; send: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
        {messages.map((msg) => <Bubble key={msg.id} msg={msg} />)}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>
      <div style={{
        flexShrink: 0, padding: 16,
        borderTop: "1px solid hsl(var(--border))",
        background: "hsl(var(--background))",
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="e.g. sofa near Scarborough…"
            style={{ flex: 1, fontSize: 16 }}
            disabled={loading}
          />
          <button onClick={send} disabled={loading || !input.trim()} style={{
            padding: "0 20px", height: 36, borderRadius: 8, border: "none",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 600, flexShrink: 0,
            background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}>Send</button>
        </div>
        <p style={{
          fontSize: 11, color: "hsl(var(--muted-foreground))",
          textAlign: "center", marginTop: 8, marginBottom: 0,
        }}>Powered by XYZ Storage live inventory</p>
      </div>
    </>
  );
}

export default function StorageAdvisor() {
  const [messages, setMessages] = useState<Message[]>([{
    id: uid(), role: "assistant",
    text: "Hi! I'm your XYZ Storage advisor. What do you need to store, and which area of Toronto are you in?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [locationUrl, setLocationUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeKey>("blue");
  const [dark, setDark] = useState(false);
  const [period, setPeriod] = useState<PricePeriod>("monthly");
  const [unitsVisible, setUnitsVisible] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null!)

  useEffect(() => {
    const savedTheme = getCookie("xyz-theme") as ThemeKey | undefined;
    const savedDark = getCookie("xyz-dark");
    const savedPeriod = getCookie("xyz-period") as PricePeriod | undefined;

    if (savedTheme && THEMES[savedTheme]) {
      setTheme(savedTheme);
    }

    if (savedDark) {
      setDark(savedDark === "true");
    }

    if (savedPeriod) {
      setPeriod(savedPeriod);
    }
  }, []);

  useEffect(() => {
    const t = THEMES[theme];
    document.documentElement.style.setProperty("--primary", t.primary);
    document.documentElement.style.setProperty("--primary-foreground", t.fg);
    document.documentElement.style.setProperty("--ring", t.primary);

    setCookie("xyz-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    setCookie("xyz-dark", String(dark));
  }, [dark]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((p) => [...p, { id: uid(), role: "user", text }]);
    setInput("");
    setLoading(true);
    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    try {
      const res = await fetch(`${API_BASE}/xyz/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversation_history: history }),
      });
      const data = await res.json();
      setMessages((p) => [...p, { id: uid(), role: "assistant", text: data.reply ?? "You’re out of AI usage credits. Please try again in 24 hours when your plan resets." }]);
      if (data.recommended_units?.length) {
        setUnits(data.recommended_units);
        setLocationUrl(data.location_url ?? null);
        setUnitsVisible(true);
        setChatModalOpen(false);
      } else if (data.reply?.toLowerCase().includes("no available")) {
        setUnits([]);
        setUnitsVisible(false);
      }
    } catch {
      setMessages((p) => [...p, { id: uid(), role: "assistant", text: "Couldn't connect. Please try again." }]);
    } finally {
      setLoading(false);
      // Focus input after response
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, messages]);

  useEffect(() => {
    setCookie("xyz-period", period);
  }, [period]);

  const pLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();

  const header = (
    <div
      className="flex-col md:flex-row"
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: "1px solid hsl(var(--border))",
        flexShrink: 0,
        background: "hsl(var(--background))",
        gap: 12,
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "hsl(var(--primary))",
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "hsl(var(--primary-foreground))" }}>XYZ</span>
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, margin: 0, lineHeight: 1 }}>Storage Advisor</p>
          <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "3px 0 0" }}>AI-powered unit finder</p>
        </div>
      </div>
      <div
        className="w-full md:w-auto"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginLeft: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "hsl(var(--muted-foreground))",
              whiteSpace: "nowrap",
            }}
          >
            Pricing
          </span>

          <Select value={period} onValueChange={(v) => setPeriod(v as PricePeriod)}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ fontFamily: "var(--font-inter)" }}>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs" style={{ fontFamily: "var(--font-inter)" }}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={theme} onValueChange={(v) => setTheme(v as ThemeKey)}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ fontFamily: "var(--font-inter)" }}>
            {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
              <SelectItem key={k} value={k} className="text-xs" style={{ fontFamily: "var(--font-inter)" }}>{THEMES[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => setDark((d) => !d)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "1px solid hsl(var(--border))",
            background: dark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.03)",
            cursor: "pointer",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {dark ? "☀️" : "🌙"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
         html, body {
          font-family: var(--font-inter);
        }

        @keyframes fi { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pi { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
        @keyframes tdot { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
        @keyframes modalIn { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
        html, body, #__next { height: 100%; margin: 0; }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          overflow: "hidden",
          fontFamily: "var(--font-inter)",
        }}
        className={`${inter.variable} ${sora.variable} font-sans bg-background text-foreground`}
      >

        {header}

        {/* ── Body ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* ── DESKTOP: Chat panel (hidden on mobile) ── */}
          <div className="hidden md:flex" style={{
            flexDirection: "column", width: 480, flexShrink: 0,
            borderRight: dark
              ? "1px solid rgba(255,255,255,0.12)"
              : "1px solid rgba(0,0,0,0.08)",
            background: "hsl(var(--background))",
            overflow: "hidden", minHeight: 0,
          }}>
            <ChatContent
              messages={messages} loading={loading} input={input}
              setInput={setInput} send={send}
              inputRef={inputRef} bottomRef={bottomRef}
            />
          </div>

          {/* ── Units panel ── */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            overflow: "hidden", minHeight: 0,
            background: "hsl(var(--muted) / 0.15)",
            animation: unitsVisible ? "pi 0.3s ease both" : undefined,
          }}>
            {!unitsVisible ? (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                textAlign: "center", padding: 32,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: "hsl(var(--muted))", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 28, marginBottom: 16,
                }}>📦</div>
                <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>No units yet</p>
                <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 6, maxWidth: 240 }}>
                  Chat with the advisor and units will appear here.
                </p>
                {/* Mobile: open chat button */}
                <button className="md:hidden" onClick={() => setChatModalOpen(true)} style={{
                  marginTop: 20, padding: "10px 24px", borderRadius: 8, border: "none",
                  cursor: "pointer", fontSize: 14, fontWeight: 600,
                  background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
                }}>Start chatting</button>
              </div>
            ) : (
              <>
                <div style={{
                  flexShrink: 0, display: "flex", alignItems: "center",
                  justifyContent: "space-between", padding: "12px 20px",
                  borderBottom: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background) / 0.9)",
                }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
                      {units.length} unit{units.length !== 1 ? "s" : ""} found
                    </p>
                    <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "3px 0 0" }}>
                      Prices shown {pLabel}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Mobile: re-open chat */}
                    <button className="md:hidden" onClick={() => setChatModalOpen(true)} style={{
                      padding: "0 14px", height: 32, borderRadius: 8, cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
                      border: "none",
                    }}>💬 Chat</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
                  <div style={{
                    display: "grid", gap: 16,
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  }}>
                    {units.map((unit, i) => (
                      <UnitCard
                        key={`${unit.location}-${unit.size}-${i}`}
                        unit={unit} idx={i} period={period} dark={dark}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── MOBILE: Chat modal ── */}
        {chatModalOpen && (
          <div className="md:hidden" style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.5)",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }} onClick={(e) => { if (e.target === e.currentTarget) setChatModalOpen(false); }}>
            <div style={{
              background: dark ? "#0a0a0a" : "#ffffff",
              borderRadius: "20px 20px 0 0",
              height: "85dvh",
              display: "flex", flexDirection: "column",
              animation: "modalIn 0.3s ease both",
              position: "relative",
              zIndex: 51,
            }}>
              {/* Modal header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px 12px",
                borderBottom: "1px solid hsl(var(--border))", flexShrink: 0,
              }}>
                <p style={{
                  fontWeight: 700,
                  fontSize: 15,
                  margin: 0,
                  lineHeight: 1,
                  fontFamily: "var(--font-sora)",
                  letterSpacing: "-0.02em",
                }}>
                  Storage Advisor
                </p>
                <button onClick={() => setChatModalOpen(false)} style={{
                  width: 32, height: 32, borderRadius: 8, border: "1px solid hsl(var(--border))",
                  background: "transparent", cursor: "pointer", fontSize: 18, lineHeight: 1,
                }}>✕</button>
              </div>
              <ChatContent
                messages={messages} loading={loading} input={input}
                setInput={setInput} send={send}
                inputRef={inputRef} bottomRef={bottomRef}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}