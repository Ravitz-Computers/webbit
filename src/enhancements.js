/** Webbit's trusted, dependency-free enhancement runtime. Never evaluates project scripts. */
export function mountWebbit(doc) {
  const win = doc.defaultView;
  if (!win) return () => {};
  const cleanups = [], frames = new Set();
  const listen = (target, name, fn) => { target.addEventListener(name, fn); cleanups.push(() => target.removeEventListener(name, fn)); };
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = win.matchMedia('(pointer: fine)');
  doc.querySelectorAll('[data-wb-component]').forEach(root => {
    const kind = root.getAttribute('data-wb-component');
    const own = selector => Array.from(root.querySelectorAll(selector)).filter(el => el.closest('[data-wb-component]') === root);
    if (kind === 'google-reviews') {
      const button=root.querySelector('[data-wb-load-reviews]'),status=root.querySelector('[data-wb-review-status]'),output=root.querySelector('[data-wb-reviews]');
      if(button&&status&&output) listen(button,'click',async()=>{
        if(doc.URL==='about:srcdoc'){status.textContent='Live reviews need the exported PHP endpoint and server API setup. See private/GOOGLE-REVIEWS-SETUP.md.';return;}
        button.disabled=true;status.textContent='Loading Google reviews…';
        try {
          const endpoint=new URL(root.getAttribute('data-wb-endpoint')||'',doc.baseURI);if(endpoint.origin!==win.location.origin)throw new Error('Review endpoint must be on this site.');
          const response=await win.fetch(endpoint,{credentials:'omit',cache:'no-store'});if(!response.ok)throw new Error('Reviews unavailable. Check server setup or try again later.');const data=await response.json();output.replaceChildren();
          const link=(label,url)=>{const a=doc.createElement('a');try{const parsed=new URL(url);if(parsed.protocol!=='https:')return doc.createTextNode(label);a.href=parsed.href;}catch{return doc.createTextNode(label);}a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';return a;};
          status.textContent=data.name+(typeof data.rating==='number'?' · '+data.rating+' / 5':'')+(typeof data.count==='number'?' · '+data.count+' reviews':'');
          for(const review of (Array.isArray(data.reviews)?data.reviews:[]).slice(0,5)){
            const card=doc.createElement('article'),author=review.authorAttribution||{},name=doc.createElement('p'),text=doc.createElement('p');name.append(link(author.displayName||'Google reviewer',author.uri));
            if(author.photoUri){try{const photo=new URL(author.photoUri);if(photo.protocol==='https:'){const img=doc.createElement('img');img.src=photo.href;img.alt=author.displayName||'Reviewer';img.width=40;img.height=40;img.referrerPolicy='no-referrer';card.append(img);}}catch{}}
            text.textContent=review.text?.text||review.originalText?.text||'';const rating=doc.createElement('p');rating.textContent=typeof review.rating==='number'?review.rating+' / 5':'';card.append(name,rating,text,link('Read review on Google Maps',review.googleMapsUri||data.url));output.append(card);
          }
          for(const attribution of (Array.isArray(data.attributions)?data.attributions:[])){const p=doc.createElement('p');p.append(link(attribution.provider||'Attribution',attribution.providerUri));output.append(p);}
          output.append(link('View all reviews on Google Maps',data.url));button.hidden=true;
        }catch(error){status.textContent=error.message||'Reviews unavailable.';button.disabled=false;}
      });
    }
    if (kind === 'tabs' || kind === 'slider') {
      const panels = own('[data-wb-panel]'), buttons = own('[data-wb-tab]');
      let index = 0;
      const show = n => {
        if (!panels.length) return;
        index = (n + panels.length) % panels.length;
        panels.forEach((panel, i) => { panel.hidden = i !== index; });
        buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
        const status = root.querySelector('[data-wb-status]'); if (status) status.textContent = `${index + 1} / ${panels.length}`;
      };
      buttons.forEach((button, i) => {
        listen(button, 'click', () => show(i));
        listen(button, 'keydown', event => {
          let next = i;
          if (event.key === 'ArrowRight') next++;
          else if (event.key === 'ArrowLeft') next--;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = buttons.length - 1;
          else return;
          event.preventDefault(); show(next); buttons[index]?.focus();
        });
      });
      own('[data-wb-next]').forEach(button => listen(button, 'click', () => show(index + 1)));
      own('[data-wb-prev]').forEach(button => listen(button, 'click', () => show(index - 1)));
      show(0);
      cleanups.push(() => panels.forEach(panel => { panel.hidden = false; }));
    }
    if (kind === 'filter') {
      const input = root.querySelector('input[type="search"]');
      if (input) listen(input, 'input', () => {
        const query = input.value.toLocaleLowerCase(); let count = 0;
        own('[data-wb-row]').forEach(row => { row.hidden = !row.textContent.toLocaleLowerCase().includes(query); if (!row.hidden) count++; });
        const status = root.querySelector('[data-wb-status]'); if (status) status.textContent = `${count} results`;
      });
    }
  });
  const fxCleanup = [];
  const resetEffects = () => { fxCleanup.splice(0).forEach(stop => stop()); frames.forEach(id => win.cancelAnimationFrame(id)); frames.clear(); };
  const setupEffects = () => {
    resetEffects();
    doc.querySelectorAll('[data-wb-fx],[data-wb-site-fx]').forEach(root => {
      const effects = new Set(`${root.getAttribute('data-wb-fx') || ''} ${root.getAttribute('data-wb-site-fx') || ''}`.split(' '));
      if (effects.has('reveal') && !reduced.matches && win.IntersectionObserver) {
        root.classList.add('wb-reveal-ready');
        const observer = new win.IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { root.classList.add('wb-revealed'); observer.unobserve(root); } }), {threshold: 0.05});
        observer.observe(root); fxCleanup.push(() => { observer.disconnect(); root.classList.remove('wb-reveal-ready', 'wb-revealed'); });
      }
      if (!(effects.has('glow') || effects.has('spotlight')) || reduced.matches || !fine.matches) return;
      const layer = doc.createElement('div'); layer.className = effects.has('spotlight') ? 'wb-pointer-light wb-spotlight' : 'wb-pointer-light'; layer.setAttribute('aria-hidden', 'true');
      const page = root === doc.body;
      layer.style.position = page ? 'fixed' : 'absolute';
      const oldPosition = root.style.position;
      if (!page && win.getComputedStyle(root).position === 'static') root.style.position = 'relative';
      root.appendChild(layer);
      let tx = 50, ty = 50, x = 50, y = 50, queued = false;
      const tick = () => { queued = false; x += (tx - x) * .16; y += (ty - y) * .16; layer.style.setProperty('--wb-x', `${x}%`); layer.style.setProperty('--wb-y', `${y}%`); if (Math.abs(tx-x) + Math.abs(ty-y) > .15) queue(); };
      const queue = () => { if (!queued) { queued = true; const id = win.requestAnimationFrame(() => { frames.delete(id); tick(); }); frames.add(id); } };
      const move = event => { const bounds = root.getBoundingClientRect(); tx = page ? event.clientX / win.innerWidth * 100 : (event.clientX-bounds.left)/Math.max(1,bounds.width)*100; ty = page ? event.clientY/win.innerHeight*100 : (event.clientY-bounds.top)/Math.max(1,bounds.height)*100; layer.style.opacity = '1'; queue(); };
      const leave = () => { layer.style.opacity = '0'; };
      root.addEventListener('pointermove', move); root.addEventListener('pointerleave', leave);
      fxCleanup.push(() => { root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave); layer.remove(); root.style.position = oldPosition; });
    });
  };
  setupEffects(); listen(reduced, 'change', setupEffects); listen(fine, 'change', setupEffects);
  return () => { resetEffects(); cleanups.forEach(stop => stop()); };
}
