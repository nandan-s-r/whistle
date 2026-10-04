// One-time source migration. Colours become shared roles; layout and behaviour stay intact.
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('../frontend/node_modules/postcss');
const app = path.resolve(__dirname, '../frontend/src/app');
const nav = /research-sidebar|research-nav|sidebar-|workspace-identity|workspace-dot|workspace-monogram|auth-story|auth-pitch|auth-journey|assistant-drawer/;
const primary = new Set(['2563eb','1d4ed8','3b82f6','0ea5e9','94b6ff','95b8ff','a9c6ff','8daedc']);
const texts = new Set(['0b1220','132a4a','14263f','253d5c','263448','244362','405069','253145','33435a','30445e','334358','1e334f','314765']);
function convert(value, property, selector) {
  const original = value.toLowerCase();
  let hex = original.slice(1);
  if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
  if (hex.length === 8) {
    const rgb = hex.slice(0,6);
    if (texts.has(rgb)) return '#242321'+hex.slice(6);
    if (primary.has(rgb)) return '#a94425'+hex.slice(6);
    return value;
  }
  if (hex.length !== 6) return value;
  const [r,g,b] = [0,2,4].map(i => parseInt(hex.slice(i,i+2),16));
  const isText = /^(color|fill|stroke|caret-color|outline|outline-color|accent-color)$/.test(property);
  const isBorder = property.includes('border');
  const fixed = nav.test(selector);
  const role = name => `var(--theme-${name})`;
  if (primary.has(hex)) return role(isText ? 'link' : 'brand');
  if (hex === '202e43' || hex === '202e44') return role(fixed ? 'brand' : 'accent-soft');
  if (hex === 'ffffff') return isText ? role(fixed ? 'nav-text' : 'on-brand') : role('surface');
  if (texts.has(hex)) return role(isText ? (fixed ? 'nav-text' : 'text') : (isBorder ? (fixed ? 'nav-border' : 'border') : 'ink'));
  const high = Math.max(r,g,b), low = Math.min(r,g,b);
  if (fixed) {
    if (isText) return role(high > 170 ? 'nav-text' : 'nav-muted');
    if (isBorder) return role('nav-border');
    if (high < 160) return role('nav-raised');
  }
  // Keep evidence/alert meaning, with warm forest rather than cyan-green.
  if (g > r * 1.15 && g > b * 1.04) return role(isText ? 'verified' : low > 170 ? 'verified-soft' : 'verified');
  if (r > g * 1.3 && r > b * 1.2) return role(isText ? (g > b * 1.25 ? 'warning' : 'risk') : low > 170 ? (g > b + 10 ? 'warning-soft' : 'risk-soft') : (g > b * 1.25 ? 'warning' : 'risk'));
  if (b > r * 1.3 && b > g * 1.2) return role(isText ? 'link' : low > 170 ? 'accent-soft' : 'brand');
  if (b > g * 1.3 && r > g * 1.1) return role(isText ? 'ai' : low > 170 ? 'ai-soft' : 'ai');
  if (isText) return role(high < 80 ? 'text' : 'muted');
  if (isBorder) return role('border');
  if (/shadow/.test(property)) return '#242321';
  if (low > 247) return role('surface');
  if (low > 210) return role('raised');
  return role(high < 90 ? 'ink' : 'raised');
}
for (const name of fs.readdirSync(app).filter(name => name.endsWith('.css') && !['palette.css','theme.css','theme-tokens.css'].includes(name))) {
  const file = path.join(app,name), sheet = postcss.parse(fs.readFileSync(file,'utf8'));
  sheet.walkDecls(decl => {
    if (decl.prop.startsWith('--theme-')) return;
    const selector = decl.parent.selector || '';
    decl.value = decl.value.replace(/#[0-9a-f]{3,8}\b/gi, value => convert(value,decl.prop,selector));
    decl.value = decl.value.replace(/rgba\(\s*(?:37\s*,\s*99\s*,\s*235|19\s*,\s*42\s*,\s*74|11\s*,\s*18\s*,\s*32|59\s*,\s*130\s*,\s*246)\s*,\s*([.\d]+)\s*\)/gi, 'rgba(36,35,33,$1)');
    decl.value = decl.value.replaceAll('var(--theme-blue-soft)', 'var(--theme-accent-soft)');
    if (decl.value.includes('var(--accent-blue)')) decl.value = decl.value.replaceAll('var(--accent-blue)', `var(--theme-${/background|border/.test(decl.prop) ? 'brand' : 'link'})`);
  });
  fs.writeFileSync(file,sheet.toString());
}
console.log('Shared warm palette applied to stylesheet colour roles.');
