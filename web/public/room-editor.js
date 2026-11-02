import {roomRows,benchLabel} from '/layout.js';
export function createRoomEditor(form) {
  const rowInput=form.elements.rows,uniformInput=form.elements.benchesPerRow;
  const mode=form.elements.layoutMode,custom=document.querySelector('#room-row-counts');
  const preview=document.querySelector('#room-layout-preview'),summary=document.querySelector('#room-layout-summary');
  let counts=[6,6,6,6],excluded=new Set();
  function validRows(){const n=Number(rowInput.value);return Number.isInteger(n)&&n>=1&&n<=30?n:0;}
  function refreshCounts() {
    const n=validRows(),uniform=Number(uniformInput.value);
    if(!n)return;
    counts=Array.from({length:n},(_,i)=>mode.value==='uniform'?uniform:(counts[i]??uniform??6));
  }
  function render() {
    const valid=validRows()&&counts.every(n=>Number.isInteger(n)&&n>=1&&n<=30);
    document.querySelector('#uniform-bench-field').classList.toggle('hidden',mode.value!=='uniform');
    uniformInput.disabled=mode.value!=='uniform';
    custom.classList.toggle('hidden',mode.value!=='varying');
    if(mode.value==='varying') custom.innerHTML=counts.map((n,i)=>`<label>Row ${i+1}<input type="number" min="1" max="30" value="${n}" data-row-count="${i}" aria-label="Bench count for row ${i+1}" required><small>bench positions</small></label>`).join('');
    if(!valid){preview.textContent='Enter 1–30 rows and 1–30 bench positions in every row to preview the layout.';summary.textContent='Complete the row counts above.';return;}
    excluded=new Set([...excluded].filter(position=>{const [r,b]=position.split(':').map(Number);return r>=1&&r<=counts.length&&b>=1&&b<=counts[r-1];}));
    preview.innerHTML=counts.map((n,i)=>`<div class="layout-row"><div class="layout-row-title">Row ${i+1}<small>${n} benches</small></div><div class="layout-bench-scroll"><div class="layout-bench-strip">${Array.from({length:n},(_,j)=>{const key=`${i+1}:${j+1}`,off=excluded.has(key);return `<button type="button" class="bench-toggle ${off?'unavailable':''}" data-editor-bench="${key}" aria-pressed="${off}" aria-label="${benchLabel(key)}, ${off?'unavailable':'usable'}"><span>Bench ${j+1}</span><i aria-hidden="true">▰ ▰</i></button>`;}).join('')}</div></div></div>`).join('');
    form.elements.excluded.value=[...excluded].join(',');
    const total=counts.reduce((a,b)=>a+b,0),usable=total-excluded.size;
    summary.textContent=`${total} bench positions − ${excluded.size} unavailable = ${usable} usable benches (${usable*2} usable seats).`;
  }
  rowInput.addEventListener('input',()=>{refreshCounts();render();});
  uniformInput.addEventListener('input',()=>{refreshCounts();render();});
  mode.addEventListener('change',()=>{refreshCounts();render();});
  custom.addEventListener('input',event=>{
    if(!event.target.hasAttribute('data-row-count'))return;
    counts[Number(event.target.dataset.rowCount)]=Number(event.target.value);
    // Keep focus in the number field; only rebuild preview after the value is complete.
    if(counts.every(n=>Number.isInteger(n)&&n>=1&&n<=30)) {
      const index=event.target.dataset.rowCount;
      const focusedValue=event.target.value;
      render();const next=custom.querySelector(`[data-row-count="${index}"]`);next.focus();next.value=focusedValue;
    } else summary.textContent='Complete every row with a whole number from 1 to 30. The previous preview is not ready to save.';
  });
  preview.addEventListener('click',event=>{
    const button=event.target.closest('[data-editor-bench]');if(!button)return;
    const key=button.dataset.editorBench;excluded.has(key)?excluded.delete(key):excluded.add(key);render();
    preview.querySelector(`[data-editor-bench="${key}"]`)?.focus();
  });
  return {
    open(data={}) {
      counts=data.id?roomRows(data):[6,6,6,6];excluded=new Set(Array.isArray(data.excluded)?data.excluded:[]);
      rowInput.value=counts.length;uniformInput.value=Math.max(...counts);mode.value=new Set(counts).size>1?'varying':'uniform';render();
    },
    value() {
      refreshCounts();if(!validRows()||counts.some(n=>!Number.isInteger(n)||n<1||n>30))throw new Error('Enter 1–30 bench positions for every row.');
      return {rows:counts.length,benchesPerRow:Math.max(...counts),rowBenchCounts:[...counts],excluded:[...excluded]};
    }
  };
}
