const DATA = window.LAMSET_MENU_DATA;
let lang='ar', active=null;
let cart=[];
const $=id=>document.getElementById(id);
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function normalizeSearch(v){return String(v||'').trim().toLowerCase().replace(/[\u0640\s]+/g,' ')}
function renderHome(filter='') {
  const q=normalizeSearch(filter);
  const catMatches=DATA.filter(c=>!q || normalizeSearch(c.ar+' '+c.en).includes(q));
  const itemMatches=[];
  if(q){
    DATA.forEach(c=>c.items.forEach((x,i)=>{
      if(normalizeSearch(x.ar).includes(q)) itemMatches.push({cat:c,item:x,index:i});
    }));
  }

  const refTileMap=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19];

  $('categories').innerHTML=catMatches.map(c=>{
    const catIndex=DATA.indexOf(c);
    const tile = c.ar === 'عروض لمسة الروح' ? 3 : (refTileMap[catIndex > 4 ? catIndex - 1 : catIndex] ?? catIndex);
    const row=Math.floor(tile/4);
    const col=tile%4;
    return `
    <button class="cat" data-cat="${esc(c.ar)}">
      <span class="cat-arrow" aria-hidden="true">‹</span>
      <span class="cat-photo" style="--ref-col:${col};--ref-row:${row}"></span>
      <div class="caption"><div class="ar">${esc(lang==='ar'?c.ar:c.en)}</div><div class="en">${esc(lang==='ar'?c.en:c.ar)}</div></div>
    </button>`;
  }).join('');

  document.querySelectorAll('[data-cat]').forEach(b=>{
    b.onclick=()=>openCat(b.dataset.cat);
    if((b.dataset.cat||'')==='حلا بارد') b.classList.add('featured-cat');
  });

  const resultsBox=$('searchResults');
  const resultList=$('searchResultList');
  const empty=$('searchEmpty');
  if(q){
    resultsBox.classList.add('show');
    resultList.innerHTML=itemMatches.map(r=>`
      <button class="search-result" type="button" data-search-cat="${esc(r.cat.ar)}">
        <div class="search-result-copy">
          <div class="search-result-name">${esc(r.item.ar)}</div>
          <div class="search-result-cat">${esc(r.cat.ar)}</div>
        </div>
        <div class="search-result-price">${esc(r.item.price)} د.ع</div>
      </button>`).join('');
    empty.classList.toggle('show', itemMatches.length===0);
    document.querySelectorAll('[data-search-cat]').forEach(b=>b.onclick=()=>openCat(b.dataset.searchCat));
  }else{
    resultsBox.classList.remove('show');
    resultList.innerHTML='';
    empty.classList.remove('show');
  }
}
function renderSectionItems(filter=''){
  if(!active)return;
  const q=normalizeSearch(filter);
  const items=active.items.map((x,i)=>({x,i})).filter(r=>!q||normalizeSearch(r.x.ar).includes(q));
  $('items').innerHTML=items.map(r=>`<div class="item"><div class="item-main"><button class="add-to-cart" type="button" data-add="${r.i}" aria-label="إضافة إلى السلة">+</button><div class="item-copy"><div class="name">${esc(r.x.ar)}</div>${r.x.desc?`<div class="desc">${esc(r.x.desc)}</div>`:'' }<div class="price">${r.x.price} د.ع</div></div></div></div>`).join('');
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addToCart(active,Number(b.dataset.add)));
  $('empty').style.display=items.length?'none':'block';
  $('empty').textContent=q?(lang==='ar'?'ماكو صنف مطابق للبحث.':'No matching item found.'):(lang==='ar'?'لا توجد أصناف مضافة لهذا القسم حالياً.':'No items have been added to this section yet.');
}
function openCat(name) {
  active=DATA.find(c=>c.ar===name);
  if(!active)return;
  $('home').style.display='none';
  $('page').classList.add('show');
  $('search').value='';
  $('sectionSearchInput').value='';
  $('sectionImageImg').src=active.img;
  $('sectionImageImg').alt=active.ar;
  $('sectionTitle').textContent=lang==='ar'?active.ar:active.en;
  $('sectionText').textContent=lang==='ar'?`اختيارات مميزة من ${active.ar} في منيو لمسة الروح.`:`Featured ${active.en} selections from Lamset Alroh.`;
  renderSectionItems('');
  window.scrollTo(0,0);
}
function addToCart(section,index){
  const item=section.items[index];
  if(!item)return;
  const key=section.ar+'|'+item.ar;
  const found=cart.find(x=>x.key===key);
  if(found) found.qty+=1;
  else cart.push({key,section:section.ar,name:item.ar,price:Number(String(item.price).replace(/,/g,'')),qty:1});
  updateCartUI();
}
function updateCartUI(){
  const count=cart.reduce((sum,x)=>sum+x.qty,0);
  const total=cart.reduce((sum,x)=>sum+x.price*x.qty,0);
  $('cartSummary').textContent=`${count} أصناف • ${total.toLocaleString('en-US')} د.ع`;
  $('cartTotal').textContent=`${total.toLocaleString('en-US')} د.ع`;
  $('cartRows').innerHTML=cart.length?cart.map(x=>`<div class="cart-row"><div><div style="font-weight:800">${esc(x.name)}</div><div class="qty">${x.qty} × ${x.price.toLocaleString('en-US')} د.ع</div></div><div style="font-weight:900;color:var(--gold2)">${(x.price*x.qty).toLocaleString('en-US')} د.ع</div></div>`).join(''):`<div class="empty" style="margin-top:0">السلة فارغة حالياً.</div>`;
}
function openCart(){ $('cartModal').classList.add('show'); $('cartModal').setAttribute('aria-hidden','false'); updateCartUI(); }
function closeCart(){ $('cartModal').classList.remove('show'); $('cartModal').setAttribute('aria-hidden','true'); }
function sendOrder(e){
  e.preventDefault();
  if(!cart.length){alert('السلة فارغة، أضف الأصناف أولاً.');return;}
  const name=$('customerName').value.trim();
  const phone=$('customerPhone').value.trim();
  const address=$('customerAddress').value.trim();
  const notes=$('customerNotes').value.trim();
  if(!name||!phone||!address){alert('يرجى إكمال الاسم ورقم الهاتف والعنوان.');return;}
  const total=cart.reduce((sum,x)=>sum+x.price*x.qty,0);
  const lines=cart.map((x,i)=>`${i+1}) ${x.name} — الكمية: ${x.qty} × ${x.price.toLocaleString('en-US')} د.ع = ${(x.price*x.qty).toLocaleString('en-US')} د.ع`);
  const message=[
    '🍽️ *طلب جديد — مطعم وكافيه لمسة الروح*',
    '',
    '👤 الاسم: '+name,
    '📞 هاتف الزبون: '+phone,
    '📍 العنوان: '+address,
    '',
    '🧾 *تفاصيل الطلب*',
    ...lines,
    '',
    '💰 *مجموع الأصناف: '+total.toLocaleString('en-US')+' د.ع*',
    '🛵 أجور التوصيل: تُحدد حسب المنطقة بالتنسيق مع المطعم',
    '📦 المجموع النهائي قبل التوصيل: '+total.toLocaleString('en-US')+' د.ع',
    notes ? '📝 ملاحظات: '+notes : ''
  ].filter(Boolean).join('\n');
  const url='https://wa.me/9647765570707?text='+encodeURIComponent(message);
  window.open(url,'_blank','noopener,noreferrer');
}
$('checkoutForm').addEventListener('submit',sendOrder);
$('viewCart').onclick=openCart; $('cartClose').onclick=closeCart; $('cartModal').onclick=e=>{if(e.target.id==='cartModal')closeCart();};
function backHome(){active=null;$('page').classList.remove('show');$('home').style.display='block';$('search').value='';renderHome('');window.scrollTo(0,0)}
$('backBtn').onclick=backHome;
$('sectionSearchInput').oninput=e=>renderSectionItems(e.target.value);
$('sectionLangBtn').onclick=()=>{lang=lang==='ar'?'en':'ar';document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';$('sectionLangBtn').textContent=lang==='ar'?'EN / العربية':'العربية / EN';if(active)openCat(active.ar);else renderHome($('search').value)};
$('search').oninput=e=>{if(!active)renderHome(e.target.value)};
if($('langBtn'))$('langBtn').onclick=()=>{lang=lang==='ar'?'en':'ar';document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';$('langBtn').textContent=lang==='ar'?'English':'العربية';$('choose').textContent=lang==='ar'?'اختر القسم الذي تريده':'Choose Your Section';$('chooseEn').textContent=lang==='ar'?'Choose Your Section':'اختر القسم الذي تريده';$('footer').textContent=lang==='ar'?'أكثر من مجرد وجبة .. إنها لمسة روح':'More than a meal .. it is a touch of soul'; if(active)openCat(active.ar); else renderHome($('search').value)};
renderHome();

