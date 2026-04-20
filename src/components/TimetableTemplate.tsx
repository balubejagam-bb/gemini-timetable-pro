import React from 'react';
import './TimetableTemplate.css';
import { isLibrarySubjectLike } from '@/lib/newmethod';

interface TimetableSlot {
  subject: string;
  code: string;
  staff: string;
  room: string;
  type?: string;
}

interface TimetableTemplateProps {
  title: string;
  subtitle?: string;
  department?: string;
  semester?: string;
  section?: string;
  roomNo?: string;
  effectiveDate?: string;
  academicYear?: string;
  schedule: {
    [day: string]: {
      [timeSlot: string]: TimetableSlot | null;
    };
  };
  subjects?: Array<{
    code: string;
    name: string;
    faculty: string;
  }>;
  pageNumber?: number;
}

// MBU Official 7-period layout with Morning break and Lunch break
// Slot 1: 09:00-10:00  | Slot 2: 10:15-11:15  | Slot 3: 11:15-12:15
// LUNCH 12:15-01:15
// Slot 4: 01:15-02:00  | Slot 5: 02:00-02:45
// BREAK 02:45-03:00
// Slot 6: 03:00-04:00  | Slot 7: 04:00-05:00
const MBU_PERIODS = [
  { key: 'slot1', label: '09:00AM\nTO\n10:00AM', shortLabel: '09-10' },
  { key: 'slot2', label: '10:15AM\nTO\n11:15AM', shortLabel: '10-11' },
  { key: 'slot3', label: '11:15AM\nTO\n12:15PM', shortLabel: '11-12' },
  // LUNCH break inserted visually here
  { key: 'slot4', label: '01:15PM\nTO\n02:00PM', shortLabel: '1:15-2' },
  { key: 'slot5', label: '02:00PM\nTO\n02:45PM', shortLabel: '2-2:45' },
  // Short BREAK
  { key: 'slot6', label: '03:00PM\nTO\n04:00PM', shortLabel: '3-4' },
  { key: 'slot7', label: '04:00PM\nTO\n05:00PM', shortLabel: '4-5' },
];

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const checkIsLab = (slot: TimetableSlot | null | undefined) =>
  slot && (
    slot.type?.toLowerCase().includes('lab') ||
    slot.code?.toLowerCase().includes('lab') ||
    slot.subject?.toLowerCase().includes('lab') ||
    slot.subject?.toLowerCase().includes('practical')
  );

const sameScheduledCell = (left: TimetableSlot | null | undefined, right: TimetableSlot | null | undefined) =>
  !!left &&
  !!right &&
  left.subject === right.subject &&
  left.code === right.code &&
  left.staff === right.staff &&
  left.room === right.room;

const checkIsLibrary = (slot: TimetableSlot | null | undefined) =>
  slot && (
    slot.type?.toLowerCase().includes('library') ||
    slot.subject?.toLowerCase().includes('library') ||
    slot.code?.toLowerCase().includes('library') ||
    isLibrarySubjectLike({ name: slot.subject, code: slot.code, subject_type: slot.type })
  );

// Detect if two consecutive slots have the SAME lab (for visual merging)
const isSameLabAsPrev = (daySchedule: { [k: string]: TimetableSlot | null }, slotIdx: number) => {
  if (slotIdx === 0) return false;
  const prev = daySchedule[MBU_PERIODS[slotIdx - 1].key];
  const curr = daySchedule[MBU_PERIODS[slotIdx].key];
  if (!prev || !curr) return false;
  return sameScheduledCell(prev, curr);
};

// Detect if this slot's lab continues into the NEXT slot (for colspan)
const labContinuesNext = (daySchedule: { [k: string]: TimetableSlot | null }, slotIdx: number) => {
  if (slotIdx >= MBU_PERIODS.length - 1) return false;
  const curr = daySchedule[MBU_PERIODS[slotIdx].key];
  const next = daySchedule[MBU_PERIODS[slotIdx + 1].key];
  if (!curr || !next) return false;
  return sameScheduledCell(curr, next);
};

export const TimetableTemplate: React.FC<TimetableTemplateProps> = ({
  title,
  subtitle,
  department,
  semester,
  section,
  roomNo,
  effectiveDate,
  academicYear,
  schedule,
  subjects,
  pageNumber = 1,
}) => {
  const today = new Date();
  const yr = today.getFullYear();
  const academicYearStr = academicYear || `${yr}-${(yr + 1).toString().slice(-2)}`;
  const dateStr = effectiveDate || today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Determine which days have data (skip Saturday if empty)
  const activeDays = DAYS_FULL.filter((dayFull, i) => {
    if (i < 5) return true; // Always show Mon-Fri
    const daySchedule = schedule[dayFull] || {};
    return Object.values(daySchedule).some(s => s && s.subject);
  });

  return (
    <div className="tt-page" style={{ fontFamily: 'Arial, Helvetica, sans-serif', background: '#fff', padding: '14px 18px', maxWidth: '297mm', margin: '0 auto', fontSize: '10px' }}>

      {/* ── HEADER ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <tbody>
          <tr>
            <td style={{ width: '70px', padding: '2px' }}>
              <img src="/mbu-logo.webp" alt="MBU" style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </td>
            <td style={{ verticalAlign: 'middle', padding: '2px' }}>
              <div style={{ color: '#c00', fontWeight: 'bold', fontSize: '16px', letterSpacing: '0.5px' }}>MOHAN BABU UNIVERSITY</div>
              <div style={{ fontSize: '9px', color: '#444' }}>Sree Sainath Nagar, A. Rangampet-517102</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '2px', lineHeight: '1.5' }}>
        {title && <div style={{ fontSize: '12px' }}>{title}</div>}
        {subtitle && <div style={{ fontSize: '11px', textDecoration: 'underline' }}>{subtitle}</div>}
        <div style={{ fontSize: '11px' }}>CLASS WORK TIME TABLE ({academicYearStr})</div>
        {semester && <div style={{ fontSize: '11px' }}>{semester}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10px', fontWeight: 'bold' }}>
        <div>Room No.: {roomNo || '—'}</div>
        {section && <div>Section: {section}</div>}
        <div>W.E.F.: {dateStr}</div>
      </div>

      {/* ── TIMETABLE GRID ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', marginBottom: '8px' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '38px', minWidth: '38px', backgroundColor: '#cfcfcf' }}>DAY/<br />HR</th>
            {/* Periods 1-3 (Morning) */}
            {MBU_PERIODS.slice(0, 3).map((p) => (
              <th key={p.key} style={thStyle}>{formatTimeLabel(p.label)}</th>
            ))}
            {/* LUNCH column */}
            <th style={{ ...thStyle, width: '22px', minWidth: '22px', backgroundColor: '#f3f4f6', fontSize: '7px', padding: '2px 1px' }}>
              L<br />U<br />N<br />C<br />H
            </th>
            {/* Periods 4-5 (Afternoon 1) */}
            {MBU_PERIODS.slice(3, 5).map((p) => (
              <th key={p.key} style={thStyle}>{formatTimeLabel(p.label)}</th>
            ))}
            {/* BREAK column */}
            <th style={{ ...thStyle, width: '22px', minWidth: '22px', backgroundColor: '#f3f4f6', fontSize: '7px', padding: '2px 1px' }}>
              B<br />R<br />E<br />A<br />K
            </th>
            {/* Periods 6-7 (Afternoon 2) */}
            {MBU_PERIODS.slice(5, 7).map((p) => (
              <th key={p.key} style={thStyle}>{formatTimeLabel(p.label)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeDays.map((dayFull, dayIdx) => {
            const daySchedule = schedule[dayFull] || {};
            return (
              <tr key={dayFull}>
                <td style={{ ...tdStyle, backgroundColor: '#d0d0d0', fontWeight: 'bold', textAlign: 'center', width: '38px' }}>
                  {DAYS_SHORT[DAYS_FULL.indexOf(dayFull)]}
                </td>

                {/* Morning slots 1-3 */}
                {renderDayCells(daySchedule, 0, 3)}

                {/* LUNCH */}
                <td style={{ ...tdStyle, backgroundColor: '#f3f4f6', textAlign: 'center', width: '22px', fontSize: '7px' }}>
                  L<br />U<br />N<br />C<br />H
                </td>

                {/* Afternoon slots 4-5 */}
                {renderDayCells(daySchedule, 3, 5)}

                {/* BREAK */}
                <td style={{ ...tdStyle, backgroundColor: '#f3f4f6', textAlign: 'center', width: '22px', fontSize: '7px' }}>
                  B<br />R<br />E<br />A<br />K
                </td>

                {/* Evening slots 6-7 */}
                {renderDayCells(daySchedule, 5, 7)}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── SUBJECT LEGEND ── */}
      {subjects && subjects.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', marginBottom: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#d8d8d8' }}>
              <th style={{ ...thStyle, width: '15%' }}>SUBJECT<br />CODE</th>
              <th style={{ ...thStyle, width: '50%' }}>SUBJECT NAME</th>
              <th style={{ ...thStyle, width: '35%' }}>FACULTY NAME</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, idx) => (
              <tr key={idx}>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: idx % 2 === 0 ? '#fff7ed' : '#fffbeb' }}>{sub.code}</td>
                <td style={{ ...tdStyle, backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fffdf7' }}>{sub.name}</td>
                <td style={{ ...tdStyle, backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fffdf7' }}>{sub.faculty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── FOOTER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontWeight: 'bold', fontSize: '11px' }}>
        <div>TT COORDINATOR</div>
        <div>PROGRAM HEAD, {department?.toUpperCase() || 'DEPT'}</div>
      </div>
    </div>
  );
};

// ── Render cells for a range of period indices ──────────────────────────────
function renderDayCells(daySchedule: { [k: string]: TimetableSlot | null }, startIdx: number, endIdx: number) {
  const cells: React.ReactNode[] = [];
  let skipNext = false;

  for (let i = startIdx; i < endIdx; i++) {
    if (skipNext) { skipNext = false; continue; }

    const slot = daySchedule[MBU_PERIODS[i].key] || null;
    const nextSlot = daySchedule[MBU_PERIODS[i + 1]?.key] || null;
    const prevSlot = daySchedule[MBU_PERIODS[i - 1]?.key] || null;
    const isLabSlot = checkIsLab(slot) || sameScheduledCell(slot, nextSlot) || sameScheduledCell(prevSlot, slot);
    const continues = labContinuesNext(daySchedule, i);

    if (isLabSlot && continues) {
      // Lab spanning 2 periods — render one merged cell
      cells.push(
        <td key={MBU_PERIODS[i].key} colSpan={2} style={{
          ...tdStyle,
          backgroundColor: '#fde68a',
          textAlign: 'center',
          verticalAlign: 'middle',
          padding: '6px 4px',
          fontWeight: 'bold',
          boxShadow: 'inset 0 0 0 1px #f59e0b',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minHeight: '34px', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: '1' }}>{slot!.code}</span>
            <span style={{ fontSize: '8px', color: '#92400e', background: '#fff7ed', border: '1px solid #fbbf24', borderRadius: '999px', padding: '0 5px' }}>LAB</span>
            {slot!.room && <span style={{ fontSize: '8px', color: '#333' }}>Room: {slot!.room}</span>}
          </div>
        </td>
      );
      skipNext = true;
    } else if (isSameLabAsPrev(daySchedule, i)) {
      // This cell was already merged into previous — skip
      continue;
    } else if (checkIsLibrary(slot)) {
      cells.push(
        <td key={MBU_PERIODS[i].key} style={{
          ...tdStyle,
          textAlign: 'center',
          verticalAlign: 'middle',
          backgroundColor: '#dcfce7',
          padding: '5px 3px',
          boxShadow: 'inset 0 0 0 1px #86efac',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minHeight: '28px', justifyContent: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#166534' }}>{slot!.code || slot!.subject}</span>
            <span style={{ fontSize: '8px', color: '#166534', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '999px', padding: '0 5px' }}>LIB</span>
          </div>
        </td>
      );
    } else if (slot && slot.subject) {
      // Normal theory period
      cells.push(
        <td key={MBU_PERIODS[i].key} style={{
          ...tdStyle,
          textAlign: 'center',
          verticalAlign: 'middle',
          backgroundColor: isLabSlot ? '#fde68a' : '#ffffff',
          padding: '3px 2px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '10px' }}>{slot.code || slot.subject}</span>
          </div>
        </td>
      );
    } else {
      // Empty period
      cells.push(
        <td key={MBU_PERIODS[i].key} style={{ ...tdStyle, textAlign: 'center', color: '#bbb' }}>—</td>
      );
    }
  }
  return cells;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeLabel(raw: string) {
  return (
    <>
      {raw.split('\n').map((line, i) => (
        <React.Fragment key={i}>{line}{i < 2 ? <br /> : null}</React.Fragment>
      ))}
    </>
  );
}

const thStyle: React.CSSProperties = {
  border: '1px solid #000', padding: '3px 2px', textAlign: 'center',
  backgroundColor: '#d8d8d8', fontWeight: 'bold', fontSize: '8px',
  whiteSpace: 'pre-line', lineHeight: '1.2',
};

const tdStyle: React.CSSProperties = {
  border: '1px solid #000', padding: '3px 2px', fontSize: '10px', lineHeight: '1.2',
};

// ── PDF wrapper ─────────────────────────────────────────────────────────────
export const TimetableTemplatePDF: React.FC<TimetableTemplateProps> = (props) => (
  <div id="timetable-pdf-template">
    <TimetableTemplate {...props} />
  </div>
);
