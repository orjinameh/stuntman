// Notes: the second demo app (different hazard class). node demo/second/server.mjs  (PORT default 3100)
// The Delete button removes the note from what the page renders after the redirect, but the store still holds it.
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const seed = () => ({ notes: [{ id: 1, text: 'Welcome note' }], hidden: new Set(), next: 2 });
let state = seed();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const page = (b) => `<!doctype html><meta charset="utf-8"><title>Notes</title><body style="font:16px system-ui;max-width:640px;margin:30px auto">${b}</body>`;
const send = (res, code, body, type = 'text/html; charset=utf-8', h = {}) => { res.writeHead(code, { 'Content-Type': type, ...h }); res.end(body); };
async function form(req) { const ch = []; for await (const c of req) ch.push(c); return Object.fromEntries(new URLSearchParams(Buffer.concat(ch).toString())); }

// BUG (as an agent would write it): "deleted" notes are only hidden in the session view; the store keeps them.
// A reload re-reads the store and the note comes back.
function visible(url) { return url.searchParams.get('fresh') === '1' ? state.notes : state.notes.filter((n) => !state.hidden.has(n.id)); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, '{"ok":true}', 'application/json');
  if (req.method === 'POST' && url.pathname === '/admin/reset') { state = seed(); return send(res, 200, '{"ok":true}', 'application/json'); }
  if (req.method === 'POST' && url.pathname === '/add') { const f = await form(req); if (f.text) state.notes.push({ id: state.next++, text: f.text }); return send(res, 303, '', 'text/plain', { Location: '/' }); }
  if (req.method === 'POST' && url.pathname === '/delete') { const f = await form(req); state.hidden.add(Number(f.id)); return send(res, 200, listPage(visible(url))); }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/notes')) return send(res, 200, listPage(state.notes));
  return send(res, 404, page('Not found'));
});
function listPage(notes) {
  const rows = notes.map((n) => `<tr class="note-row"><td>${esc(n.text)}</td><td><form method="post" action="/delete"><input type="hidden" name="id" value="${n.id}"><button>Delete</button></form></td></tr>`).join('');
  return page(`<h1>Notes</h1><form method="post" action="/add"><input name="text" placeholder="New note"><button>Add</button></form><table>${rows}</table>`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT || 3100), () => console.log('Notes on http://localhost:' + (process.env.PORT || 3100)));
export { server };
