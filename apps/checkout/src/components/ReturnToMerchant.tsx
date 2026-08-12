import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { interpolate } from '../utils/i18n';

const REDIRECT_SECONDS = 5;

interface ReturnToMerchantProps {
  returnUrl: string;
  commerceName: string;
  /**
   * Whether to leave on a timer, rather than only on the button.
   *
   * Passed `true` only for a paid invoice. On an expired or refunded one the
   * payer is reading why their money did not go through, and pushing them off
   * that screen on a countdown takes the explanation away mid-sentence.
   *
   * It also happens to be what keeps this from being an open redirect worth
   * having: registering a throwaway commerce is cheap, so a timer that fires
   * on expiry alone would hand anyone a self-triggering bounce off our domain.
   * Tying it to `Paid` means the bounce costs a real payment first.
   */
  autoRedirect: boolean;
}

export function ReturnToMerchant({ returnUrl, commerceName, autoRedirect }: ReturnToMerchantProps) {
  const { t } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (!autoRedirect) return;

    const tick = setInterval(() => {
      setSecondsLeft(previous => {
        if (previous <= 1) {
          clearInterval(tick);
          window.location.href = returnUrl;
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [autoRedirect, returnUrl]);

  return (
    <div className="mt-4 space-y-2">
      {/* A real link, not a button that navigates: it survives the timer being
          cancelled, works on a middle click, and is the only way back for a
          payer who paid from their phone and returned to a stale tab. */}
      <a
        href={returnUrl}
        className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-medium rounded-lg px-4 py-3 min-h-[48px] transition-colors"
      >
        {interpolate(t.payment.backToMerchant, { commerce: commerceName })}
        <ArrowRight className="w-4 h-4" />
      </a>

      {autoRedirect && secondsLeft > 0 && (
        <p className="text-center text-sm text-gray-500">
          {interpolate(t.payment.redirectingIn, { seconds: String(secondsLeft) })}
        </p>
      )}
    </div>
  );
}
