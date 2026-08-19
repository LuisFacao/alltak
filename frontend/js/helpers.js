export const MAX_ATTACHMENTS_BYTES = 30 * 1024 * 1024;

export function escapeHtml(str) { /* função para escapar caracteres especiais em HTML */
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toAttrJson(value) { /* função para converter um valor em JSON seguro para atributos HTML */
  return JSON.stringify(value).replace(/'/g, '&#39;');
}

export function normalizePost(p) { /* função para normalizar os dados de um post */
  return {
    id: p.id, title: p.title, desc: p.content, author: p.author,
    tag: p.tag || 'Geral', bg: 'var(--azul-suave)', urgent: !!p.urgent,
    date: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : 'Hoje' };
  }
export function normalizePayslip(p) {/* função para normalizar os dados de um contracheque */
  return {
    id: p.id, recipient: p.recipient, ref: p.ref, fileName: p.file_name,
    fileData: p.file_data, uploadDate: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '' };
  }

export function filesToAttachments(fileList) { /* função para converter uma lista de arquivos em anexos codificados em base64 */
  const files = Array.from(fileList || []);
  if (files.length === 0) return Promise.resolve([]);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_ATTACHMENTS_BYTES) {
    return Promise.reject(new Error(`Os arquivos somam ${(totalSize / 1024 / 1024).toFixed(1)}MB. O limite total é ${(MAX_ATTACHMENTS_BYTES / 1024 / 1024).toFixed(0)}MB.`));
  }
  return Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ file_name: file.name, file_type: file.type || 'application/octet-stream', file_data: reader.result });
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo ' + file.name));
    reader.readAsDataURL(file);
  })));
}

export function checkFileSize(fileOrFiles, maxBytes = MAX_ATTACHMENTS_BYTES) { /* função para verificar se o tamanho de um arquivo ou lista de arquivos excede o limite */
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
  const totalSize = files.reduce((sum, f) => sum + (f ? f.size : 0), 0);
  if (totalSize > maxBytes) {
    return new Error(`O arquivo (${(totalSize / 1024 / 1024).toFixed(1)}MB) excede o limite de ${(maxBytes / 1024 / 1024).toFixed(0)}MB.`);
  }
  return null;
}

export function downloadAttachment(dataUri, fileName) { /* função para baixar um anexo codificado em base64 */
  try {
    const [header, base64] = dataUri.split(',');
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    alert('Erro ao baixar o arquivo: ' + err.message);
  }
}

export function renderAttachments(atts) { /* função para renderizar uma lista de anexos como HTML */
  if (!atts || atts.length === 0) return '';
  const items = atts.map((a) => {
    const type = a.file_type || '';
    const safeName = escapeHtml(a.file_name);
    if (type.startsWith('image/')) return `<a href="${a.file_data}" target="_blank"><img src="${a.file_data}" alt="${safeName}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1.5px solid var(--line);"></a>`;
    if (type.startsWith('video/')) return `<video src="${a.file_data}" controls style="width:140px;height:64px;border-radius:6px;border:1.5px solid var(--line);"></video>`;
    return `<button type="button" onclick='downloadAttachment(${toAttrJson(a.file_data)}, ${toAttrJson(a.file_name)})' style="display:inline-flex;align-items:center;gap:4px;font-size:11px;background:var(--azul-suave);padding:6px 10px;border-radius:6px;border:none;cursor:pointer;color:var(--ink);">📎 ${safeName}</button>`;
  }).join('');
  return `<div class="attach-list" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">${items}</div>`;
}

export function showFilePreview(input, previewId) { /* função para mostrar uma pré-visualização dos arquivos selecionados em um input */
  const preview = document.getElementById(previewId);
  if (!preview) return;
  const files = Array.from(input.files || []);
  if (files.length === 0) { preview.innerHTML = ''; return; }
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const formatSize = (bytes) => bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + 'MB' : (bytes / 1024).toFixed(0) + 'KB';
  const overLimit = totalSize > MAX_ATTACHMENTS_BYTES;
  preview.innerHTML = files.map(f => `• ${escapeHtml(f.name)} (${formatSize(f.size)})`).join('<br>') +
    `<br><strong style="color:${overLimit ? '#c0392b' : 'inherit'}">Total: ${formatSize(totalSize)} / ${formatSize(MAX_ATTACHMENTS_BYTES)}</strong>`;
}

export function normalizefeedback(f) { /* função para normalizar os dados de um feedback */
  return { id: f.id, subject: f.category, message: f.message, rating: f.rating, userEmail: f.user_email, attachments: f.attachments || [], date: f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '' };
}

export function normalizeDirectfeedback(f) { /* função para normalizar os dados de um feedback direto */
  return { id: f.id, recipient: f.recipient, message: f.message, attachments: f.attachments || [], date: f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '' };
}

export function rebuildEventsMap(list) { /* função para reconstruir um mapa de eventos a partir de uma lista de eventos */
  const map = {};
  (list || []).forEach(ev => {
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push({ id: ev.id, title: ev.title, color: ev.color });
  });
  return map;
}

export function readFileAsDataURL(file) { /* função para ler um arquivo como Data URL (base64) */
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function matchEmailForFile(fileName, emails) { /* função para encontrar um e-mail correspondente a um nome de arquivo */
  const nameNoExt = fileName.toLowerCase().replace(/\.[^/.]+$/, '');

  const exact = emails.find(email => email.split('@')[0].toLowerCase() === nameNoExt);
  if (exact) return exact;

  const tokenMatch = emails.find(email => {
    const prefix = email.split('@')[0].toLowerCase();
    const pattern = new RegExp(`(^|[._\\-\\s])${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[._\\-\\s])`);
    return pattern.test(nameNoExt);
  });
  return tokenMatch || null;
}
