import { invoke } from "@tauri-apps/api/core";

/* ---------------------------------------------------------------------------
   Types mirroring the Rust structs. Kept by hand: there are twelve of them and
   a codegen step would be more machinery than the boundary is worth.
   --------------------------------------------------------------------------- */

export type Student = {
  id: number;
  name: string;
  preferredName: string | null;
  age: number | null;
  email: string | null;
  phone: string | null;
  englishLevel: string | null;
  goals: string | null;
  generalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  viewedAt: string | null;
  noteCount: number;
  lastClass: string | null;
  color: string | null;
};

export type StudentInput = {
  color?: string | null;
  id?: number | null;
  name: string;
  preferredName?: string | null;
  age?: number | null;
  email?: string | null;
  phone?: string | null;
  englishLevel?: string | null;
  goals?: string | null;
  generalNotes?: string | null;
};

export type ClassNote = {
  id: number;
  studentId: number;
  studentName: string;
  classDate: string;
  topic: string | null;
  lessonContent: string | null;
  performance: string | null;
  difficulties: string | null;
  homework: string | null;
  nextLesson: string | null;
  additionalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteInput = {
  id?: number | null;
  studentId: number;
  classDate: string;
  topic?: string | null;
  lessonContent?: string | null;
  performance?: string | null;
  difficulties?: string | null;
  homework?: string | null;
  nextLesson?: string | null;
  additionalNotes?: string | null;
};

export type Material = {
  id: number;
  name: string;
  path: string;
  kind: string;
  fileSize: number | null;
  folderId: number | null;
  folderName: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  tags: string[];
  /** Always true for a link. */
  exists: boolean;
};

/** Links share the materials table - `path` holds the URL. */
export const isLink = (m: Material) => m.kind === "LINK";

export type Folder = { id: number; name: string; count: number };

export type ImportResult = {
  imported: number;
  duplicates: number;
  rejected: [string, string][];
};

export type Hit = { kind: "student" | "note" | "material"; id: number; title: string; subtitle: string };
export type GlobalResults = { students: Hit[]; notes: Hit[]; materials: Hit[] };

export type Dashboard = {
  studentCount: number;
  noteCount: number;
  materialCount: number;
  recentStudents: Student[];
  recentNotes: ClassNote[];
  recentMaterials: Material[];
};

/**
 * Every command goes through here. Rust returns `{ message }` on failure, and
 * that message is already teacher-readable — so re-throw it as the Error text
 * and the UI never has to know about the shape.
 */
async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    const message =
      typeof e === "object" && e && "message" in e && typeof e.message === "string"
        ? e.message
        : "Something went wrong. Please try again.";
    throw new Error(message);
  }
}

export type StudentQuery = {
  query?: string;
  level?: string | null;
  archived?: boolean;
  sort?: "name" | "recent" | "level" | "lastClass";
};

export type MaterialQuery = {
  query?: string;
  folderId?: number | null;
  favorites?: boolean;
  sort?: "name" | "recent" | "added" | "kind";
};

export const api = {
  dashboard: () => call<Dashboard>("dashboard"),
  backup: (dest: string) => call<void>("db_backup", { dest }),
  restore: (src: string) => call<void>("db_restore", { src }),

  students: (q: StudentQuery = {}) => call<Student[]>("students_list", q),
  student: (id: number) => call<Student>("student_get", { id }),
  saveStudent: (input: StudentInput) => call<number>("student_save", { input }),
  touchStudent: (id: number) => call<void>("student_touch", { id }),
  archiveStudent: (id: number, archived: boolean) =>
    call<void>("student_archive", { id, archived }),
  deleteStudent: (id: number) => call<void>("student_delete", { id }),

  notes: (q: { studentId?: number | null; query?: string; limit?: number } = {}) =>
    call<ClassNote[]>("notes_list", q),
  note: (id: number) => call<ClassNote>("note_get", { id }),
  saveNote: (input: NoteInput) => call<number>("note_save", { input }),
  deleteNote: (id: number) => call<void>("note_delete", { id }),

  materials: (q: MaterialQuery = {}) => call<Material[]>("materials_list", q),
  material: (id: number) => call<Material>("material_get", { id }),
  importMaterials: (paths: string[], folderId: number | null = null) =>
    call<ImportResult>("materials_import", { paths, folderId }),
  addLink: (url: string, name: string | null, folderId: number | null = null) =>
    call<number>("material_add_link", { url, name, folderId }),
  openMaterial: (id: number) => call<void>("material_open", { id }),
  revealMaterial: (id: number) => call<void>("material_reveal", { id }),
  renameMaterial: (id: number, name: string) => call<void>("material_rename", { id, name }),
  moveMaterial: (id: number, folderId: number | null) =>
    call<void>("material_move", { id, folderId }),
  favoriteMaterial: (id: number, favorite: boolean) =>
    call<void>("material_favorite", { id, favorite }),
  removeMaterial: (id: number) => call<void>("material_remove", { id }),
  relocateMaterial: (id: number, path: string) => call<void>("material_relocate", { id, path }),
  setMaterialTags: (id: number, tags: string[]) => call<void>("material_set_tags", { id, tags }),

  folders: () => call<Folder[]>("folders_list"),
  createFolder: (name: string) => call<number>("folder_create", { name }),
  renameFolder: (id: number, name: string) => call<void>("folder_rename", { id, name }),
  deleteFolder: (id: number) => call<void>("folder_delete", { id }),

  tags: () => call<string[]>("tags_list"),
  search: (query: string) => call<GlobalResults>("search_global", { query }),
};

/** Query keys. `all` is what every mutation invalidates — one source of truth. */
export const keys = {
  dashboard: ["dashboard"] as const,
  students: (q: StudentQuery = {}) => ["students", q] as const,
  student: (id: number) => ["student", id] as const,
  notes: (q: object = {}) => ["notes", q] as const,
  note: (id: number) => ["note", id] as const,
  materials: (q: MaterialQuery = {}) => ["materials", q] as const,
  folders: ["folders"] as const,
  tags: ["tags"] as const,
  search: (q: string) => ["search", q] as const,
};
