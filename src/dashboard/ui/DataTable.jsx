// Generic list shared by every feature page (Cars, Insurance, Licenses,
// Maintenance, Bookings). `columns` is [{ key, header, render? }];
// `renderActions(row)` is optional and adds a trailing actions cell.
// Uses text-start/justify-end (logical, not left/right) so it reads
// correctly under the dashboard's dir="rtl".
//
// Renders two ways depending on screen size (pure CSS, no JS viewport
// detection): a normal wide table from `sm` up, and a stacked card per
// row below that — a wide multi-column table has no way to fit a phone
// screen without either shrinking text unreadably or scrolling
// sideways, so below `sm` it becomes a simple label/value list instead.
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

  // The "#" row-number column reads fine as a table header, but adds
  // nothing useful as a labeled line inside a stacked card.
  const cardColumns = columns.filter((column) => column.key !== "index");

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-card sm:block">
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

      <div className="grid gap-3 sm:hidden">
        {rows.map((row, index) => (
          <div key={row[keyField]} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="grid gap-2.5">
              {cardColumns.map((column) => (
                <div
                  key={column.key}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span className="shrink-0 font-semibold text-ink-faint">
                    {column.header}
                  </span>
                  <span className="text-end text-ink">
                    {column.render ? column.render(row, index) : row[column.key]}
                  </span>
                </div>
              ))}
            </div>
            {renderActions && (
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-border-soft pt-3">
                {renderActions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
