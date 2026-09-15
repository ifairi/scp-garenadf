/* Translate visible labels only. Original data keys and original jQuery text reads
   are preserved because DF uses Chinese names to identify regions and events. */
(function () {
  'use strict';
  const words = {
    '零号大坝':'Zero Dam','长弓溪谷':'Layali Grove','航天基地':'Space City','巴克什':'Brakkesh','潮汐监狱':'Tide Prison',
    '攀升':'Ascension','临界点':'Threshold','贯穿':'Cracked','烬区':'Shafted','堑壕战':'Trench Lines','刀锋':'Knife Edge','断轨':'Trainwreck','风暴眼':'Cyclone','金字塔':'Monument','断层':'Fault','余震':'Aftershock','乌姆斯运河':'Akh Canal','克劳狄斗兽场':'Colosseum','摩格旧城区':'Mog Old Town',
    '攻方视角':'Attacker POV','守方视角':'Defender POV','攻防模式':'Attack & Defend','占领模式':'King of the Hill','手游':'Mobile','移动':'Mobile',
    '搜索':'Search','全部':'All','全选':'Select all','重置':'Reset','常规':'Normal','机密':'Confidential','绝密':'Top Secret','永夜':'Night',
    '区域区域':'Sector ','区域':'Sector ','据点':'Objective ','附属据点':'Sub-objective','基地部署点':'Base deployment','进攻方基地':'Attacker base','防守方基地':'Defender base',
    '载具补给站':'Vehicle resupply','载具':'Vehicles','固定弹药箱':'Ammo cache','固定武器':'Stationary weapons','固定防空炮':'Anti-aircraft gun','固定机枪':'Mounted machine gun','岸防炮':'Coastal cannon','装置':'Equipment','滑索':'Zipline','电梯':'Elevator',
    'FSV轮式突击炮':'FSV wheeled assault gun','轮式突击炮':'Wheeled assault gun','ATV全地形车':'ATV','LSV两栖全地形车':'LSV amphibious ATV','GTQ-35轻型坦克':'GTQ-35 light tank','M1A4主战坦克':'M1A4 battle tank','LAV AA防空车':'LAV AA','LAV_AD防空车':'LAV-AD','LAV G1步战车':'LAV G1 IFV','F-45A战斗机':'F-45A fighter',
    '轻型战术车':'Light tactical vehicle','突击车':'Assault vehicle','冲锋舟':'Assault boat','摩托艇':'Jet ski','轻型坦克':'Light tank','两栖全地形车':'Amphibious ATV','两栖装甲运输车':'Amphibious APC','两栖装甲车':'Amphibious armor','突击直升机':'Attack helicopter','武装直升机':'Attack helicopter','侦察直升机':'Scout helicopter','侦查直升机':'Scout helicopter','鱼鹰直升机':'Osprey','密集阵':'CIWS',
    '地图快速定位':'Quick location','查看地图分层':'Map floors','大地图模式':'Full map','返回大地图':'Return to map','点击切换楼层':'Switch floor','请选择楼层':'Choose floor','正在查看':'Viewing ','您正在查看':'Viewing ','层':' floor',
    '开启地图随机事件':'Map events','暂无特殊事件':'No event','不开启特殊事件':'No event','坠机事件':'Aircraft crash','森林山火':'Forest fire','断桥事件':'Bridge collapse',
    '物资点':'Supplies','出生点':'Spawn points','撤离点':'Extraction','首领':'Bosses','鱼类':'Fish','藏匿物':'Stashes','房卡房间':'Keycard rooms',
    '保险箱':'Safe','大保险箱':'Large safe','小保险箱':'Small safe','服务器':'Server','电脑机箱':'Computer case','电脑包':'Laptop bag','电脑':'Computer','武器箱':'Weapon crate','大武器箱':'Large weapon crate','军用医疗包':'Medical kit','医疗物资堆':'Medical supplies','医疗实验区':'Medical lab','工具柜':'Tool cabinet','工具盒':'Toolbox','航空储物箱':'Aviation crate','工业金属储物箱':'Industrial crate','高级储物箱':'Advanced storage','储物柜':'Locker','个人储物柜':'Personal locker','低级个人储物柜':'Basic locker','抽屉柜':'Drawer cabinet','垃圾桶':'Bin','鸟窝':'Bird nest','药品保温箱':'Medicine cooler','旅行包':'Travel bag','手提箱':'Suitcase','高级旅行箱':'Premium suitcase','高级行李箱':'Premium luggage','登山包':'Hiking bag','弹药箱':'Ammo box','快递箱':'Parcel','收纳盒':'Storage box','野外物资箱':'Field supplies','一件衣服':'Clothing','屏蔽箱':'Shielded crate','金币堆':'Gold coins','藏宝图':'Treasure map','密钥':'Key','密码房':'Code room','防护服':'Protective suit','核燃料背包':'Nuclear fuel pack','骇客电脑':'Hacker laptop','马桶':'Toilet','废料桶':'Waste barrel','辐射废料箱':'Radioactive waste','放射性储物箱':'Radioactive crate',
    '行政辖区':'Administrative district','行政区':'Administration','主变电站':'Main substation','水泥厂':'Cement plant','军营':'Barracks','游客中心':'Visitor center','大坝河滩':'Dam riverbank','停车场':'Parking','小型庄园':'Small estate','检查站':'Checkpoint','阿米亚小镇':'Amiya village','蓝港码头':'Blue port','钻石皇后酒店':'Diamond Queen Hotel','哈夫克雷达站':'Havoc radar station','哈夫克返回舱':'Havoc return capsule','坠机之地':'Crash site','荒废村庄':'Abandoned village','阿萨拉营地':'Ahsarah camp','沙径牧场':'Ranch','储藏站码头':'Storage dock','储藏站':'Storage station','皇家博物馆':'Royal museum','老科学院':'Old institute','巴克什大浴场':'Brakkesh baths','巴克什集市':'Brakkesh bazaar','阿坦亚遗址':'Atanya ruins','蓝汀旅馆':'Hotel','发射区':'Launch area','总裁室':'Director office','中心花园':'Central garden','工业区':'Industrial area','宿舍区':'Dormitories','中控区':'Central control','中控桥':'Control bridge','浮力室':'Buoyancy chamber','水平试车场':'Test facility','蓝室':'Blue room','黑室':'Black room','变电站':'Substation','施工区':'Construction','卸货区':'Unloading area','罐装区':'Filling area','管道区域':'Pipeline area','牢房':'Cells','禁闭区':'Solitary confinement','囚犯活动区':'Prison yard',
    '东侧上层入口':'East upper entrance','西侧上层入口':'West upper entrance','东瞭望台区':'East watchtower','西瞭望台区':'West watchtower','地下通道钥匙':'Tunnel key','地下通道':'Underground passage','电梯井':'Elevator shaft','中心贵宾室':'Central VIP room','潮汐控制室':'Tidal control room','西楼医务室':'West infirmary','西楼监控室':'West surveillance','西楼调控房':'West control room','东楼经理室':'East manager office','设备领用室':'Equipment room','售票办公室':'Ticket office','应急仓':'Emergency depot','运输仓库':'Transport warehouse','小火车站':'Railway station',
    '常规撤离点':'Standard extraction','条件撤离点':'Conditional extraction','概率撤离点':'Random extraction','延迟撤离点':'Delayed extraction','付费撤离点':'Paid extraction','丢包撤离点':'Drop-bag extraction','拉闸撤离点':'Switch extraction','列车撤离点':'Train extraction','电梯撤离点':'Elevator extraction','行动撤离点':'Mission extraction','行动接取站':'Mission station','高价值接取站':'High-value mission',
    '可部署':'Available','冷却时间':'Cooldown','刷新时间':'Respawn','进攻方':'Attackers','防守方':'Defenders','更新日志':'Update log','成功复制到剪切板':'Copied','功能开发中，敬请期待':'Feature in development','暂无数据':'No data','暂无':'Unavailable','返回':'Back','关闭':'Close','备注':'Notes','描述':'Description'
  };
  const ordered = Object.keys(words).sort((a,b) => b.length-a.length);
  const matcher = new RegExp(ordered.map(key => key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  function translate(text) { return text.replace(matcher, key => words[key]); }
  window.SCPMapEnglish = translate;
  const originals = new WeakMap();
  const jqText = $.fn.text;
  function originalText(node) {
    if (node.nodeType === 3) { const item=originals.get(node); return item && node.data===item.en ? item.cn : node.data; }
    return Array.from(node.childNodes).map(originalText).join('');
  }
  $.fn.text = function (...args) { return args.length ? jqText.apply(this,args) : Array.from(this).map(originalText).join(''); };
  const oldMatch = window.fuzzyMatch;
  if (oldMatch) window.fuzzyMatch = (text, query) => /[\u3400-\u9fff]/.test(query) ? oldMatch(text,query) : translate(text).toLowerCase().includes(query.toLowerCase());
  function walk(root) {
    if (root.nodeType === 1 && root.closest('script,style,textarea,#scp-tools,#scp-note')) return;
    const nodes = root.nodeType === 3 ? [root] : [];
    if (root.nodeType !== 3) {
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('script,style,textarea,#scp-tools,#scp-note')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
      while (walker.nextNode()) nodes.push(walker.currentNode);
    }
    for (const node of nodes) {
      if (!/[\u3400-\u9fff]/.test(node.data)) continue;
      const cn=node.data,en=translate(cn);
      if(cn!==en){originals.set(node,{cn,en});node.data=en;}
    }
  }
  walk(document.body);
  new MutationObserver(records => { for(const r of records) { if(r.type==='characterData')walk(r.target);else for(const node of r.addedNodes)walk(node); } }).observe(document.body,{subtree:true,childList:true,characterData:true});
  document.querySelector('.select-iput').placeholder='Search markers';
  document.querySelector('.select-iput').setAttribute('aria-label','Search map markers');
  document.querySelector('.nav-title').textContent='SCP / DELTA FORCE MAP';
  document.querySelector('.map-change-text').textContent='Operations';
  document.querySelector('.war-change-text').textContent='Warfare';
  document.querySelector('.btn-change-map').textContent='Maps';
  document.querySelector('.reset-choose').textContent='Reset filters';
})();
