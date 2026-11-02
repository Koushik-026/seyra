// Room geometry shared by editors, review and printing. Row lengths need not be equal.
export function roomRows(room) {
  return room.rowBenchCounts?.length ? room.rowBenchCounts.map(Number)
    : Array(Number(room.rows)).fill(Number(room.benchesPerRow ?? room.benches_per_row));
}
export function roomBenchCount(room) { return roomRows(room).reduce((sum,n)=>sum+n,0); }
export function benchLabel(position) {
  const [row,bench]=String(position).split(':');return `Row ${row}, Bench ${bench}`;
}
