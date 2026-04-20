export const TEMPLATE_DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const TEMPLATE_SLOT_KEYS: Record<number, string> = {
  1: "slot1",
  2: "slot2",
  3: "slot3",
  4: "slot4",
  5: "slot5",
  6: "slot6",
  7: "slot7",
};

type Nullable<T> = T | null | undefined;

export interface SubjectLike {
  id?: string;
  name?: string | null;
  code?: string | null;
  subject_type?: string | null;
}

export interface RoomLike {
  id?: string;
  room_number?: string | null;
  room_type?: string | null;
}

export interface StaffLike {
  id?: string;
  name?: string | null;
}

export interface EntryWithRelations {
  day_of_week: number;
  time_slot: number;
  subjects?: Nullable<SubjectLike>;
  staff?: Nullable<StaffLike>;
  rooms?: Nullable<RoomLike>;
}

export interface TemplateSlotData {
  subject: string;
  code: string;
  staff: string;
  room: string;
  type: string;
}

export interface TemplateSubjectLegend {
  code: string;
  name: string;
  faculty: string;
}

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

const sameScheduledCell = (left?: TemplateSlotData | null, right?: TemplateSlotData | null) =>
  !!left &&
  !!right &&
  left.subject === right.subject &&
  left.code === right.code &&
  left.staff === right.staff &&
  left.room === right.room;

export function isLabSubjectLike(subject?: Nullable<SubjectLike>): boolean {
  const subjectType = normalize(subject?.subject_type);
  const name = normalize(subject?.name);
  const code = normalize(subject?.code);

  return (
    subjectType.includes("lab") ||
    subjectType.includes("practical") ||
    name.includes(" lab") ||
    name.endsWith("lab") ||
    name.includes("practical") ||
    code.includes("lab")
  );
}

export function isLibrarySubjectLike(subject?: Nullable<SubjectLike>): boolean {
  const subjectType = normalize(subject?.subject_type);
  const name = normalize(subject?.name);
  const code = normalize(subject?.code);

  return (
    subjectType.includes("library") ||
    name.includes("library") ||
    code.includes("library")
  );
}

export function isLabRoomLike(room?: Nullable<RoomLike>): boolean {
  const roomType = normalize(room?.room_type);
  const roomNumber = normalize(room?.room_number);

  return (
    roomType.includes("lab") ||
    roomType.includes("practical") ||
    roomNumber.includes("lab")
  );
}

export function isClassroomLike(room?: Nullable<RoomLike>): boolean {
  if (!room) {
    return false;
  }

  const roomType = normalize(room.room_type);
  if (!roomType) {
    return !isLabRoomLike(room);
  }

  return (
    roomType.includes("class") ||
    roomType.includes("lecture") ||
    roomType.includes("room") ||
    (!isLabRoomLike(room) && !roomType.includes("auditorium"))
  );
}

export function splitRoomsByType<T extends RoomLike>(rooms: T[]) {
  const labRooms = rooms.filter((room) => isLabRoomLike(room));
  const classRooms = rooms.filter((room) => isClassroomLike(room));

  return {
    labRooms,
    classRooms,
    hasDedicatedLabs: labRooms.length > 0,
    hasDedicatedClassrooms: classRooms.length > 0,
  };
}

export function sanitizeTimetableFilename(name: string) {
  return name.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, "_");
}

export async function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll("img"));

  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          const finish = () => resolve();
          image.addEventListener("load", finish, { once: true });
          image.addEventListener("error", finish, { once: true });
        }),
    ),
  );
}

export function buildTemplateDataFromEntries(entries: EntryWithRelations[]) {
  const schedule: Record<string, Record<string, TemplateSlotData | null>> = {};
  const subjectLegend = new Map<string, TemplateSubjectLegend>();
  const roomUsage = new Map<string, { count: number; isLab: boolean }>();

  TEMPLATE_DAY_NAMES.forEach((day) => {
    schedule[day] = {};
    Object.values(TEMPLATE_SLOT_KEYS).forEach((slotKey) => {
      schedule[day][slotKey] = null;
    });
  });

  entries.forEach((entry) => {
    const dayName = TEMPLATE_DAY_NAMES[entry.day_of_week - 1];
    const slotKey = TEMPLATE_SLOT_KEYS[entry.time_slot];
    if (!dayName || !slotKey) {
      return;
    }

    const subjectName = entry.subjects?.name || "TBD";
    const subjectCode = entry.subjects?.code || subjectName;
    const facultyName = entry.staff?.name || "TBD";
    const roomNumber = entry.rooms?.room_number || "TBD";
    const labSubject = isLabSubjectLike(entry.subjects);
    const librarySubject = isLibrarySubjectLike(entry.subjects);

    schedule[dayName][slotKey] = {
      subject: subjectName,
      code: subjectCode,
      staff: facultyName,
      room: roomNumber,
      type: labSubject ? "lab" : librarySubject ? "library" : (entry.subjects?.subject_type || "theory"),
    };

    if (!subjectLegend.has(subjectCode)) {
      subjectLegend.set(subjectCode, {
        code: subjectCode,
        name: subjectName,
        faculty: facultyName,
      });
    }

    const prev = roomUsage.get(roomNumber) || { count: 0, isLab: isLabRoomLike(entry.rooms) };
    roomUsage.set(roomNumber, {
      count: prev.count + 1,
      isLab: prev.isLab,
    });
  });

  TEMPLATE_DAY_NAMES.forEach((day) => {
    const daySchedule = schedule[day];
    const slotKeys = Object.values(TEMPLATE_SLOT_KEYS);
    for (let index = 0; index < slotKeys.length - 1; index++) {
      const current = daySchedule[slotKeys[index]];
      const next = daySchedule[slotKeys[index + 1]];
      if (sameScheduledCell(current, next)) {
        if (current) current.type = "lab";
        if (next) next.type = "lab";
      }
    }
  });

  let primaryRoom = "—";
  const rankedRooms = Array.from(roomUsage.entries()).sort((left, right) => right[1].count - left[1].count);
  const preferredClassroom = rankedRooms.find(([, meta]) => !meta.isLab);
  if (preferredClassroom) {
    primaryRoom = preferredClassroom[0];
  } else if (rankedRooms.length > 0) {
    primaryRoom = rankedRooms[0][0];
  }

  return {
    schedule,
    primaryRoom,
    subjects: Array.from(subjectLegend.values()).sort((left, right) => left.code.localeCompare(right.code)),
  };
}
