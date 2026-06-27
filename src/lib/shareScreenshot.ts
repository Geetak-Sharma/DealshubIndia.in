/**
 * Utility to generate a high-quality "Liquid Glass" style screenshot of a deal
 * and share it using the Web Share API (or download it as fallback).
 */

interface ShareDealPayload {
  title: string;
  image?: string | null;
  fallbackSvg?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  discount?: string | null | number;
  platform?: string | null;
  isLoot?: boolean | null;
  slug: string;
}

export async function shareDealWithScreenshot(deal: ShareDealPayload, showToast: (msg: string, isSuccess: boolean) => void) {
  let shareUrl = `https://dealshubindia.in/deal/${deal.slug}`;
  const isQc = ['zepto', 'blinkit', 'instamart', 'swiggy', 'zomato', 'bigbasket', 'bb now', 'bbnow'].some(m => 
    deal.platform?.toLowerCase().includes(m)
  );
  if (isQc) {
    shareUrl = `https://dealshubindia.in/quick-commerce/${deal.slug}`;
  }
  const shareText = `🔥 ${deal.title}\n\n${deal.price ? `Deal Price: ${deal.price}\n` : ''}${deal.discount ? `Discount: ${deal.discount}\n` : ''}Found on Dealshub India:\n${shareUrl}`;

  try {
    showToast("Generating screenshot card...", true);

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    // 1. Draw Liquid Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 800);
    bgGrad.addColorStop(0, '#06090e');
    bgGrad.addColorStop(0.5, '#0b0f19');
    bgGrad.addColorStop(1, '#020508');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 800);

    // 2. Draw Liquid Glass Background Blobs
    // Blob 1: Orange/Amber (Top Right)
    const blob1 = ctx.createRadialGradient(650, 150, 10, 650, 150, 300);
    blob1.addColorStop(0, 'rgba(252, 128, 25, 0.2)');
    blob1.addColorStop(1, 'rgba(252, 128, 25, 0)');
    ctx.fillStyle = blob1;
    ctx.beginPath();
    ctx.arc(650, 150, 300, 0, Math.PI * 2);
    ctx.fill();

    // Blob 2: Emerald Green (Bottom Left)
    const blob2 = ctx.createRadialGradient(150, 650, 10, 150, 650, 300);
    blob2.addColorStop(0, 'rgba(34, 197, 94, 0.18)');
    blob2.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = blob2;
    ctx.beginPath();
    ctx.arc(150, 650, 300, 0, Math.PI * 2);
    ctx.fill();

    // Blob 3: Neon Blue (Center Right)
    const blob3 = ctx.createRadialGradient(700, 500, 10, 700, 500, 250);
    blob3.addColorStop(0, 'rgba(0, 136, 204, 0.15)');
    blob3.addColorStop(1, 'rgba(0, 136, 204, 0)');
    ctx.fillStyle = blob3;
    ctx.beginPath();
    ctx.arc(700, 500, 250, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Frosted Glass Card Panel
    const cardX = 40;
    const cardY = 40;
    const cardW = 720;
    const cardH = 720;
    const cardR = 28;

    // Draw frosted card shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 20;

    // Draw card background
    ctx.fillStyle = 'rgba(11, 15, 24, 0.72)';
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fill();

    // Reset shadow for other drawings
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw subtle white noise/frosting texture simulation
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fill();

    // 4. Draw Premium Refraction Border (Glass Edge Glow)
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)'); // Bright top-left edge
    borderGrad.addColorStop(0.3, 'rgba(34, 197, 94, 0.35)'); // Green accent
    borderGrad.addColorStop(0.7, 'rgba(0, 136, 204, 0.35)'); // Blue accent
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)'); // Translucent bottom-right edge
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 5. Draw Header Branding
    ctx.font = '900 13px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText('DEALSHUB INDIA', cardX + 30, cardY + 45);

    // Draw Live Badge Glass Panel
    const liveText = 'LIVE';
    ctx.font = '800 11px sans-serif';
    const liveW = ctx.measureText(liveText).width + 24;
    const liveH = 26;
    const liveX = cardX + cardW - liveW - 30;
    const liveY = cardY + 30;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    drawRoundedRect(ctx, liveX, liveY, liveW, liveH, 8);
    ctx.fill();
    ctx.stroke();

    // Green dot
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(liveX + 10, liveY + 13, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22C55E';
    ctx.textAlign = 'left';
    ctx.fillText(liveText, liveX + 18, liveY + 17);

    // 6. Draw Merchant Badge (Floating Pill)
    const merchant = deal.platform || deal.merchant || 'Offer';
    ctx.font = '900 11px sans-serif';
    const mWidth = ctx.measureText(merchant.toUpperCase()).width;
    const pillW = mWidth + 24;
    const pillH = 26;
    const pillX = cardX + 30;
    const pillY = cardY + 75;
    
    // Draw Merchant Pill Glass Panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(merchant.toUpperCase(), pillX + 12, pillY + 17);

    // 7. Load & Draw Product Image
    let imgDrawSuccess = false;
    if (deal.image) {
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const imageObj = new Image();
          imageObj.crossOrigin = 'anonymous';
          imageObj.onload = () => resolve(imageObj);
          imageObj.onerror = (err) => reject(err);
          // Route through image proxy if it is remote
          imageObj.src = deal.image!.startsWith('http') ? `/api/image-proxy?url=${encodeURIComponent(deal.image!)}` : deal.image!;
        });

        const boxSize = 340;
        const boxX = cardX + (cardW - boxSize) / 2;
        const boxY = cardY + 120;
        
        // Draw Image background glow block (Liquid highlight behind image)
        const imgGlow = ctx.createRadialGradient(boxX + boxSize/2, boxY + boxSize/2, 10, boxX + boxSize/2, boxY + boxSize/2, 180);
        imgGlow.addColorStop(0, 'rgba(34, 197, 94, 0.08)');
        imgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = imgGlow;
        ctx.fillRect(boxX - 20, boxY - 20, boxSize + 40, boxSize + 40);

        // Draw image frame
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 20);
        ctx.fill();
        ctx.stroke();

        // Calculate aspect ratios for object-contain logic
        const imgRatio = img.width / img.height;
        let drawW = boxSize - 30;
        let drawH = boxSize - 30;
        if (imgRatio > 1) {
          drawH = drawW / imgRatio;
        } else {
          drawW = drawH * imgRatio;
        }

        const drawX = boxX + (boxSize - drawW) / 2;
        const drawY = boxY + (boxSize - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        imgDrawSuccess = true;
      } catch (err) {
        console.warn("Failed to draw deal image on canvas:", err);
      }
    }

    // Draw Fallback SVG styling if image failed or was not present
    if (!imgDrawSuccess) {
      const boxSize = 340;
      const boxX = cardX + (cardW - boxSize) / 2;
      const boxY = cardY + 120;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.font = '80px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(deal.isLoot ? '🔥' : '🛍️', boxX + boxSize/2, boxY + boxSize/2 + 25);
      ctx.textAlign = 'left';
    }

    // 8. Draw Discount Pill Badge
    const discountText = deal.discount ? String(deal.discount).toUpperCase() : (deal.isLoot ? 'LOOT' : '');
    if (discountText) {
      ctx.font = '900 12px sans-serif';
      const discW = ctx.measureText(discountText).width;
      const dPillW = discW + 20;
      const dPillH = 28;
      const dPillX = cardX + cardW - dPillW - 30;
      const dPillY = cardY + 75;

      // Premium emerald glow/solid background
      ctx.fillStyle = '#22C55E';
      drawRoundedRect(ctx, dPillX, dPillY, dPillW, dPillH, 8);
      ctx.fill();

      ctx.fillStyle = '#021a0a';
      ctx.fillText(discountText, dPillX + 10, dPillY + 18);
    }

    // 9. Product Title Drawing (With wrapping)
    ctx.font = '700 22px sans-serif';
    ctx.fillStyle = '#ffffff';
    wrapText(ctx, deal.title, cardX + 30, cardY + 500, cardW - 60, 30);

    // 10. Price and Original Strike Price
    const priceText = deal.price || 'Check Deal';
    ctx.font = '900 36px sans-serif';
    ctx.fillStyle = '#39FF14'; // Bright green glowing color
    ctx.fillText(priceText, cardX + 30, cardY + 610);
    const pLen = ctx.measureText(priceText).width;

    if (deal.originalPrice && deal.originalPrice !== deal.price) {
      ctx.font = '600 18px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(deal.originalPrice, cardX + 30 + pLen + 15, cardY + 602);
      const origLen = ctx.measureText(deal.originalPrice).width;

      // Draw strike line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cardX + 30 + pLen + 12, cardY + 596);
      ctx.lineTo(cardX + 30 + pLen + 18 + origLen, cardY + 596);
      ctx.stroke();
    }

    // 11. Bottom Verified Branding Strip (Liquid glass style banner)
    const bBarX = cardX + 30;
    const bBarY = cardY + 650;
    const bBarW = cardW - 60;
    const bBarH = 46;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, bBarX, bBarY, bBarW, bBarH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = '800 11px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.letterSpacing = '1px';
    ctx.textAlign = 'center';
    ctx.fillText('GET THIS DEAL NOW ON DEALSHUBINDIA.IN', bBarX + bBarW / 2, bBarY + 27);
    ctx.textAlign = 'left'; // Reset

    // Convert Canvas to file and trigger navigator.share
    canvas.toBlob(async (blob) => {
      if (!blob) {
        showToast("Error generating card image", false);
        return;
      }
      
      const file = new File([blob], `${deal.slug}-deal.png`, { type: 'image/png' });
      
      // Attempt file sharing
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: deal.title,
            text: shareText,
          });
          showToast("Deal shared successfully!", true);
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            triggerDownloadFallback(blob, deal.slug, shareText, showToast);
          }
        }
      } else {
        // Fallback: download image and copy text link
        triggerDownloadFallback(blob, deal.slug, shareText, showToast);
      }
    }, 'image/png');

  } catch (err: any) {
    console.error("Screenshot sharing error:", err);
    showToast(`Sharing failed: ${err.message}`, false);
  }
}

function triggerDownloadFallback(blob: Blob, slug: string, shareText: string, showToast: (msg: string, isSuccess: boolean) => void) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-deal.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Copy text details
    navigator.clipboard.writeText(shareText).then(() => {
      showToast("Deal image downloaded & link copied to clipboard!", true);
    }).catch(() => {
      showToast("Deal card image downloaded! Copy details to share.", true);
    });
  } catch {
    showToast("Failed to download share card", false);
  }
}

// Helpers
function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
      lineCount++;
      if (lineCount >= 2) {
        // Truncate text if it exceeds 2 lines
        if (n < words.length - 1) {
          ctx.fillText(line.trim() + '...', x, y);
          return;
        }
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
