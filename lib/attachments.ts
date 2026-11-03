// Files kept with a record (2026-11-03, 1.0.80.2): a PDF, a document, a
// spreadsheet or anything else somebody attaches to a Capture note, opened
// in whichever app on the device reads that kind of file. Every rule and
// sentence is here, with no imports, so scripts/test_attachments.js can
// check it without a phone; lib/attachmentsDb.ts reads and writes.
//
// WHY A TABLE OF ITS OWN AND NOT THE PHOTO LAYER. The media table is built
// around images: a width, a height, a thumbnail and a JPEG or GIF type, and
// every screen that reads it draws a picture. A file has none of those. The
// shape is the same one media uses, though, an owner kind and an owner id,
// so a lab letter on an appointment or a manual on a piece of equipment
// can be attached later without another table.
//
// WHERE A FILE LIVES. On the device it was attached on, under
// Paths.document/attachments, named by a random id; the name the person
// sees lives only in the row. With sync on, an encrypted copy goes into
// the Files folder under the shared folder, beside Photos and Recordings,
// and the other device fetches it. Every file stays on every device that
// has it: unlike photos and recordings there is no cache clearing yet,
// since a file attached to a note is usually small and is wanted where the
// note is.
//
// ENCRYPTED, unlike a recording. A PDF on a note can as easily be a lab
// result or an insurance letter as a recipe, so its copy in the folder is
// sealed with the sync password the way a photo is.

// WHICH RECORDS TAKE FILES (1.0.80.4). Eighteen kinds, each named the way
// the media table names the same owner where it already has photos, so a
// record's photos and files sit under one owner and go together when the
// record is deleted (removePhotosOf in lib/mediaDb.ts clears both). Each
// place keeps only the kinds of file that belong there: a receipt is a PDF
// or a photo, never a song, while a Capture note, a project or an interest
// takes anything. A file that does not suit the place is turned away after
// it is picked, with a sentence naming what the place takes, since the
// system picker filters by one type and most places take several.
export type AttachmentOwnerKind =
  | 'capture_note'
  | 'appointment'
  | 'treatment'
  | 'lab_draw'
  | 'medical_bill'
  | 'insurance_plan'
  | 'emergency_card'
  | 'money_entry'
  | 'upkeep'
  | 'item'
  | 'work_benefit'
  | 'project'
  | 'family_member'
  | 'equipment'
  | 'garden_area'
  | 'seed_stock'
  | 'interest'
  | 'library_entry';

/** What a file is, in the terms a place keeps it by. */
export type AttachmentFamily =
  | 'pdf'
  | 'image'
  | 'document'
  | 'spreadsheet'
  | 'slides'
  | 'text'
  | 'audio'
  | 'video'
  | 'book'
  | 'contact'
  | 'zip'
  | 'data'
  | 'other';

export type AttachmentPlace = {
  /** The families this place keeps, or 'any'. */
  accepts: readonly AttachmentFamily[] | 'any';
  /** What the place takes, said when a file is turned away. */
  takes: string;
  /** What removing one file does, named for this place. */
  removal: string;
};

export const ATTACHMENT_PLACES: Readonly<Record<AttachmentOwnerKind, AttachmentPlace>> = {
  capture_note: {
    accepts: 'any',
    takes: 'A Capture note takes any kind of file.',
    removal: '{name} goes from this note, from this device and from the Files folder in your shared folder. The note stays.',
  },
  appointment: {
    accepts: ['pdf', 'image', 'document', 'text'],
    takes: 'An appointment takes a PDF, a photo or scan, a document or a text file: a referral, a visit summary, a form to bring.',
    removal: '{name} goes from this appointment, from this device and from the Files folder in your shared folder. The appointment stays.',
  },
  treatment: {
    accepts: ['pdf', 'image', 'document', 'text'],
    takes: 'A med takes a PDF, a photo or scan, a document or a text file: the leaflet, the prescription, a pharmacy printout.',
    removal: '{name} goes from this med, from this device and from the Files folder in your shared folder. The med stays.',
  },
  lab_draw: {
    accepts: ['pdf', 'image', 'document', 'spreadsheet', 'text'],
    takes: "Lab results take a PDF, a photo or scan, a document, a spreadsheet or a text file: the lab's report, or a download from a patient portal.",
    removal: '{name} goes from the results drawn that day, from this device and from the Files folder in your shared folder. The results stay.',
  },
  medical_bill: {
    accepts: ['pdf', 'image', 'document', 'spreadsheet'],
    takes: 'A medical bill takes a PDF, a photo or scan, a document or a spreadsheet: the bill, the explanation of benefits, a receipt.',
    removal: '{name} goes from this bill, from this device and from the Files folder in your shared folder. The bill stays.',
  },
  insurance_plan: {
    accepts: ['pdf', 'image', 'document'],
    takes: 'An insurance plan takes a PDF, a photo or scan, or a document: the card, the summary of benefits, a letter.',
    removal: '{name} goes from this plan, from this device and from the Files folder in your shared folder. The plan stays.',
  },
  emergency_card: {
    accepts: ['pdf', 'image', 'document'],
    takes: 'The emergency card takes a PDF, a photo or scan, or a document: an advance directive, a list of medications, a scan of an insurance card.',
    removal: '{name} goes from the emergency card, from this device and from the Files folder in your shared folder. The card stays.',
  },
  money_entry: {
    accepts: ['pdf', 'image', 'document', 'spreadsheet'],
    takes: 'A money entry takes a PDF, a photo or scan, a document or a spreadsheet: a receipt, an invoice, a statement.',
    removal: '{name} goes from this entry, from this device and from the Files folder in your shared folder. The entry stays.',
  },
  upkeep: {
    accepts: ['pdf', 'image', 'document', 'video'],
    takes: 'An upkeep item takes a PDF, a photo or scan, a document or a video: the manual, the warranty, a receipt, a how-to video.',
    removal: '{name} goes from this upkeep item, from this device and from the Files folder in your shared folder. The item stays.',
  },
  item: {
    accepts: ['pdf', 'image', 'document'],
    takes: 'A kitchen item takes a PDF, a photo or scan, or a document: a manual, a warranty, a receipt.',
    removal: '{name} goes from this kitchen item, from this device and from the Files folder in your shared folder. The item stays.',
  },
  work_benefit: {
    accepts: ['pdf', 'image', 'document', 'spreadsheet'],
    takes: 'A benefit takes a PDF, a photo or scan, a document or a spreadsheet: the plan summary, a statement, a claim form.',
    removal: '{name} goes from this benefit, from this device and from the Files folder in your shared folder. The benefit stays.',
  },
  project: {
    accepts: 'any',
    takes: 'A project takes any kind of file.',
    removal: '{name} goes from this project, from this device and from the Files folder in your shared folder. The project stays.',
  },
  family_member: {
    accepts: ['pdf', 'image', 'document', 'text', 'audio', 'video', 'contact'],
    takes: 'A family member takes a PDF, a photo or scan, a document, a text file, a recording, a video or a contact card: records, letters, a voice worth keeping.',
    removal: '{name} goes from this family member, from this device and from the Files folder in your shared folder. Their record stays.',
  },
  equipment: {
    accepts: ['pdf', 'image', 'document', 'video'],
    takes: 'A piece of equipment takes a PDF, a photo or scan, a document or a video: the manual, the warranty, a receipt, a setup video.',
    removal: '{name} goes from this equipment, from this device and from the Files folder in your shared folder. The equipment stays.',
  },
  garden_area: {
    accepts: ['pdf', 'image', 'document', 'spreadsheet'],
    takes: 'A garden area takes a PDF, a photo or scan, a document or a spreadsheet: a soil test, a plan of the beds, a planting list.',
    removal: '{name} goes from this area, from this device and from the Files folder in your shared folder. The area stays.',
  },
  seed_stock: {
    accepts: ['pdf', 'image', 'document'],
    takes: 'Seeds take a PDF, a photo or scan, or a document: the packet, a catalog page, growing notes.',
    removal: '{name} goes from these seeds, from this device and from the Files folder in your shared folder. The seeds stay.',
  },
  interest: {
    accepts: 'any',
    takes: 'An interest takes any kind of file.',
    removal: '{name} goes from this interest, from this device and from the Files folder in your shared folder. The interest stays.',
  },
  library_entry: {
    accepts: ['pdf', 'image', 'document', 'text', 'audio', 'video', 'book'],
    takes: 'A library entry takes a PDF, a photo or scan, a document, a text file, a recording, a video or a book file.',
    removal: '{name} goes from this library entry, from this device and from the Files folder in your shared folder. The entry stays.',
  },
};

const FAMILY_BY_TYPE: Readonly<Record<string, AttachmentFamily>> = {
  'application/pdf': 'pdf',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.oasis.opendocument.text': 'document',
  'application/rtf': 'document',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.oasis.opendocument.spreadsheet': 'spreadsheet',
  'text/csv': 'spreadsheet',
  'application/vnd.ms-powerpoint': 'slides',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'slides',
  'application/vnd.oasis.opendocument.presentation': 'slides',
  'application/epub+zip': 'book',
  'application/zip': 'zip',
  'text/vcard': 'contact',
  'text/x-vcard': 'contact',
  'application/json': 'data',
};

/** Which family a file belongs to, from its type. */
export function attachmentFamily(mimeType: string): AttachmentFamily {
  const type = mimeType.toLowerCase();
  const known = FAMILY_BY_TYPE[type];
  if (known) return known;
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('text/')) return 'text';
  return 'other';
}

/** Whether a place keeps a file of this type. */
export function attachmentSuits(ownerKind: AttachmentOwnerKind, mimeType: string): boolean {
  const accepts = ATTACHMENT_PLACES[ownerKind].accepts;
  return accepts === 'any' || accepts.includes(attachmentFamily(mimeType));
}

export type Attachment = {
  id: string;
  ownerKind: AttachmentOwnerKind;
  ownerId: string;
  /** What the person sees: the picked file's own name. */
  name: string;
  /** The file's name here and in the folder, made from the id. */
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

/** The folder under the shared folder that holds every attached file. */
export const FILES_FOLDER_NAME = 'Files';

/** The largest file attached. The copy is sealed whole in memory, which a
 *  phone does comfortably at this size and not much past it. */
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export const ATTACHMENT_NAME_MAX = 120;

const ID_PREFIX = 'att_';

/** The kinds people attach most, by extension, so a file another app hands
 *  over with no type still opens in the right viewer. Anything else is kept
 *  too, as a plain file. */
export const ATTACHMENT_TYPES: Readonly<Record<string, string>> = {
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  epub: 'application/epub+zip',
  gif: 'image/gif',
  heic: 'image/heic',
  htm: 'text/html',
  html: 'text/html',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  m4a: 'audio/mp4',
  md: 'text/markdown',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  odp: 'application/vnd.oasis.opendocument.presentation',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odt: 'application/vnd.oasis.opendocument.text',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  rtf: 'application/rtf',
  txt: 'text/plain',
  vcf: 'text/vcard',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
};

/** How a kind of file is named in the caption under it. */
const KIND_LABELS: Readonly<Record<string, string>> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document',
  'application/vnd.oasis.opendocument.text': 'Document',
  'application/rtf': 'Document',
  'application/vnd.ms-excel': 'Spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Spreadsheet',
  'application/vnd.oasis.opendocument.spreadsheet': 'Spreadsheet',
  'text/csv': 'Spreadsheet',
  'application/vnd.ms-powerpoint': 'Slides',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'Slides',
  'application/vnd.oasis.opendocument.presentation': 'Slides',
  'application/epub+zip': 'Book',
  'application/zip': 'Zip file',
  'text/vcard': 'Contact card',
  'text/plain': 'Text',
  'text/markdown': 'Text',
  'text/html': 'Web page',
  'application/json': 'Data file',
};

export function newAttachmentId(now: number, random: string): string {
  return `${ID_PREFIX}${now}_${random.replace(/[^a-z0-9]/gi, '').slice(0, 8)}`;
}

/** The extension of a file name, lower case, or null when it has none. */
export function attachmentExtension(name: string): string | null {
  const match = /\.([a-zA-Z0-9]{1,5})$/.exec(name.trim());
  return match ? match[1].toLowerCase() : null;
}

/** The extension for a file whose name carries none, from its type. */
export function extensionForType(mimeType: string | null | undefined): string | null {
  const type = (mimeType ?? '').toLowerCase().split(';')[0].trim();
  if (!type) return null;
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'text/html') return 'html';
  const found = Object.keys(ATTACHMENT_TYPES).find((ext) => ATTACHMENT_TYPES[ext] === type);
  return found ?? null;
}

/**
 * The type a file is opened as: what the picker said when it said
 * something specific, otherwise what its extension means, otherwise a
 * plain file.
 */
export function attachmentMimeType(name: string, pickedType: string | null | undefined): string {
  const type = (pickedType ?? '').toLowerCase().split(';')[0].trim();
  if (type && type !== 'application/octet-stream' && /^[a-z]+\/[a-z0-9.+-]+$/.test(type)) return type;
  const ext = attachmentExtension(name);
  return (ext && ATTACHMENT_TYPES[ext]) || 'application/octet-stream';
}

/** The file's name here and in the folder. The extension is kept so a
 *  viewer that goes by it opens the right way. */
export function attachmentFileName(id: string, ext: string | null): string {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExt = ext && /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'bin';
  return `${safeId}.${safeExt}`;
}

/** Whether a file in the attachments folder here is one this app made. */
export function isAttachmentFileName(name: string): boolean {
  return /^att_[a-zA-Z0-9_-]+\.[a-z0-9]{1,5}$/.test(name);
}

/** The name of a file's encrypted copy in the Files folder. */
export function attachmentCopyName(id: string): string {
  return `${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
}

/** The id an encrypted copy's name carries, or null for a file this app
 *  did not put there, which is left alone. */
export function idFromAttachmentCopyName(name: string): string | null {
  const match = /^(att_[a-zA-Z0-9_-]+)\.json$/.exec(name);
  return match ? match[1] : null;
}

/** The name shown for a picked file: its own, trimmed, or a plain word
 *  when another app handed it over with none. */
export function attachmentDisplayName(pickedName: string | null | undefined, ext: string | null): string {
  const trimmed = (pickedName ?? '').replace(/\s+/g, ' ').trim();
  if (trimmed.length > 0) {
    if (trimmed.length <= ATTACHMENT_NAME_MAX) return trimmed;
    const tail = ext ? `.${ext}` : '';
    return trimmed.slice(0, ATTACHMENT_NAME_MAX - tail.length).trimEnd() + tail;
  }
  return ext ? `File.${ext}` : 'File';
}

/** A name safe to give the copy handed to a viewer, so the viewer's title
 *  reads the way the person named it rather than as an id. */
export function openingFileName(name: string, fileName: string): string {
  const ext = attachmentExtension(fileName);
  let base = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (ext && attachmentExtension(base) !== ext) base = `${base}.${ext}`;
  if (!base || base === `.${ext}`) return fileName;
  return base.slice(0, 150);
}

/** What stops a picked file from being attached, or null. */
export function attachmentProblem(sizeBytes: number | null): string | null {
  if (sizeBytes === 0) return 'That file is empty.';
  if (sizeBytes !== null && sizeBytes > ATTACHMENT_MAX_BYTES) {
    return `That file is larger than ${Math.round(ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB, the most one attached file can be.`;
  }
  return null;
}

/** Oldest first, the order they were attached in. */
export function sortAttachments(items: readonly Attachment[]): Attachment[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export type AttachmentSyncPlan = {
  /** Ids whose file is here and whose copy is not in the folder. */
  upload: string[];
  /** Ids whose copy is in the folder and whose file is not here. */
  download: string[];
  /** Ids neither here nor in the folder yet. */
  waiting: string[];
  /** Ids whose copy is confirmed in the folder. */
  inFolder: string[];
  /** Copies in the folder that no row refers to. */
  clearFromFolder: string[];
};

/**
 * What a pass does. A copy nobody refers to is cleared from the folder
 * only when this device saved last, the rule photos and recordings follow,
 * since only then does every row anybody kept appear here.
 */
export function planAttachmentSync(input: {
  rows: readonly Pick<Attachment, 'id' | 'fileName'>[];
  localFileNames: readonly string[];
  folderNames: readonly string[];
  mayClearFolder: boolean;
}): AttachmentSyncPlan {
  const local = new Set(input.localFileNames);
  const folderIds = new Set<string>();
  for (const name of input.folderNames) {
    const id = idFromAttachmentCopyName(name);
    if (id) folderIds.add(id);
  }
  const rowIds = new Set(input.rows.map((row) => row.id));
  const upload: string[] = [];
  const download: string[] = [];
  const waiting: string[] = [];
  const inFolder: string[] = [];
  for (const row of input.rows) {
    const here = local.has(row.fileName);
    const there = folderIds.has(row.id);
    if (there) inFolder.push(row.id);
    if (here && !there) upload.push(row.id);
    else if (!here && there) download.push(row.id);
    else if (!here && !there) waiting.push(row.id);
  }
  const clearFromFolder = input.mayClearFolder ? [...folderIds].filter((id) => !rowIds.has(id)).sort() : [];
  return {
    upload: upload.sort(),
    download: download.sort(),
    waiting: waiting.sort(),
    inFolder: inFolder.sort(),
    clearFromFolder,
  };
}

/** Local files in the attachments folder that no row names. */
export function orphanedAttachmentFiles(rowFileNames: readonly string[], localFileNames: readonly string[]): string[] {
  const kept = new Set(rowFileNames);
  return localFileNames.filter((name) => isAttachmentFileName(name) && !kept.has(name)).sort();
}

export function attachmentSizeLabel(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return mb < 100 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

/** The kind of file in words: PDF, Spreadsheet, Image, or the extension. */
/**
 * Puts a sentence into the reader's language. The screen passes t from
 * lib/i18n; left out, the English is filled in as it stands, which keeps this
 * file free of imports so scripts/test_attachments.js runs it in plain node.
 */
export type AttachmentWords = (text: string, values?: Record<string, string>) => string;

const asWritten: AttachmentWords = (text, values) =>
  text.replace(/\{(\w+)\}/g, (whole, key: string) => values?.[key] ?? whole);

export function attachmentKindLabel(item: Pick<Attachment, 'mimeType' | 'fileName'>, words: AttachmentWords = asWritten): string {
  const known = KIND_LABELS[item.mimeType];
  if (known) return words(known);
  if (item.mimeType.startsWith('image/')) return words('Image');
  if (item.mimeType.startsWith('audio/')) return words('Audio');
  if (item.mimeType.startsWith('video/')) return words('Video');
  const ext = attachmentExtension(item.fileName);
  return ext && ext !== 'bin' ? words('{ext} file', { ext: ext.toUpperCase() }) : words('File');
}

/** The caption under a file: what kind, how big, and whether it is here. */
export function attachmentCaption(
  item: Pick<Attachment, 'mimeType' | 'fileName' | 'sizeBytes'>,
  here: boolean,
  words: AttachmentWords = asWritten,
): string {
  const size = attachmentSizeLabel(item.sizeBytes);
  const label = attachmentKindLabel(item, words);
  const kind = size ? `${label}, ${size}` : label;
  return here ? kind : words('{kind}. On the way from your other device.', { kind });
}

export const ATTACHMENT_ON_THE_WAY =
  'This file has not arrived from your other device yet. It comes across through the Files folder once both devices have synced.';

export const ATTACHMENT_NO_VIEWER = 'No app on this device offered to open that kind of file.';

export function attachmentRemovalSentence(
  name: string,
  words: AttachmentWords = asWritten,
  ownerKind: AttachmentOwnerKind = 'capture_note',
): string {
  return words(ATTACHMENT_PLACES[ownerKind].removal, { name });
}

/**
 * Why a picked file is not kept in this place, or null when it is. Names
 * the kind of file it was and what the place takes, so the person knows
 * what to pick instead.
 */
export function attachmentTypeProblem(
  ownerKind: AttachmentOwnerKind,
  item: Pick<Attachment, 'mimeType' | 'fileName'>,
  words: AttachmentWords = asWritten,
): string | null {
  if (attachmentSuits(ownerKind, item.mimeType)) return null;
  const kind = attachmentKindLabel(item, words);
  return `${words('That file ({kind}) is not a kind kept here.', { kind })} ${words(ATTACHMENT_PLACES[ownerKind].takes)}`;
}
