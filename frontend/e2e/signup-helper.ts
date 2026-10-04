import {expect,Page} from '@playwright/test';
// Real controls stay enabled. Retry only a confirmed HTTP 429 after its cooldown.
async function submitAuth(page:Page, endpoint:string, button:string) {
 for(let attempt=0;attempt<2;attempt++){
  const pending=page.waitForResponse(r=>r.url().endsWith(endpoint)&&r.request().method()==='POST');
  await page.getByRole('button',{name:button,exact:true}).click();const response=await pending;
  if(response.status()!==429){expect(response.ok()).toBeTruthy();return;}
  await expect(page.getByRole('alert').filter({hasText:'Too many attempts'})).toBeVisible();
  if(attempt===1)throw Error('Authentication remained throttled after its advertised cooldown.');
  const seconds=Number(response.headers()['retry-after']??60);
  if(!Number.isFinite(seconds)||seconds<=0||seconds>60)throw Error('Unexpected authentication cooldown.');
  await page.waitForTimeout(seconds*1000+250);
 }
}
export const submitSignup = (page:Page) => submitAuth(page,'/api/auth/signup','Create workspace');
export const submitLocalSignin = (page:Page) => submitAuth(page,'/api/auth/login','Sign in to workspace');
