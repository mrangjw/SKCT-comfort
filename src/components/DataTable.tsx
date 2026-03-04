import type { TableData } from '../types';

export default function DataTable({ table }: { table: TableData }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 mb-4">
      <table className="w-full text-sm border-collapse min-w-[320px]">
        {table.unit && (
          <caption className="text-right text-text-dim text-xs mb-1">{table.unit}</caption>
        )}
        <thead>
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} className="bg-bg-hover px-3 py-2 text-left font-medium border border-bg-hover/50 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-bg-card' : 'bg-bg'}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 border border-bg-hover/30 whitespace-nowrap">
                  {typeof cell === 'number' ? cell.toLocaleString() : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
