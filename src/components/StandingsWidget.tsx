import type { StandingsTable } from '../../services/sports/types';
import TeamLogo from './TeamLogo';

interface StandingsWidgetProps {
  table: StandingsTable;
  limit?: number;
}

export default function StandingsWidget({ table, limit }: StandingsWidgetProps) {
  const rows = limit ? table.rows.slice(0, limit) : table.rows;

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 text-center">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{table.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Standings data unavailable right now.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
          {table.title}
        </h3>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <th className="py-2 pl-4 pr-2 w-8">#</th>
              <th className="py-2 pr-3">Team / Driver</th>
              {table.columns.map((col) => (
                <th key={col.key} className="py-2 px-2.5 text-right font-mono">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {rows.map((row, idx) => (
              <tr
                key={`${row.team}-${idx}`}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/35 transition-colors h-10"
              >
                <td className="py-2 pl-4 pr-2 font-mono tabular-nums text-slate-400 dark:text-slate-500">
                  {row.rank || idx + 1}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2 min-w-[130px]">
                    {row.logo && (
                      <TeamLogo src={row.logo} name={row.team} shortName={row.teamShort} size="xs" />
                    )}
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                      {row.team}
                    </span>
                  </div>
                </td>
                {table.columns.map((col) => {
                  const val = row[col.key];
                  const isPts = col.key === 'points';
                  return (
                    <td
                      key={col.key}
                      className={`py-2 px-2.5 text-right font-mono tabular-nums ${
                        isPts
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {val ?? '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
