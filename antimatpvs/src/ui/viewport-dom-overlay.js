/**
 * Renders attached HTML/CSS from the virtual file store on top of the 3D viewport.
 * Uses Shadow DOM so user CSS does not leak into the rest of the editor.
 */

const BASE_SHADOW_CSS = `
:host {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  overflow: hidden;
}
.navme-html-mount {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 16px;
  pointer-events: none;
}
/* Children can receive clicks (e.g. your overlay UIs) */
.navme-html-mount > .navme-file-chunk {
  pointer-events: auto;
}
`;

/**
 * @param {HTMLElement} viewportEl
 */
export function createViewportDomOverlay(viewportEl) {
  const host = document.createElement('div');
  host.className = 'viewport-dom-overlay-host';
  host.setAttribute('aria-hidden', 'true');

  const shadow = host.attachShadow({ mode: 'open' });
  const baseStyle = document.createElement('style');
  baseStyle.textContent = BASE_SHADOW_CSS;
  const userStyle = document.createElement('style');
  const mount = document.createElement('div');
  mount.className = 'navme-html-mount';

  shadow.appendChild(baseStyle);
  shadow.appendChild(userStyle);
  shadow.appendChild(mount);

  viewportEl.appendChild(host);

  return {
    /**
     * @param {() => Array<{ attachedTo: string|null, ext: string, name: string, source: string }>} getFiles
     */
    refresh(getFiles) {
      const files = getFiles();
      const htmlParts = [];
      const cssParts = [];
      for (const f of files) {
        if (!f.attachedTo) continue;
        if (f.ext === 'html') {
          htmlParts.push(`<div class="navme-file-chunk" data-navme-file="${escapeAttr(f.name)}">${f.source}</div>`);
        } else if (f.ext === 'css') {
          cssParts.push(f.source);
        }
      }
      mount.innerHTML = htmlParts.join('\n');
      userStyle.textContent = cssParts.join('\n');
    },
  };
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
