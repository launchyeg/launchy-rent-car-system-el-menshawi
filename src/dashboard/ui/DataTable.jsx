// Generic list table shared by every feature page (Cars, Insurance,
// Licenses, Maintenance, Bookings). `columns` is [{ key, header, render? }];
// `renderActions(row)` is optional and adds a trailing actions cell.
// Uses text-start/justify-end (logical, not left/right) so it reads
// correctly under the dashboard's dir="rtl".
export default function DataTable({
  columns,
  rows,
  keyField = "id",
  renderActions,
  emptyMessage = "لا توجد بيانات بعد",
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-border-soft bg-white py-14 text-center text-sm text-ink-soft">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-border-soft text-xs font-bold tracking-[0.04em] text-ink-faint uppercase">
            {columns.map((column) => (
              <th key={column.key} className="px-5 py-3.5 text-start font-bold">
                {column.header}
              </th>
            ))}
            {renderActions && <th className="px-5 py-3.5" aria-hidden="true" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row[keyField]}
              className="border-b border-border-soft last:border-0 hover:bg-surface-alt"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-5 py-4 text-ink">
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
              {renderActions && (
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {renderActions(row)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
