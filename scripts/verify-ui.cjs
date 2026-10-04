const {chromium, expect} = require('../frontend/node_modules/@playwright/test');
const {randomUUID} = require('node:crypto');
const {mkdirSync,writeFileSync} = require('node:fs');
const path = require('node:path');
(async () => {
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({baseURL:process.env.DESIGN_BASE_URL || 'http://127.0.0.1:3000',viewport:{width:1440,height:960}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const output=path.resolve(__dirname,'../docs/screenshots');
  mkdirSync(output,{recursive:true});
  const shots=[];
  const accessibility=[];
  let accessibilityChecks=0;
  async function shot(name) { const file=path.join(output,name+'.png'); await page.screenshot({path:file}); shots.push(name); }
  async function audit(route,width) {
    // Audit settled colours rather than an intermediate entrance animation.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.addScriptTag({path:path.resolve(__dirname,'../frontend/node_modules/axe-core/axe.min.js')});
    const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
    accessibilityChecks++;
    if(violations.length) accessibility.push({width,route,violations});
  }
  try {
    await page.goto('/login');
    await expect(page.getByRole('heading',{name:'Sign in.'})).toBeVisible();
    await audit('/login',1440);
    await page.setViewportSize({width:390,height:844});
    await audit('/login',390);
    await page.setViewportSize({width:1440,height:960});
    await page.goto('/signup');
    await expect(page.getByRole('heading',{name:'Create your workspace.'})).toBeVisible();
    await shot('decision-signup');
    await audit('/signup',1440);
    await page.setViewportSize({width:390,height:844});
    await audit('/signup',390);
    await page.setViewportSize({width:1440,height:960});
    await page.getByLabel('Full name',{exact:true}).fill('Nandan');
    await page.getByLabel('Email address',{exact:true}).fill('design-'+randomUUID()+'@example.invalid');
    await page.getByLabel('Password',{exact:true}).fill(randomUUID()+'Aa1!');
    await page.getByRole('button',{name:'Create workspace',exact:true}).click();
    await expect(page.getByRole('link',{name:'Discover',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Open demonstration scenario',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Your research desk'})).toBeVisible();
    await shot('decision-today-desktop');
    await page.keyboard.press('j');
    await expect(page.locator('.queue-select').first()).toBeFocused();
    await page.keyboard.press('j');
    await expect(page.locator('.queue-select').nth(1)).toBeFocused();
    await expect(page.locator('.queue-select').nth(1)).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Conflicts',exact:true}).click();
    await page.getByRole('link',{name:'Discover',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Discover',exact:true})).toBeVisible();
    await shot('decision-discover-desktop');
    await page.getByRole('combobox',{name:'Sort companies'}).selectOption('Source count');
    await page.getByRole('link',{name:/^Today/}).click();
    await expect(page.getByRole('button',{name:'Conflicts',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('link',{name:'Discover',exact:true}).click();
    await expect(page.getByRole('combobox',{name:'Sort companies'})).toHaveValue('Source count');
    await page.getByRole('link',{name:'Pipeline',exact:true}).click();
    await expect(page.locator('.pipeline-board')).toBeVisible();
    await shot('decision-pipeline-desktop');
    await page.goto('/companies/atlasops');
    await expect(page.getByRole('heading',{name:/^AtlasOps/})).toBeVisible();
    await shot('decision-company-desktop');
    await page.keyboard.press('e');
    await expect(page.getByRole('dialog')).toBeVisible();
    await audit('/companies/atlasops#evidence-drawer',1440);
    await page.keyboard.press('Escape');
    await page.goto('/library?section=Investment%20thesis');
    await expect(page.locator('.library-document')).toBeVisible();
    await shot('decision-library-desktop');
    const overflow=[];
    for (const width of [1440,1024,768,390]) {
      await page.setViewportSize({width,height:960});
      for (const route of ['/','/discover','/pipeline','/library?section=Investment%20thesis','/companies/atlasops?tab=Evidence','/companies/atlasops?tab=Memo','/portfolio']) {
        await page.goto(route);
        await expect(page.locator('#workspace-main .page-content')).toBeVisible();
        const measure=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
        if (measure.scroll>measure.width) overflow.push({width,route,...measure});
        if(route==='/' && width!==1440) await shot('decision-today-'+width);
        if(width===1440 || width===390) {
          await audit(route,width);
        }
      }
    }
    expect(overflow).toEqual([]);
    await page.goto('/');
    await page.locator('summary[aria-label="Account options"]').click();
    await expect(page.getByRole('button',{name:'Sign out of workspace',exact:true})).toBeVisible();
    await audit('/#account-options',390);
    expect(errors).toEqual([]);
    mkdirSync(path.resolve(__dirname,'../scratch'),{recursive:true});
    writeFileSync(path.resolve(__dirname,'../scratch/design-accessibility.json'),JSON.stringify(accessibility,null,2));
    console.log(JSON.stringify({screenshots:shots,viewportRoutes:28,overflow,consoleErrors:errors,accessibilityChecks,accessibilityViolations:accessibility,interactiveChecks:['queue keyboard selection','review filter memory','discovery sort memory','pipeline board','company evidence shortcut']},null,2));
    expect(accessibility).toEqual([]);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error.message);process.exit(1);});
