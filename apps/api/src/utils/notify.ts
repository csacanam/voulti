/**
 * Telegram alerts for Voulti monitoring.
 *
 * Setup:
 * 1. Create a bot via @BotFather -> copy token
 * 2. Get your chat ID (send /start to bot, then use @userinfobot)
 * 3. Set VOULTI_TELEGRAM_BOT_TOKEN and VOULTI_TELEGRAM_CHAT_ID in .env
 */

const TELEGRAM_BOT_TOKEN = process.env.VOULTI_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.VOULTI_TELEGRAM_CHAT_ID;
const TELEGRAM_API = 'https://api.telegram.org';

export async function sendTelegramAlert(alertKey: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      console.error('[notify] Telegram error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[notify] Telegram send failed:', err.message);
    return false;
  }
}
