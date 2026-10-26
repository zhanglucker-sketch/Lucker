const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4173');await page.waitForTimeout(1200);
 await page.screenshot({path:'preview-desktop.png'});
 for(const mode of ['fluid','nebula','orbit']){await page.locator(`[data-mode="${mode}"]`).click();await page.waitForTimeout(1500);assert.equal(await page.locator(`[data-mode="${mode}"]`).getAttribute('aria-pressed'),'true');if(mode!=='orbit')await page.screenshot({path:`preview-${mode}.png`});}
 await page.locator('#ttsBtn').click();
 await page.route('https://1255468956-lz8he75wor.ap-guangzhou.tencentscf.com',async route=>{
   const body=route.request().postDataJSON();assert.equal(body.model,'doubao-seed-2-0-mini-260428');assert.equal(body.messages.at(-1).content,'你好，雷曼');
   await route.fulfill({json:{choices:[{message:{content:'我在，今天想怎样度过呢？'}}]}});
 });
 await page.locator('#input').fill('你好，雷曼');await page.locator('#sendBtn').click();
 await page.waitForFunction(()=>document.querySelector('#aiText').textContent==='我在，今天想怎样度过呢？');
 await page.locator('#newChatBtn').click();assert.equal(await page.locator('#aiText').textContent(),'一声呼唤，家的回应。');
 await page.unrouteAll();await page.route('https://1255468956-lz8he75wor.ap-guangzhou.tencentscf.com',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.locator('#input').fill('失败提示验证');await page.locator('#sendBtn').click();await page.waitForFunction(()=>document.querySelector('#aiText').textContent==='连接暂时没有回应，再试一次好吗？');
 await page.waitForFunction(()=>!document.querySelector('#sendBtn').disabled);
 await page.locator('#newChatBtn').click();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:'preview-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal overflow');
 assert.deepEqual(errors,[]);console.log('PASS: three modes, request payload, reply, reset, HTTP failure recovery, mobile overflow, no browser errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
