const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src/app/features/commercial/quotes/facade-builder.component.css');
let css = fs.readFileSync(cssPath, 'utf8');

const mapping = {
  '#0f172a': 'var(--fb-bg-main)',
  '#111827': 'var(--fb-bg-main)',
  '#1e293b': 'var(--fb-bg-sec)',
  '#1a1f35': 'var(--fb-bg-sec)',
  '#1a2035': 'var(--fb-bg-sec)',
  '#334155': 'var(--fb-border)',
  '#475569': 'var(--fb-border-hover)',
  '#273548': 'var(--fb-bg-ter)',
  '#253348': 'var(--fb-bg-ter)',
  '#64748b': 'var(--fb-text-muted)',
  '#94a3b8': 'var(--fb-text-sec)',
  '#e2e8f0': 'var(--fb-text-main)',
  '#f8fafc': 'var(--fb-text-main)',
};

for (const [hex, variable] of Object.entries(mapping)) {
  const regex = new RegExp(hex, 'gi');
  css = css.replace(regex, variable);
}

const vars = `
/* ── Variables de Tema ───────────────────────────────── */
.facade-builder-overlay {
  --fb-bg-main: #ffffff;
  --fb-bg-sec: #f8fafc;
  --fb-bg-ter: #f1f5f9;
  --fb-border: #e2e8f0;
  --fb-border-hover: #cbd5e1;
  --fb-text-main: #0f172a;
  --fb-text-sec: #334155;
  --fb-text-muted: #64748b;
}

:host-context(.dark) .facade-builder-overlay,
.dark .facade-builder-overlay {
  --fb-bg-main: #0f172a;
  --fb-bg-sec: #1e293b;
  --fb-bg-ter: #334155;
  --fb-border: #334155;
  --fb-border-hover: #475569;
  --fb-text-main: #f8fafc;
  --fb-text-sec: #94a3b8;
  --fb-text-muted: #64748b;
}

`;

css = css.replace(/(\/\* ── Overlay[^\n]*\n\.facade-builder-overlay {)/, vars + '$1');

fs.writeFileSync(cssPath, css);
console.log('Colors replaced successfully!');
