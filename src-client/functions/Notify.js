import { placeholder } from '@f/Placeholder';
import { safeDebugFormat } from '@f/Json';
import { CFG } from '@f/notify/NotifyConfig.js';
import { getNotifyTemplate } from '@f/notify/NotifyTemplate.js';
import { NotifyToast } from '@f/notify/NotifyToast.js';

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

export default async function notify(msg, type = 'default') {
  try {
    const container = document.querySelector('.toast-container');
    const htmlTmpl = await getNotifyTemplate();

    if (!container || !htmlTmpl) return;

    const id = `notif-${Math.random().toString(36).slice(2, 11)}`;
    const conf = CFG[type] || CFG.default;

    const isSpecial = (type === 'debug' || type === 'json');
    const rawMessage = isSpecial ? Json(msg) : escapeHtml(msg);
    const displayMessage = isSpecial
      ? `<pre class="text-[11px] font-mono break-all selection:bg-white/20">${escapeHtml(rawMessage)}</pre>`
      : msg;

    const html = placeholder(htmlTmpl, { id, message: displayMessage, ...conf });
    container.insertAdjacentHTML('beforeend', html);

    const el = document.getElementById(id);

    const toast = new NotifyToast(el, { displayMessage, conf });
    await toast.init();

  } catch (err) {
    console.error('Notify System Error:', err);
  }
}
