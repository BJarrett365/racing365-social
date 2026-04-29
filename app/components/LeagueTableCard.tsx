/* eslint-disable @next/next/no-img-element */
import {
  LEAGUE_TABLE_CARD_TOKENS,
  leagueTableBrandToken,
  leagueTablePageRows,
  leagueTableRowsForMode,
  type LeagueRow,
  type LeagueTableCardProps,
} from "@/app/lib/league-table-card-config";

function shouldHighlight(row: LeagueRow, highlightedTeam: string | undefined): boolean {
  if (highlightedTeam?.trim()) return row.team.trim().toLowerCase() === highlightedTeam.trim().toLowerCase();
  return row.position === 1;
}

export function LeagueTableCard({
  brand,
  competitionTitle,
  backgroundImageUrl,
  rows,
  mode = "full",
  highlightedTeam,
  highlightMode = "leader",
  footerText,
}: LeagueTableCardProps) {
  const brandToken = leagueTableBrandToken(brand);
  const modeRows = leagueTableRowsForMode(rows, mode);
  const visibleRows = leagueTablePageRows(modeRows);
  const compact = visibleRows.length > 10;
  const highlightColor =
    highlightMode === "brand" ? brandToken.primary : LEAGUE_TABLE_CARD_TOKENS.leaderHighlight.border;
  const highlightBackground =
    highlightMode === "brand"
      ? `${brandToken.primary}1F`
      : LEAGUE_TABLE_CARD_TOKENS.leaderHighlight.background;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ fontFamily: LEAGUE_TABLE_CARD_TOKENS.fontFamily, color: brandToken.text }}
    >
      <img
        src={backgroundImageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: "leagueTableBgZoom 12s ease-out both" }}
      />
      <div className="absolute inset-0" style={{ background: LEAGUE_TABLE_CARD_TOKENS.backgroundOverlay }} />
      <div
        className="absolute left-1/2 w-[90%] max-w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
        style={{
          top: LEAGUE_TABLE_CARD_TOKENS.targetTableCenterY,
          background: LEAGUE_TABLE_CARD_TOKENS.baseTableBackground,
        }}
      >
        {competitionTitle ? (
          <div className="mb-4 text-[34px] font-extrabold leading-[38px]">{competitionTitle}</div>
        ) : null}
        <div
          className="grid h-14 items-center border-b text-[18px] font-bold uppercase tracking-[2px]"
          style={{
            gridTemplateColumns: `${LEAGUE_TABLE_CARD_TOKENS.columns.rank} ${LEAGUE_TABLE_CARD_TOKENS.columns.team} ${LEAGUE_TABLE_CARD_TOKENS.columns.p} ${LEAGUE_TABLE_CARD_TOKENS.columns.w} ${LEAGUE_TABLE_CARD_TOKENS.columns.d} ${LEAGUE_TABLE_CARD_TOKENS.columns.l} ${LEAGUE_TABLE_CARD_TOKENS.columns.gd} ${LEAGUE_TABLE_CARD_TOKENS.columns.pts}`,
            color: LEAGUE_TABLE_CARD_TOKENS.headerText,
            borderColor: LEAGUE_TABLE_CARD_TOKENS.headerDivider,
          }}
        >
          <span>#</span>
          <span>Team</span>
          <span className="text-center">P</span>
          <span className="text-center">W</span>
          <span className="text-center">D</span>
          <span className="text-center">L</span>
          <span className="text-center">GD</span>
          <span className="text-center">PTS</span>
        </div>
        <div className="mt-2 space-y-1">
          {visibleRows.map((row, index) => {
            const highlighted = shouldHighlight(row, highlightedTeam);
            const teamFont = row.team.length > 18 ? 24 : 28;
            return (
              <div
                key={`${row.position}-${row.team}`}
                className="grid items-center rounded-xl border px-4"
                style={{
                  gridTemplateColumns: `${LEAGUE_TABLE_CARD_TOKENS.columns.rank} ${LEAGUE_TABLE_CARD_TOKENS.columns.team} ${LEAGUE_TABLE_CARD_TOKENS.columns.p} ${LEAGUE_TABLE_CARD_TOKENS.columns.w} ${LEAGUE_TABLE_CARD_TOKENS.columns.d} ${LEAGUE_TABLE_CARD_TOKENS.columns.l} ${LEAGUE_TABLE_CARD_TOKENS.columns.gd} ${LEAGUE_TABLE_CARD_TOKENS.columns.pts}`,
                  minHeight: compact ? 62 : 74,
                  borderColor: highlighted ? highlightColor : LEAGUE_TABLE_CARD_TOKENS.standardBorder,
                  background: highlighted ? highlightBackground : "rgba(255,255,255,0.02)",
                  boxShadow: highlighted ? `0 0 18px ${highlightColor}59` : "none",
                  animation: `leagueTableRowIn 420ms ease-out ${index * 100}ms both`,
                }}
              >
                <span className="text-[28px] font-extrabold">{row.position}</span>
                <span className="flex min-w-0 items-center gap-[14px]">
                  {row.badge ? <img src={row.badge} alt="" className={compact ? "h-[34px] w-[34px]" : "h-10 w-10"} /> : null}
                  <span className="truncate font-bold leading-[30px]" style={{ fontSize: teamFont }}>
                    {row.team}
                  </span>
                </span>
                {[row.played, row.won, row.drawn, row.lost, row.goalDifference].map((value, statIndex) => (
                  <span key={statIndex} className="text-center text-2xl font-semibold" style={{ color: LEAGUE_TABLE_CARD_TOKENS.statsText }}>
                    {value}
                  </span>
                ))}
                <span className="text-center text-[28px] font-extrabold">{row.points}</span>
              </div>
            );
          })}
        </div>
      </div>
      {footerText ? (
        <div
          className="absolute bottom-10 left-0 right-0 h-[100px] text-center text-2xl font-bold"
          style={{ color: brandToken.primary }}
        >
          {footerText}
        </div>
      ) : null}
      <style>{`
        @keyframes leagueTableBgZoom { from { transform: scale(1); } to { transform: scale(1.06); } }
        @keyframes leagueTableRowIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
