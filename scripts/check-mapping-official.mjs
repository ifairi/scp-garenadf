import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile('mapping/index.html','utf8');
const mapIds=[...html.matchAll(/data-map="([^"]+)"/g)].map(match=>match[1]);
assert.equal(mapIds.length,14,'Keep all 14 published Warfare maps in the DF snapshot');
assert(!/ping_tcss|eas\.js|share-min\.js|self\.location/.test(html),'Do not include Tencent tracking or the original mobile redirect');
const ctx=vm.createContext({console:{log(){}}});ctx.window=ctx;
const sources=JSON.parse(await readFile('mapping/vendor/sources.json','utf8'));
for(const entry of sources){
  assert(entry.url.startsWith('https://game.gtimg.cn/images/dfm/cp/a20240729directory/'));
  const code=await readFile('mapping/vendor/'+entry.path,'utf8');
  if(/(?:map_.+|.+_floor)\.js$/.test(entry.path))vm.runInContext(code,ctx,{timeout:3000});
}
let sectors=0;
for(const id of mapIds){
  const info=ctx[id]?.info;
  assert(info&&Number.isInteger(info.sector)&&info.sector>0,`${id}: missing sector definitions`);
  sectors+=info.sector;
  for(const platform of ['pc','mobile']){
    assert(info['name_'+platform]&&info['names_'+platform],`${id}: missing native imagery`);
    for(const mode of ['', '_s']){
      const data=ctx[id+'_'+platform+mode];
      assert(data?.mapArticle&&data.navRegion&&data.navRegionInfo,`${id}/${platform}${mode}: missing native marker filters`);
    }
  }
}
const translations=await readFile('mapping/official-english.js','utf8');
const start=translations.indexOf('  const words = '),end=translations.indexOf('  window.SCPMapEnglish = translate;');
assert(start>=0&&end>start);
const language=vm.createContext({});
vm.runInContext(translations.slice(start,end)+';globalThis.translate=translate',language);
assert.equal(language.translate('载具补给站'),'Vehicle resupply');
assert.equal(language.translate('进攻方基地'),'Attacker base');
assert.equal(language.translate('临界点 ( 手游 | 攻防模式 )'),'Threshold ( Mobile | Attack & Defend )');
assert.equal(language.translate('区域B'),'Sector B');
console.log(`Passed: original DF engine, ${mapIds.length} Warfare maps / ${sectors} sectors, PC/Mobile modes and English tactical labels.`);
