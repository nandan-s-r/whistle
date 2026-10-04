const {chromium,expect}=require('../frontend/node_modules/@playwright/test');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({baseURL:'http://127.0.0.1:3000',viewport:{width:1440,height:960},reducedMotion:'reduce'});
 const errors=[],violations=[],overflow=[];let checks=0;
 const out=path.resolve(__dirname,'../docs/screenshots');fs.mkdirSync(out,{recursive:true});
 page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const mode of ['light','dark'])for(const width of [1440,390]){
   await page.setViewportSize({width,height:960});
   for(const route of ['/about','/privacy','/cookies','/terms','/contact']){
    const response=await page.goto(route);expect(response.status()).toBe(200);
    await expect(page).toHaveTitle('Whistle');
    const toggle=page.getByRole('switch',{name:'Dark mode',exact:true});if(await toggle.getAttribute('aria-checked')!==String(mode==='dark'))await toggle.click();
    await expect(page.getByRole('main')).toBeVisible();await expect(page.getByRole('heading',{level:1})).toHaveCount(1);
    await expect(page.locator('header .scope-brand')).toHaveAccessibleName('Whistle home');
    await expect(page.locator('header .brand-wordmark')).toContainText('Whistle');
    await expect(page.locator('body')).not.toContainText(/VC Scope|VC SCOPE/);
    await expect(page.getByRole('navigation',{name:'Product information'}).getByRole('link')).toHaveCount(5);
    await expect(page.getByRole('main')).not.toContainText(/support@vcscope\.os|tier-1|live meeting analysis|vendor agreements that/);
    await page.addScriptTag({path:path.resolve(__dirname,'../frontend/node_modules/axe-core/axe.min.js')});
    const issues=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
    checks++;if(issues.length)violations.push({route,mode,width,issues});
    const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);if(scroll>width)overflow.push({route,mode,width,scroll});
   }
   await page.goto('/login');await expect(page.getByRole('heading',{name:'Sign in.',exact:true})).toBeVisible();await expect(page).toHaveTitle('Whistle');await expect(page.getByRole('link',{name:'Whistle sign in',exact:true})).toBeVisible();
   await page.screenshot({path:path.join(out,`brand-login-${mode}-${width}.png`)});
   await page.goto('/about');await page.screenshot({path:path.join(out,`brand-about-${mode}-${width}.png`)});
   console.log(`${mode} ${width}: checked five public pages`);
  }
  for(const asset of ['/icon.svg','/apple-icon.png','/favicon.ico']){
   const response=await page.request.get(asset);expect(response.status()).toBe(200);expect((await response.body()).length).toBeGreaterThan(100);
  }
  fs.writeFileSync(path.resolve(__dirname,'../scratch/public-accessibility.json'),JSON.stringify({checks,violations,overflow,errors},null,2));
  expect(violations).toEqual([]);expect(overflow).toEqual([]);expect(errors).toEqual([]);console.log(JSON.stringify({checks,violations,overflow,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
