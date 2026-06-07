let cachedHtml = null;

export async function getNotifyTemplate() {
  if (cachedHtml) return cachedHtml;
  try {
    const res = await fetch('/application/Static/Components/Notify.phtml', { cache: 'no-store' });
    if (res.ok) {
      cachedHtml = await res.text();
      return cachedHtml;
    }
  } catch (err) {
    console.error('[NotifyTemplate] Fetch error:', err);
  }
  return null;
}
