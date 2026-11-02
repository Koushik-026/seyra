import {roomRows} from '/layout.js';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHtml;
export function renderSeating(plan) {
  const students=new Map(plan.input.students.map(s=>[s.id,s]));
  const seats=new Map(plan.assignments.map(s=>[`${s.roomId}:${s.row}:${s.bench}:${s.seat}`,students.get(s.studentId)]));
  return plan.input.rooms.map(room=>{
    const counts=roomRows(room);
    let html=`<section class="room-plan"><h3>${e(room.code)}</h3><p>FRONT OF ROOM · Rows run front to back; benches run left to right. Each usable bench has seats A and B.</p>`;
    for(let row=1;row<=room.rows;row++){
      html+=`<div class="bench-row"><div class="row-label">ROW ${row} · ${counts[row-1]} BENCHES</div><div class="bench-grid" data-bench-columns="${counts[row-1]}">`;
      for(let b=1;b<=counts[row-1];b++){
        const excluded=room.excluded.includes(`${row}:${b}`);html+=`<div class="bench ${excluded?'excluded':''}" aria-label="Row ${row}, Bench ${b}"><div class="bench-name">BENCH ${b}</div>`;
        if(excluded)html+='<span class="seat empty">Excluded</span><span class="seat empty">Unavailable</span>';
        else for(const seat of ['A','B']){const s=seats.get(`${room.id}:${row}:${b}:${seat}`);html+=`<span class="seat ${s?'':'empty'}" title="${s?e(`${s.name} · Year ${s.year} ${s.branch}`):'Empty seat'}"><span class="seat-label">${seat}</span>${s?e(s.roll):'Empty'}</span>`;}
        html+='</div>';
      }
      html+='</div></div>';
    }
    return html+'</section>';
  }).join('');
}
export function setBenchColumns(){document.querySelectorAll('[data-bench-columns]').forEach(el=>el.style.gridTemplateColumns=`repeat(${el.dataset.benchColumns}, minmax(85px,1fr))`);}
