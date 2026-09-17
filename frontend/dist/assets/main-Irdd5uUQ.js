/* empty css             */import{a as J,s as p}from"./Toast-DI90zGCk.js";const V={cart:"fashionhub-cart",orders:"fashionhub-orders",products:"fashionhub-products",subscriberEmail:"fashionhub-subscriber-email"};function te(){try{const e=localStorage.getItem(V.cart)||"[]",t=JSON.parse(e);return Array.isArray(t)?t:[]}catch{return[]}}function Ie(e){localStorage.setItem(V.cart,JSON.stringify(e))}function Ne(){try{const e=localStorage.getItem(V.products);if(!e)return null;const t=JSON.parse(e);if(Array.isArray(t)){const n={};return t.forEach(r=>{r&&r.id&&(n[r.id]=r)}),n}return t}catch{return null}}function Fe(e){try{localStorage.setItem(V.subscriberEmail,e)}catch{}}let f=[],M=[],ue=!1,I=!1,X=1;function Re(e){return{id:e.id,productId:e.product_id,name:e.name,price:Number(e.price),image:e.image,quantity:Number(e.quantity),variantId:e.variant_id??void 0,size:e.size??void 0,color:e.color??void 0}}function x(){M.forEach(e=>e(f))}function se(){Ie(f)}function De(){const e=f.reduce((t,n)=>Math.max(t,Number(n.id)||0),0);return X=Math.max(X,e+1),X++}function he(){return f}function Pe(e){return M.push(e),()=>{M=M.filter(t=>t!==e)}}async function O(){if(I){f=te(),x();return}try{ue=!0,x(),f=(await J.cart.get()).items.map(Re),I=!1,x()}catch(e){console.warn("Cart API unavailable, using local cart:",e),I=!0,f=te(),x()}finally{ue=!1,x()}}function fe(e){const t=f.find(n=>n.productId===e.id&&(n.variantId??void 0)===(e.variantId??void 0));t?t.quantity=Number(t.quantity)+1:f.push({id:De(),productId:e.id,name:e.name,price:Number(e.price),image:e.image,quantity:1,variantId:e.variantId,size:e.size,color:e.color}),se(),x()}async function ne(e){if(I){fe(e);return}try{await J.cart.add({productId:e.id,variantId:e.variantId,quantity:1}),await O()}catch(t){console.warn("Add to cart API failed, falling back to local cart:",t),I=!0,f=te(),fe(e)}}async function ye(e){if(I){f=f.filter(t=>t.id!==e),se(),x();return}try{await J.cart.remove(String(e)),await O()}catch(t){throw console.error("Failed to remove cart item:",t),t}}async function pe(e,t){const n=f.find(i=>i.id===e);if(!n)return;const r=Number(n.quantity)+t;if(r<=0){await ye(e);return}if(I){n.quantity=r,se(),x();return}try{await J.cart.update(String(e),r),await O()}catch(i){throw console.error("Failed to update cart quantity:",i),i}}function Be(){return f.reduce((e,t)=>e+Number(t.price)*Number(t.quantity),0)}function je(){return f.reduce((e,t)=>e+Number(t.quantity),0)}async function Me(){await O()}function D(e){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(e)}let o=null,m=null,z=null,re=null,ae=null,v=null,H=null;const He='a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';function Ue(){o=document.querySelector(".cart-panel"),m=document.querySelector(".cart-toggle"),z=document.querySelector(".close-cart"),re=document.querySelector(".cart-count"),ae=document.querySelector(".cart-total"),v=document.querySelector(".cart-items"),!(!o||!m)&&(m.addEventListener("click",We),z==null||z.addEventListener("click",U),document.addEventListener("keydown",e=>{e.key==="Escape"&&(o!=null&&o.classList.contains("open"))&&U()}),document.addEventListener("click",e=>{const t=e.target instanceof Element?e.target.closest(".cart-toggle"):null,n=e.target instanceof Element?e.target.closest(".cart-panel"):null;!t&&!n&&o&&U()}),document.querySelectorAll(".checkout-btn").forEach(e=>{e.addEventListener("click",()=>{window.location.href="checkout.html"})}),Pe(me),me())}function We(){o!=null&&o.classList.contains("open")?U():be()}function be(){o==null||o.classList.add("open"),m==null||m.setAttribute("aria-expanded","true"),o==null||o.setAttribute("aria-hidden","false"),z==null||z.focus(),Qe()}function U(){o==null||o.classList.remove("open"),m==null||m.setAttribute("aria-expanded","false"),o==null||o.setAttribute("aria-hidden","true"),m==null||m.focus(),Ge()}function me(){const e=he(),t=je(),n=Be();if(re&&(re.textContent=String(t)),ae&&(ae.textContent=D(n)),!!v){if(!e.length){v.innerHTML='<li class="empty-cart">Your cart is empty.</li>';return}v.innerHTML=e.map(r=>`
    <li class="cart-item" data-id="${r.id}">
      <img src="${r.image}" alt="${r.name}" />
      <div class="cart-item-content">
        <strong>${r.name}</strong>
        ${r.size||r.color?`<span>${[r.size,r.color].filter(Boolean).join(" / ")}</span>`:""}
        <span>${D(r.price)} each</span>
        <div class="cart-item-actions">
          <div class="qty-control" aria-label="Quantity controls for ${r.name}">
            <button class="qty-btn qty-decrease" type="button" data-id="${r.id}" aria-label="Decrease quantity for ${r.name}">−</button>
            <span class="qty-value">${r.quantity}</span>
            <button class="qty-btn qty-increase" type="button" data-id="${r.id}" aria-label="Increase quantity for ${r.name}">+</button>
          </div>
          <button class="remove-item" type="button" data-id="${r.id}" aria-label="Remove ${r.name}">Remove</button>
        </div>
      </div>
    </li>
  `).join(""),Ke()}}function Ke(){v==null||v.querySelectorAll(".qty-btn").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.id);he().find(r=>r.id===t)&&(e.classList.contains("qty-increase")?pe(t,1):e.classList.contains("qty-decrease")&&pe(t,-1))})}),v==null||v.querySelectorAll(".remove-item").forEach(e=>{e.addEventListener("click",()=>{const t=Number(e.dataset.id);ye(t)})})}function _e(e){const t=Array.from(e.querySelectorAll(He));if(!t.length)return()=>{};const n=t[0],r=t[t.length-1],i=a=>{a.key==="Tab"&&(a.shiftKey&&document.activeElement===n?(a.preventDefault(),r.focus()):!a.shiftKey&&document.activeElement===r&&(a.preventDefault(),n.focus()))};return e.addEventListener("keydown",i),()=>e.removeEventListener("keydown",i)}function Qe(){o&&(H=_e(o)||null)}function Ge(){typeof H=="function"&&H(),H=null}const Je={"linen-blend-blazer":{id:"linen-blend-blazer",name:"Linen Blend Blazer",price:89.99,oldPrice:129.99,image:"https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",description:"A tailored, lightweight essential designed to bring structure and softness to your everyday wardrobe.",features:["Premium linen blend texture","Relaxed tailored fit","Made for layering all season"],rating:"★★★★★",reviews:"(124 reviews)"},"ribbed-knit-top":{id:"ribbed-knit-top",name:"Ribbed Knit Top",price:25.99,oldPrice:49,image:"https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",description:"Soft-touch knitwear with a flattering silhouette that layers beautifully from work to weekend.",features:["Breathable cotton blend","Stretch comfort fit","Elevated everyday staple"],rating:"★★★★★",reviews:"(98 reviews)"},"wide-leg-trousers":{id:"wide-leg-trousers",name:"Wide Leg Trousers",price:59.99,oldPrice:85.99,image:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",description:"Crafted to create a fluid silhouette with a polished finish that moves effortlessly through the day.",features:["Soft drape fabric","Comfortable high-rise waist","Day-to-evening versatility"],rating:"★★★★★",reviews:"(181 reviews)"},"leather-shoulder-bag":{id:"leather-shoulder-bag",name:"Leather Shoulder Bag",price:79.99,oldPrice:110,image:"https://i.pinimg.com/1200x/d6/0a/0c/d60a0c218057be27adcdb52c72eaeb92.jpg",description:"A refined everyday companion with structured lines, room for essentials, and timeless appeal.",features:["Full-grain leather finish","Spacious interior","Adjustable strap comfort"],rating:"★★★★★",reviews:"(112 reviews)"},"minimalist-strappy-heels":{id:"minimalist-strappy-heels",name:"Minimalist Strappy Heels",price:49.99,oldPrice:79,image:"https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",description:"A sleek statement heel with a refined profile that elevates evening wear and special occasions alike.",features:["Comfort cushioned insole","Lightweight design","Elegant evening-ready finish"],rating:"★★★★★",reviews:"(164 reviews)"}};let Z=null;function ce(){return Z||(Z=Ne()||Je),Z}function Ve(e){const t=ce();return t[e]||t["linen-blend-blazer"]}const ve={query:"",categories:[],priceRange:[0,1e3],inStock:!1,sortBy:"name"};let N={...ve},W=[];function B(){return{...N}}function R(e){N={...N,...e},Ce()}function Oe(){N={...ve},Ce()}function we(e){return W.push(e),()=>{W=W.filter(t=>t!==e)}}function Ce(){const e=Se(ce(),N);W.forEach(t=>t(N,e))}function Se(e,t){let n=Object.values(e);if(t.query){const r=t.query.toLowerCase();n=n.filter(i=>i.name.toLowerCase().includes(r)||i.description.toLowerCase().includes(r)||i.features.some(a=>a.toLowerCase().includes(r)))}return t.categories.length>0&&(n=n.filter(r=>t.categories.some(i=>r.id.includes(i.toLowerCase())||r.name.toLowerCase().includes(i.toLowerCase())))),n=n.filter(r=>r.price>=t.priceRange[0]&&r.price<=t.priceRange[1]),t.inStock&&(n=n.filter(r=>r.price>0)),n.sort((r,i)=>{switch(t.sortBy){case"price-asc":return r.price-i.price;case"price-desc":return i.price-r.price;case"newest":return i.id.localeCompare(r.id);default:return r.name.localeCompare(i.name)}}),n}function qe(){return Se(ce(),N)}function Le(e){return`
    <article
      class="product-card"
      data-product-id="${e.id}"
      data-name="${e.name}"
      data-price="${e.price}"
      data-image="${e.image}"
    >

      <a
        class="product-image-link"
        href="product.html?id=${e.id}"
        aria-label="View ${e.name}"
      >
        <div class="product-image">
          <img
            src="${e.image}"
            alt="${e.name}"
            width="700"
            height="560"
            loading="lazy"
            decoding="async"
          />

          <span class="wishlist" role="button" tabindex="0">
            ♡
          </span>
        </div>
      </a>

      <div class="product-info">

        <a
          class="product-name-link"
          href="product.html?id=${e.id}"
        >
          <h3 class="product-name">${e.name}</h3>
        </a>

        <div class="price-line">
          <span class="price-text">
            ${D(e.price)}
          </span>

          ${e.oldPrice?`<span class="old-price">
                   ${D(e.oldPrice)}
                 </span>`:""}
        </div>

        <div class="product-rating">
          <span class="rating">
            ${e.rating||""}
          </span>

          <span class="reviews">
            ${e.reviews||""}
          </span>
        </div>

        <button
          class="add-to-cart"
          type="button"
          data-product-id="${e.id}"
        >
          Add to cart
        </button>

      </div>
    </article>
  `}let K=null;function Ee(e=".product-grid"){const t=document.querySelector(e);if(!t)return;K=t;const n=qe();t.innerHTML=n.map(Le).join(""),de(t)}let ge=!1;function $e(){ge||(document.addEventListener("click",Ye),ge=!0)}function de(e){$e(),e.querySelectorAll(".add-to-cart").forEach(t=>{t.dataset.bound!=="true"&&(t.dataset.bound="true",t.addEventListener("click",Ae))}),e.querySelectorAll(".wishlist").forEach(t=>{t.dataset.bound!=="true"&&(t.dataset.bound="true",t.addEventListener("click",ke))})}function Ye(e){const t=e.target;if(!t)return;const n=t.closest(".add-to-cart");if(n){if(n.dataset.bound==="true")return;Ae(e);return}const r=t.closest(".wishlist");r&&r.dataset.bound!=="true"&&ke(e)}function Xe(){$e(),document.querySelectorAll(".product-grid, .product-detail").forEach(e=>{de(e)})}async function Ae(e){e.preventDefault(),e.stopPropagation();const t=e.target,n=e.currentTarget instanceof HTMLButtonElement&&e.currentTarget.classList.contains("add-to-cart")?e.currentTarget:t==null?void 0:t.closest(".add-to-cart");if(!n)return;const r=n.closest(".product-card"),i=n.closest(".product-detail"),a=r||i;if(!a){console.error("Could not find product container");return}const T=a.dataset.productId||a.dataset.id,l=a.dataset.name,d=Number(a.dataset.price),A=a.dataset.image||"";if(!T){p("Product ID is missing");return}if(!l){p("Product name is missing");return}if(!Number.isFinite(d)||d<=0){p("Invalid product price");return}if(n.disabled)return;const g=n.textContent||"Add to cart";n.disabled=!0,n.textContent="Adding...";const h={id:String(T),name:l,price:d,image:A};try{await ne(h),p(`${l} added to cart`),ie(n),be()}catch(k){console.error("Add to cart failed:",k),n.disabled=!1,n.textContent=g,p("Could not add product to cart")}}function ke(e){e.preventDefault(),e.stopPropagation();const t=e.currentTarget;t.classList.toggle("active"),t.textContent=t.classList.contains("active")?"♥":"♡"}function ie(e){e&&(e.textContent="Added",e.disabled=!0,setTimeout(()=>{e.textContent="Add to cart",e.disabled=!1},1200))}we(()=>{if(!K)return;const e=qe();K.innerHTML=e.map(Le).join(""),de(K)});function Ze(e="#product-detail-root"){const t=document.querySelector(e);if(!t)return;const n=t,i=new URLSearchParams(window.location.search).get("id")||"linen-blend-blazer",a=Ve(i);if(!a){n.innerHTML=`
      <p>Product not found.</p>
    `;return}n.dataset.id=String(a.id),n.dataset.name=a.name,n.dataset.price=String(a.price),n.dataset.image=a.image,n.innerHTML=`
    <div class="product-detail-image">
      <img
        src="${a.image}"
        alt="${a.name}"
      />
    </div>

    <div class="product-detail-content">

      <p class="product-detail-breadcrumb">
        Fashion / New Arrivals
      </p>

      <h1>${a.name}</h1>

      <div class="product-detail-price">

        <strong>
          ${D(a.price)}
        </strong>

        ${a.oldPrice?`<span>
                 ${D(a.oldPrice)}
               </span>`:""}

      </div>

      <div class="product-detail-meta">
        <span>${a.rating||""}</span>
        <span>${a.reviews||""}</span>
      </div>

      <p class="product-detail-description">
        ${a.description}
      </p>

      <div class="product-detail-options">

        <fieldset class="option-group">
          <legend>Size</legend>
          <div
            class="size-options"
            id="size-options"
          ></div>
        </fieldset>

        <fieldset class="option-group">
          <legend>Color</legend>
          <div
            class="color-options"
            id="color-options"
          ></div>
        </fieldset>

      </div>

      <div class="product-detail-actions">

        <button
          class="add-to-cart"
          type="button"
          disabled
        >
          Loading...
        </button>

        <a
          class="secondary-btn"
          href="index.html"
        >
          Continue shopping
        </a>

      </div>

      <ul class="product-detail-list">
        ${a.features.map(l=>`<li>${l}</li>`).join("")}
      </ul>

    </div>
  `;const T=n.querySelector(".add-to-cart");fetch(`/api/products/${encodeURIComponent(i)}/variants`).then(async l=>{if(!l.ok)throw new Error(`Variant request failed: ${l.status}`);return l.json()}).then(l=>{const d=[...new Set(l.map(s=>s.size).filter(s=>!!s))],A=[...new Set(l.map(s=>s.color).filter(s=>!!s))],g=n.querySelector("#size-options"),h=n.querySelector("#color-options");let k=null,F=null,P=null;function Y(){g&&(g.innerHTML=d.map(c=>`
                    <button
                      type="button"
                      class="option-btn size-btn ${k===c?"selected":""}"
                      data-size="${c}"
                    >
                      ${c}
                    </button>
                  `).join("")),h&&(h.innerHTML=A.map(c=>`
                    <button
                      type="button"
                      class="option-btn color-btn ${F===c?"selected":""}"
                      data-color="${c}"
                    >
                      ${c}
                    </button>
                  `).join(""));const s=d.length>0,L=A.length>0;if((!s||!!k)&&(!L||!!F)){const c=l.find(j=>{const Te=!s||j.size===k,ze=!L||j.color===F;return Te&&ze});P=(c==null?void 0:c.id)??null}else P=null;const b=n.querySelector(".add-to-cart");b&&(!s&&!L||P!==null?(b.disabled=!1,b.textContent="Add to cart"):(b.disabled=!0,b.textContent="Select options first"))}g==null||g.addEventListener("click",s=>{const y=s.target.closest(".size-btn");y&&(k=y.dataset.size||null,Y())}),h==null||h.addEventListener("click",s=>{const y=s.target.closest(".color-btn");y&&(F=y.dataset.color||null,Y())}),Y(),T==null||T.addEventListener("click",async()=>{const s=n.dataset.id,L=n.dataset.name,y=Number(n.dataset.price),le=n.dataset.image||"";if(!s||!L||!Number.isFinite(y)||y<=0){p("Invalid product information");return}if((d.length>0||A.length>0)&&P===null){p("Please select your options");return}const b={id:String(s),name:L,price:y,image:le,variantId:P??void 0},c=T;if(c){c.disabled=!0,c.textContent="Adding...";try{console.log("Adding detail product:",b),await ne(b),p(`${L} added to cart`),ie(c)}catch(j){console.error("Failed to add detail product:",j),c.disabled=!1,c.textContent="Add to cart",p("Could not add product to cart")}}})}).catch(l=>{console.error("Failed to load variants:",l);const d=n.querySelector(".add-to-cart");d&&(d.disabled=!1,d.textContent="Add to cart",d.addEventListener("click",async()=>{const A=n.dataset.id,g=n.dataset.name,h=Number(n.dataset.price),k=n.dataset.image||"";if(!A||!g||!Number.isFinite(h)||h<=0){p("Invalid product information");return}d.disabled=!0,d.textContent="Adding...";try{await ne({id:String(A),name:g,price:h,image:k}),p(`${g} added to cart`),ie(d)}catch(F){console.error("Add to cart failed:",F),d.disabled=!1,d.textContent="Add to cart",p("Could not add product to cart")}}))})}let w=null,S=null,E=null,$=null,C=null,_=null,oe=null,Q=null,q=null,G=null,u=null;const et=["Women","Men","Dresses","Tops","Shoes","Bags","Accessories"];function tt(){if(w=document.querySelector("#search-input"),S=document.querySelector("#category-filters"),E=document.querySelector("#price-min"),$=document.querySelector("#price-max"),C=document.querySelector("#sort-by"),_=document.querySelector("#clear-filters"),oe=document.querySelector("#results-count"),Q=document.querySelector("#filters-toggle"),q=document.querySelector("#filters-panel"),G=document.querySelector("#close-filters"),u=document.querySelector("#filters-overlay"),!w&&!S&&!C)return;u||(u=document.createElement("div"),u.id="filters-overlay",u.className="filters-overlay",document.body.appendChild(u));const t=new URLSearchParams(window.location.search).get("q");t&&R({query:t}),nt(),rt(),we(it),xe(B())}function nt(){S&&(S.innerHTML=`
    <legend>Categories</legend>
    ${et.map(e=>`
      <label class="filter-option">
        <input type="checkbox" value="${e}" />
        <span>${e}</span>
      </label>
    `).join("")}
  `)}function rt(){w==null||w.addEventListener("input",st(()=>{R({query:(w==null?void 0:w.value)||""})},300)),S==null||S.addEventListener("change",e=>{const t=e.target;if(t.type==="checkbox"){const n=B(),r=t.checked?[...n.categories,t.value]:n.categories.filter(i=>i!==t.value);R({categories:r})}}),E==null||E.addEventListener("change",()=>{R({priceRange:[Number((E==null?void 0:E.value)||0),B().priceRange[1]]})}),$==null||$.addEventListener("change",()=>{R({priceRange:[B().priceRange[0],Number(($==null?void 0:$.value)||1e3)]})}),C==null||C.addEventListener("change",()=>{R({sortBy:C==null?void 0:C.value})}),_==null||_.addEventListener("click",()=>{Oe(),xe(B())}),Q==null||Q.addEventListener("click",at),G==null||G.addEventListener("click",ee),u==null||u.addEventListener("click",ee),document.addEventListener("keydown",e=>{e.key==="Escape"&&(q!=null&&q.classList.contains("active"))&&ee()})}function at(){q==null||q.classList.add("active"),u==null||u.classList.add("active"),document.body.style.overflow="hidden"}function ee(){q==null||q.classList.remove("active"),u==null||u.classList.remove("active"),document.body.style.overflow=""}function it(e,t){ot(t.length),Ee(".product-grid")}function xe(e){w&&(w.value=e.query),E&&(E.value=String(e.priceRange[0])),$&&($.value=String(e.priceRange[1])),C&&(C.value=e.sortBy),S==null||S.querySelectorAll('input[type="checkbox"]').forEach(t=>{t.checked=e.categories.includes(t.value)})}function ot(e){oe&&(oe.textContent=`${e} product${e!==1?"s":""} found`)}function st(e,t){let n;return(...r)=>{clearTimeout(n),n=setTimeout(()=>e(...r),t)}}function ct(){document.querySelectorAll(".wishlist").forEach(e=>{e.addEventListener("click",()=>{e.classList.toggle("active"),e.textContent=e.classList.contains("active")?"♥":"♡"})})}function dt(){document.querySelectorAll(".subscribe-form, .footer-email").forEach(t=>{t.addEventListener("submit",n=>{n.preventDefault();const r=t.querySelector("input");if(!r)return;const i=r.value.trim();if(!i){r.focus();return}Fe(i),r.value="",r.placeholder="Thanks for subscribing!"})})}function lt(){document.querySelectorAll("img").forEach(e=>{e.hasAttribute("loading")||e.setAttribute("loading","lazy"),e.hasAttribute("decoding")||e.setAttribute("decoding","async")})}document.addEventListener("DOMContentLoaded",async()=>{lt(),await Me(),Ue(),ct(),dt(),tt(),Xe(),"serviceWorker"in navigator&&navigator.serviceWorker.register("/service-worker.js").catch(e=>{console.warn("Service worker registration failed:",e)}),document.querySelector(".product-grid")&&Ee(),document.querySelector("#product-detail-root")&&Ze()});
