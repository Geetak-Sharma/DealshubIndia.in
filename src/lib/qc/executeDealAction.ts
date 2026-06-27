
import type { NormalizedQCDeal } from './types';

export async function executeDealAction(
  deal: NormalizedQCDeal,
  onDrawerOpen: (deal: NormalizedQCDeal) => void,
  onShowToast: (message: string, isSuccess: boolean) => void
) {
  const { copyText, redirectUrl, openDrawer } = deal.primaryAction;

  let copySuccess = false;

  if (copyText) {
    try {
      await navigator.clipboard.writeText(copyText);
      copySuccess = true;
      onShowToast(`Copied "${copyText}" to clipboard!`, true);
    } catch (err) {
      try {
        const el = document.createElement('textarea');
        el.value = copyText;
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        copySuccess = true;
        onShowToast(`Copied "${copyText}" to clipboard!`, true);
      } catch (fallbackErr) {
        copySuccess = false;
        onShowToast(`Failed to copy. Please copy manually: "${copyText}"`, false);
      }
    }
  }

  if (openDrawer) {
    onDrawerOpen(deal);
  }

  if (redirectUrl) {
    window.open(redirectUrl, '_blank', 'noopener,noreferrer');
  }
}
