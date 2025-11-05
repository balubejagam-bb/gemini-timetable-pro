import React from 'react';
import { Card } from '@/components/ui/card';
import './TimetableTemplate.css';

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

export const TimetableTemplate: React.FC<TimetableTemplateProps> = ({
  title,
  subtitle,
  department,
  semester,
  section,
  roomNo,
  effectiveDate,
  schedule,
  subjects,
  pageNumber = 1
}) => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = [
    { label: "08:00AM\nTO\n08:55AM", key: "9:00-10:00" },
    { label: "08:55AM\nTO\n09:50AM", key: "10:00-11:00" },
    { label: "10.15AM\nTO\n11.10AM", key: "11:15-12:15" },
    { label: "11.10AM\nTO\n12.05PM", key: "12:15-13:15" },
    { label: "12.05PM\nTO\n01.00PM", key: "14:00-15:00" }
  ];

  const getColorForSubject = (code: string) => {
    if (!code) return '#ffffff';
    // Generate consistent color based on subject code
    const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      '#E8F5E9', // Light Green
      '#E3F2FD', // Light Blue
      '#FFF3E0', // Light Orange
      '#F3E5F5', // Light Purple
      '#FFF9C4', // Light Yellow
      '#FFE0B2', // Light Amber
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="timetable-a4-page bg-white p-8 font-sans">
      {/* Header */}
      <div className="border-4 border-black mb-4">
        <div className="flex items-center justify-between p-4 border-b-2 border-black">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 flex items-center justify-center">
              <img 
                src="/mbu-logo.webp" 
                alt="MBU Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback if logo fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-20 h-20 bg-red-600 flex items-center justify-center"><div class="text-white font-bold text-center text-xs">MBU<br/>LOGO</div></div>';
                  }
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-600">MOHAN BABU UNIVERSITY</h1>
              <p className="text-sm">Sree Sainath Nagar, A. Rangampet-517102</p>
            </div>
          </div>
          <div className="w-20 h-20 bg-gray-800 text-white flex items-center justify-center text-3xl font-bold">
            {pageNumber}
          </div>
        </div>
        
        <div className="text-center py-2 border-b-2 border-black">
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm font-semibold">{subtitle}</p>}
          {department && <p className="text-lg font-bold uppercase">{department}</p>}
          {semester && <p className="text-base font-bold">CLASS WORK TIME TABLE</p>}
          {semester && <p className="text-base font-bold">{semester}</p>}
        </div>

        <div className="flex justify-between px-4 py-2 bg-gray-100">
          {roomNo && <p className="font-semibold">Room No.: {roomNo}</p>}
          <div className="flex-1"></div>
          {effectiveDate && <p className="font-semibold">W.E.F.: {effectiveDate}</p>}
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="border-2 border-black mb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="timetable-time-column border-2 border-black bg-gray-300 p-2 text-sm font-bold">
                DAY/<br/>HR
              </th>
              {timeSlots.map((slot, idx) => (
                <th key={idx} className="border-2 border-black bg-gray-300 p-2 text-xs font-bold whitespace-pre-line">
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className="border-2 border-black bg-gray-200 p-2 text-center font-bold text-sm">
                  {day.toUpperCase().substring(0, 3)}
                </td>
                {timeSlots.map((slot, idx) => {
                  const daySchedule = schedule[day] || {};
                  const slotData = daySchedule[slot.key];
                  
                  // Check if this is a break slot (11:15-12:15 is typically break)
                  const isBreak = idx === 2 && day === "Monday";
                  
                  if (isBreak) {
                    return (
                      <td 
                        key={idx} 
                        className="border-2 border-black bg-gray-400 p-2 text-center font-bold text-sm"
                        rowSpan={1}
                      >
                        BREAK
                      </td>
                    );
                  }

                  if (!slotData || !slotData.subject) {
                    return (
                      <td key={idx} className="border-2 border-black p-2 text-center text-xs text-gray-500">
                        -
                      </td>
                    );
                  }

                  const bgColor = getColorForSubject(slotData.code);
                  const isHighlighted = slotData.type === 'lab' || slotData.code.includes('LAB');

                  return (
                    <td 
                      key={idx} 
                      className="border-2 border-black p-1 text-center text-xs font-semibold"
                      style={{ 
                        backgroundColor: isHighlighted ? '#C8E6C9' : bgColor
                      }}
                    >
                      <div className="flex flex-col items-center justify-center min-h-[60px]">
                        <span className="font-bold text-sm">{slotData.code}</span>
                        {slotData.type && (
                          <span className="text-[10px] text-gray-600">({slotData.type})</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subject Legend */}
      {subjects && subjects.length > 0 && (
        <div className="border-2 border-black">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="timetable-subject-code-column border-2 border-black p-2 text-sm font-bold">
                  SUBJECT<br/>CODE
                </th>
                <th className="border-2 border-black p-2 text-sm font-bold">
                  SUBJECT NAME
                </th>
                <th className="timetable-faculty-column border-2 border-black p-2 text-sm font-bold">
                  FACULTY NAME
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, idx) => (
                <tr key={idx}>
                  <td className="border-2 border-black p-2 text-center text-sm font-semibold">
                    {subject.code}
                  </td>
                  <td className="border-2 border-black p-2 text-sm">
                    {subject.name}
                  </td>
                  <td className="border-2 border-black p-2 text-sm">
                    {subject.faculty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Export component for PDF generation
export const TimetableTemplatePDF: React.FC<TimetableTemplateProps> = (props) => {
  return (
    <div id="timetable-pdf-template">
      <TimetableTemplate {...props} />
    </div>
  );
};
