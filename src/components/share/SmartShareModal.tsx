import React, { useState, useEffect, useRef } from "react";
import { shareDealWithScreenshot } from "../../lib/shareScreenshot";

export interface DealShareData {
  id: string;
  title: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  merchant?: string;
  link: string;
  image?: string;
}

export default function SmartShareModal() {
  const [deal, setDeal] = useState<DealShareData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const handleTrigger = (e: CustomEvent<DealShareData>) => {
      const data = e.detail;
      if (!data) return;

      // Haptic feedback
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([25, 40, 25]);
      }

      setDeal(data);
      setCopied(false);
      setGeneratingCard(false);

      // Construct formatted high-converting message
      const titleClean = (data.title || "Exclusive Deal").trim();
      const priceText = data.price && data.price !== "Check Price" ? data.price : "";
      const origText = data.originalPrice ? data.originalPrice : "";
      const discText = data.discount ? data.discount : "";
      const storeName = data.merchant || "Online Store";
      const directUrl = data.link || "https://dealshubindia.in";
      const canonicalDealUrl = data.id ? "https://dealshubindia.in/deal/" + data.id : directUrl;

      const fullShareText = [
        "🔥 " + (discText ? "[" + discText + "] " : "") + titleClean,
        priceText ? "💰 Deal Price: " + priceText + (origText ? " (MRP: " + origText + ")" : "") : "",
        "⚡ Store: " + storeName,
        "",
        "👉 Grab Deal before it expires:",
        canonicalDealUrl,
        "",
        "📢 Verified via DealsHub India (200+ Daily Loot Drops)"
      ].filter(Boolean).join("\n");

      // On Mobile devices with native share API: Open OS Share Sheet directly!
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        navigator.share({
          title: titleClean,
          text: fullShareText,
          url: canonicalDealUrl
        }).catch((err) => {
          if (err.name !== "AbortError") {
            setIsOpen(true);
          }
        });
        return;
      }

      // On Desktop or if Web Share API rejected: open the frosted-glass Smart Share Sheet
      setIsOpen(true);
    };

    window.addEventListener("open-smart-share", handleTrigger as EventListener);
    return () => window.removeEventListener("open-smart-share", handleTrigger as EventListener);
  }, []);

  const closeModal = () => {
    setIsOpen(false);
  };

  if (!isOpen || !deal) return null;

  const titleClean = (deal.title || "Exclusive Deal").trim();
  const priceText = deal.price && deal.price !== "Check Price" ? deal.price : "";
  const origText = deal.originalPrice ? deal.originalPrice : "";
  const discText = deal.discount ? deal.discount : "";
  const storeName = deal.merchant || "Online Store";
  const directUrl = deal.link || "https://dealshubindia.in";
  const canonicalDealUrl = deal.id ? "https://dealshubindia.in/deal/" + deal.id : directUrl;

  const shareText = [
    "🔥 " + (discText ? "[" + discText + "] " : "") + titleClean,
    priceText ? "💰 Deal Price: " + priceText + (origText ? " (MRP: " + origText + ")" : "") : "",
    "⚡ Store: " + storeName,
    "",
    "👉 Grab Deal before it expires:",
    canonicalDealUrl,
    "",
    "📢 Verified via DealsHub India (200+ Daily Loot Drops)"
  ].filter(Boolean).join("\n");

  const whatsappUrl = "https://api.whatsapp.com/send?text=" + encodeURIComponent(shareText);
  const telegramUrl = "https://t.me/share/url?url=" + encodeURIComponent(canonicalDealUrl) + "&text=" + encodeURIComponent(shareText);
  const twitterUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      showToast("Link & details copied to clipboard! 📋");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast("Failed to copy link");
    }
  };

  const handleGenerateStoryCard = async () => {
    setGeneratingCard(true);
    try {
      await shareDealWithScreenshot(
        {
          title: deal.title,
          image: deal.image,
          price: deal.price,
          originalPrice: deal.originalPrice,
          discount: deal.discount,
          platform: deal.merchant,
          slug: deal.id || "exclusive-deal"
        },
        (msg) => showToast(msg)
      );
    } catch (err: any) {
      showToast("Could not generate card: " + (err.message || "error"));
    } finally {
      setGeneratingCard(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={closeModal} />

      {/* Floating Card Popover */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-[#0e131f] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)] z-10 flex flex-col gap-4 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-sm font-bold">
              ⚡
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                Share Verified Deal
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                DealsHub India Instant Alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Deal Preview Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
          {deal.image && (
            <img
              src={deal.image}
              alt=""
              className="w-14 h-14 object-contain rounded-xl bg-white/95 p-1 border border-white/10 shrink-0"
              onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {storeName}
              </span>
              {discText && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/30">
                  {discText}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">
              {titleClean}
            </p>
            {priceText && (
              <p className="text-xs font-mono font-bold text-emerald-400 mt-1">
                {priceText} {origText && <span className="line-through text-slate-500 text-[10px] ml-1">{origText}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Share Channel Buttons Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeModal}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs shadow-md shadow-[#25D366]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>WhatsApp</span>
          </a>

          {/* Telegram */}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeModal}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs shadow-md shadow-[#0088cc]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .4z"/>
            </svg>
            <span>Telegram</span>
          </a>

          {/* Twitter / X */}
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeModal}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-xs border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>Twitter / X</span>
          </a>

          {/* Copy Full Link & Text */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-xs border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>{copied ? "✓ Copied!" : "📋 Copy Link"}</span>
          </button>
        </div>

        {/* Feature: Generate Story / WhatsApp Status Image Card */}
        <button
          type="button"
          onClick={handleGenerateStoryCard}
          disabled={generatingCard}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-blue-500/20 hover:from-emerald-500/30 hover:to-blue-500/30 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-bold text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          <span>📸</span>
          <span>{generatingCard ? "Generating Visual Story Card..." : "Download / Share as Visual Image Card"}</span>
        </button>

        {/* Micro toast alert inside modal */}
        {toastMsg && (
          <div className="text-center text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-lg animate-fade-in">
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
