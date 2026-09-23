const ANEXO_MAXIMO_BYTES = 30 * 1024 * 1024;

export const Formata = {
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  toAttrJson(value) {
    return JSON.stringify(value).replace(/'/g, '&#39;');
  },

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  filesToAttachments(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return Promise.resolve([]);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > ANEXO_MAXIMO_BYTES) {
      return Promise.reject(new Error(`Os arquivos somam ${(totalSize / 1024 / 1024).toFixed(1)}MB. O limite total é ${(ANEXO_MAXIMO_BYTES / 1024 / 1024).toFixed(0)}MB.`));
    }

    return Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ file_name: file.name, file_type: file.type || 'application/octet-stream', file_data: reader.result });
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo ' + file.name));
      reader.readAsDataURL(file);
    })));
  },

  checkFileSize(fileOrFiles, maxBytes = ANEXO_MAXIMO_BYTES) {
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    const totalSize = files.reduce((sum, f) => sum + (f ? f.size : 0), 0);
    if (totalSize > maxBytes) {
      return new Error(`O arquivo (${(totalSize / 1024 / 1024).toFixed(1)}MB) excede o limite de ${(maxBytes / 1024 / 1024).toFixed(0)}MB.`);
    }
    return null;
  },

  downloadAttachment(data, fileName) {
    try {
      if (!data) throw new Error('Arquivo não encontrado.');

      if (data instanceof Blob) {
        const url = URL.createObjectURL(data);

        const a = document.createElement('a');
          a.href = url;
          a.download = fileName || 'arquivo';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
            setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 1000);
        return;
      }

      if (typeof data === 'string') {
        if (data.startsWith('data:')) {
          const commaIndex = data.indexOf(',');
            if (commaIndex === -1) throw new Error('Formato de arquivo inválido.');
          const header = data.substring(0, commaIndex);
          const base64 = data.substring(commaIndex + 1);
          const mimeMatch = header.match(/data:(.*?);base64/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }

          const blob = new Blob([bytes], { type: mime });

          const url = URL.createObjectURL(blob);

          const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'arquivo';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 1000);
          return;
        }

        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }

        const blob =
          new Blob([bytes], {
            type: 'application/octet-stream'
          });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
          a.href = url;
          a.download = fileName || 'arquivo';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);
        return;
      }
      throw new Error('Formato de arquivo não suportado.');
    } catch (err) {
      console.error(
        'Erro ao baixar arquivo:',
        err
      );
      alert(
        'Erro ao baixar o arquivo: ' +
        (err?.message || 'Erro desconhecido')
      );
    }
  },

  openAttachment(data) {
    try {
      if (!data) throw new Error('Arquivo não encontrado.');

      let blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (typeof data === 'string' && data.startsWith('data:')) {
        const commaIndex = data.indexOf(',');
        if (commaIndex === -1) throw new Error('Formato de arquivo inválido.');
        const header = data.substring(0, commaIndex);
        const base64 = data.substring(commaIndex + 1);
        const mimeMatch = header.match(/data:(.*?);base64/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mime });
      } else {
        throw new Error('Formato de arquivo não suportado.');
      }

      // Navegadores baseados em Chromium bloqueiam navegação direta
      // para data: URLs em nova aba. Um Blob URL (blob:...) não sofre
      // essa restrição, então convertemos antes de abrir.
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        alert('O navegador bloqueou a abertura da aba. Permita pop-ups para este site.');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('Erro ao abrir anexo:', err);
      alert('Erro ao abrir o arquivo: ' + (err?.message || 'Erro desconhecido'));
    }
  },

  renderAttachments(atts) {
    if (!atts || atts.length === 0) return '';
    const items = atts.map((a) => {
      const type = a.file_type || '';
      const safeName = Formata.escapeHtml(a.file_name);
      if (type.startsWith('image/')) return `<button type="button" onclick='openAttachment(${Formata.toAttrJson(a.file_data)})' style="padding:0;border:none;background:none;cursor:pointer;"><img src="${a.file_data}" alt="${safeName}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1.5px solid var(--line);"></button>`;
      if (type.startsWith('video/')) return `<video src="${a.file_data}" controls style="width:140px;height:64px;border-radius:6px;border:1.5px solid var(--line);"></video>`;
      return `<button type="button" onclick='downloadAttachment(${Formata.toAttrJson(a.file_data)}, ${Formata.toAttrJson(a.file_name)})' style="display:inline-flex;align-items:center;gap:4px;font-size:11px;background:var(--azul-suave);padding:6px 10px;border-radius:6px;border:none;cursor:pointer;color:var(--ink);">📎 ${safeName}</button>`;
    }).join('');
    return `<div class="attach-list" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">${items}</div>`;
  },

  showFilePreview(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    const files = Array.from(input.files || []);
    if (files.length === 0) { preview.innerHTML = ''; return; }
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const formatSize = (bytes) => bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + 'MB' : (bytes / 1024).toFixed(0) + 'KB';
    const overLimit = totalSize > ANEXO_MAXIMO_BYTES;
    preview.innerHTML = files.map(f => `• ${Formata.escapeHtml(f.name)} (${formatSize(f.size)})`).join('<br>') +
      `<br><strong style="color:${overLimit ? '#c0392b' : 'inherit'}">Total: ${formatSize(totalSize)} / ${formatSize(ANEXO_MAXIMO_BYTES)}</strong>`;
  },

  matchEmailForFile(fileName, emails) {
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
};

export const Normalizers = {
  post(p) {
    return {
      id: p.id, title: p.title, desc: p.content, author: p.author,
      tag: p.tag || 'Geral', bg: 'var(--azul-suave)', urgent: !!p.urgent,
      date: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : 'Hoje' 
    };
  },

  holerite(p) {
    return {
      id: p.id, recipient: p.recipient, ref: p.ref, fileName: p.file_name,
      fileData: p.file_data, uploadDate: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '' 
    };
  },

  feedback(f) {
    return { id: f.id, subject: f.category, message: f.message, rating: f.rating, userEmail: f.user_email, attachments: f.attachments || [], date: f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '' };
  },

  directFeedback(f) {
    return { id: f.id, recipient: f.recipient, message: f.message, attachments: f.attachments || [], date: f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '' };
  }
};