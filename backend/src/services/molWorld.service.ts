import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { z } from "zod";
import { MOL_WORLD_DIR } from "../config";
import { isValidPrimaryCategory, MOL_PRIMARY_CATEGORIES, type MolPrimaryCategory } from "../constants/molWorld";
import {
  PLACEHOLDER_MOL_SUMMARY,
  applyPersonaDefaults,
  defaultInfoItemsForMol,
  defaultSummaryForMol,
  needsPersonaBackfill,
} from "../constants/molPersonaDefaults";
import { logWarn } from "../logger";

const SCHEMA_VERSION = 1;
const MAX_UPLOADS_PER_USER = 20;

export type MolWorldInfoItem = {
  id: string;
  title: string;
  body: string;
  source?: "custom" | "store";
  softRemoved?: boolean;
};

export type MolWorldFile = {
  id: string;
  schemaVersion: number;
  name: string;
  summary: string;
  primaryCategory: string;
  taskTags: string[];
  toneTags: string[];
  relationshipTags: string[];
  abilityTags: string[];
  price: number;
  popularityScore: number;
  recommended: boolean;
  uploader: { userId: string; phoneMask: string };
  createdAt: number;
  updatedAt: number;
  infoItems: MolWorldInfoItem[];
};

const infoItemSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
  source: z.enum(["custom", "store"]).optional(),
  softRemoved: z.boolean().optional(),
});

const createBodySchema = z.object({
  name: z.string().min(1).max(120),
  summary: z.string().min(1).max(800),
  primaryCategory: z.string().min(1).max(32),
  taskTags: z.array(z.string().max(32)).max(24).optional(),
  toneTags: z.array(z.string().max(16)).max(24).optional(),
  relationshipTags: z.array(z.string().max(16)).max(24).optional(),
  abilityTags: z.array(z.string().max(24)).max(24).optional(),
  initialInfo: z
    .array(
      z.object({
        id: z.string().max(64).optional(),
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(8000),
        source: z.enum(["custom", "store"]).optional(),
        softRemoved: z.boolean().optional(),
      }),
    )
    .max(200)
    .optional(),
});

const patchBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  summary: z.string().min(1).max(800).optional(),
  primaryCategory: z.string().min(1).max(32).optional(),
  taskTags: z.array(z.string().max(32)).max(24).optional(),
  toneTags: z.array(z.string().max(16)).max(24).optional(),
  relationshipTags: z.array(z.string().max(16)).max(24).optional(),
  abilityTags: z.array(z.string().max(24)).max(24).optional(),
  infoItems: z.array(infoItemSchema).max(200).optional(),
});

export type CreateMolWorldInput = z.infer<typeof createBodySchema>;
export type PatchMolWorldInput = z.infer<typeof patchBodySchema>;

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}****${d.slice(-4)}`;
  return phone.slice(0, 6) + "****";
}

function filePathFor(category: string, id: string): string {
  return path.join(MOL_WORLD_DIR, category, `${id}.json`);
}

function ensureMolWorldDirs(): void {
  fs.mkdirSync(MOL_WORLD_DIR, { recursive: true });
  for (const cat of MOL_PRIMARY_CATEGORIES) {
    fs.mkdirSync(path.join(MOL_WORLD_DIR, cat), { recursive: true });
  }
}

function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${nanoid(12)}.json`);
  const json = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(tmp, json, "utf8");
  fs.renameSync(tmp, filePath);
}

function parseMolFile(raw: string, filePath: string): MolWorldFile | null {
  try {
    const v = JSON.parse(raw) as MolWorldFile;
    if (!v || typeof v !== "object") return null;
    if (typeof v.id !== "string" || typeof v.name !== "string") return null;
    if (!isValidPrimaryCategory(String(v.primaryCategory))) return null;
    return v as MolWorldFile;
  } catch {
    logWarn("mol_world.parse_failed", { filePath });
    return null;
  }
}

const SEED_MOL_DEFS: {
  id: string;
  name: string;
  primaryCategory: MolPrimaryCategory;
  taskTags: string[];
  toneTags: string[];
  relationshipTags: string[];
  abilityTags: string[];
  popularityScore: number;
  recommended: boolean;
  entertainmentEnabled?: boolean;
}[] = [
  {
    id: "mw-seed-age18",
    name: "我在18岁",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "邀约", "安慰", "破冰", "表达感谢"],
    toneTags: ["活泼", "温和"],
    relationshipTags: ["朋友", "同学"],
    abilityTags: ["会接话", "擅长安慰"],
    popularityScore: 810,
    recommended: true,
  },
  {
    id: "mw-seed-tsundere",
    name: "傲娇柔病",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "邀约", "安慰", "推进关系", "表达感谢"],
    toneTags: ["嘴硬", "温和"],
    relationshipTags: ["朋友", "暧昧中"],
    abilityTags: ["会接话", "会润色"],
    popularityScore: 795,
    recommended: true,
  },
  {
    id: "mw-seed-doubao",
    name: "豆包体",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "表达感谢", "邀约", "安慰"],
    toneTags: ["清楚", "温和"],
    relationshipTags: ["朋友", "暧昧中"],
    abilityTags: ["会接话", "会润色", "会多步引导"],
    popularityScore: 785,
    recommended: true,
  },
  {
    id: "mw-seed-baobao",
    name: "人家还是宝宝",
    primaryCategory: "朋友社交",
    taskTags: ["安慰", "延续聊天", "邀约", "表达感谢"],
    toneTags: ["软", "活泼"],
    relationshipTags: ["朋友", "暧昧中"],
    abilityTags: ["会接话", "擅长安慰"],
    popularityScore: 738,
    recommended: true,
  },
  {
    id: "mw-seed-chaoyou",
    name: "超级油腻",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "邀约", "破冰", "推进关系", "表达感谢"],
    toneTags: ["幽默", "活泼"],
    relationshipTags: ["朋友", "暧昧中"],
    abilityTags: ["会接话", "会润色"],
    popularityScore: 728,
    recommended: true,
  },
  {
    id: "mw-seed-haiwang",
    name: "我是海王",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "邀约", "推进关系", "安慰", "破冰"],
    toneTags: ["幽默", "轻松"],
    relationshipTags: ["朋友", "暧昧中"],
    abilityTags: ["会接话", "会润色"],
    popularityScore: 725,
    recommended: true,
  },
  {
    id: "mw-seed-bazong",
    name: "霸道总裁",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "邀约", "推进关系", "安慰", "维护边界"],
    toneTags: ["直接", "克制"],
    relationshipTags: ["朋友", "暧昧中", "恋人"],
    abilityTags: ["会接话", "会润色", "会多步引导"],
    popularityScore: 722,
    recommended: true,
  },
  {
    id: "mw-seed-wenrou",
    name: "温柔体贴",
    primaryCategory: "朋友社交",
    taskTags: ["安慰", "延续聊天", "表达感谢", "邀约", "维护边界"],
    toneTags: ["温和", "清楚"],
    relationshipTags: ["朋友", "恋人"],
    abilityTags: ["会接话", "擅长安慰", "会润色"],
    popularityScore: 718,
    recommended: true,
  },
  {
    id: "mw-seed-taigang",
    name: "国家一级抬杠运动员",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "破冰", "表达感谢", "维护边界", "邀约"],
    toneTags: ["幽默", "直接"],
    relationshipTags: ["朋友", "同学"],
    abilityTags: ["会接话", "会润色"],
    popularityScore: 715,
    recommended: true,
  },
  {
    id: "mw-seed-lianainao",
    name: "恋爱脑",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "邀约", "推进关系", "安慰", "表达感谢"],
    toneTags: ["温和", "活泼"],
    relationshipTags: ["朋友", "暧昧中", "恋人"],
    abilityTags: ["会接话", "会润色", "擅长安慰"],
    popularityScore: 712,
    recommended: true,
  },
  {
    id: "mw-seed-lianaijunshi",
    name: "恋爱军师",
    primaryCategory: "亲密关系",
    taskTags: ["延续聊天", "推进关系", "邀约", "安慰", "维护边界"],
    toneTags: ["清楚", "克制"],
    relationshipTags: ["暧昧中", "恋人", "朋友"],
    abilityTags: ["会接话", "会润色", "会多步引导"],
    popularityScore: 714,
    recommended: true,
    entertainmentEnabled: true,
  },
  {
    id: "mw-seed-dusheguimi",
    name: "毒舌闺蜜",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "安慰", "维护边界", "表达感谢", "破冰"],
    toneTags: ["幽默", "直接"],
    relationshipTags: ["朋友", "同学"],
    abilityTags: ["会接话", "会润色", "擅长安慰"],
    popularityScore: 710,
    recommended: true,
  },
  {
    id: "mw-seed-buhaore",
    name: "不好惹",
    primaryCategory: "朋友社交",
    taskTags: ["延续聊天", "维护边界", "拒绝", "玩笑"],
    toneTags: ["幽默", "直接"],
    relationshipTags: ["朋友", "同学"],
    abilityTags: ["会接话", "会润色"],
    popularityScore: 680,
    recommended: true,
  },
];

export function listSeedMolIds(): string[] {
  return SEED_MOL_DEFS.map((d) => d.id);
}

export function seedSuyanEntertainmentDefaults(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const def of SEED_MOL_DEFS) {
    if (!def.entertainmentEnabled) continue;
    out[def.id.replace(/^mw-seed-/, "")] = true;
  }
  return out;
}

function buildSeedMol(
  def: (typeof SEED_MOL_DEFS)[number],
  uploader: { userId: string; phoneMask: string },
  now: number,
): MolWorldFile {
  return {
    id: def.id,
    schemaVersion: SCHEMA_VERSION,
    name: def.name,
    summary: defaultSummaryForMol(def.id, def.primaryCategory),
    primaryCategory: def.primaryCategory,
    taskTags: def.taskTags,
    toneTags: def.toneTags,
    relationshipTags: def.relationshipTags,
    abilityTags: def.abilityTags,
    price: 0,
    popularityScore: def.popularityScore,
    recommended: def.recommended,
    uploader,
    createdAt: now,
    updatedAt: now,
    infoItems: defaultInfoItemsForMol(def.id, def.primaryCategory, now),
  };
}

function resolvePersonaOnCreate(
  molId: string,
  category: string,
  summaryRaw: string,
  initialInfo: MolWorldInfoItem[],
  now: number,
): { summary: string; infoItems: MolWorldInfoItem[] } {
  let summary = summaryRaw.trim();
  let infoItems = initialInfo;
  if (infoItems.length === 0) {
    infoItems = defaultInfoItemsForMol(molId, category, now);
  }
  if (!summary || summary === PLACEHOLDER_MOL_SUMMARY) {
    summary = defaultSummaryForMol(molId, category);
  }
  return { summary, infoItems };
}

export class MolWorldService {
  private purgeUserRefs: (molWorldId: string) => void = () => {};

  attachPurgeHandler(fn: (molWorldId: string) => void): void {
    this.purgeUserRefs = fn;
  }

  seedIfEmpty(): void {
    ensureMolWorldDirs();
    if (this.listAllRaw().length > 0) return;
    const now = Date.now();
    const uploader = { userId: "__seed__", phoneMask: "----" };
    for (const def of SEED_MOL_DEFS) {
      const full = buildSeedMol(def, uploader, now);
      const fp = filePathFor(full.primaryCategory, full.id);
      atomicWriteJson(fp, full);
    }
  }

  /** 补种 SEED 中尚未存在的素颜（不影响已有条目）。 */
  seedMissingMols(): void {
    ensureMolWorldDirs();
    const now = Date.now();
    const uploader = { userId: "__seed__", phoneMask: "----" };
    for (const def of SEED_MOL_DEFS) {
      if (this.findFilePathById(def.id)) continue;
      const full = buildSeedMol(def, uploader, now);
      atomicWriteJson(filePathFor(full.primaryCategory, full.id), full);
    }
  }

  /** 删除已下线的系统 seed 文件，并清理 user_mols 引用。 */
  purgeOrphanSeedFiles(): void {
    const allowed = new Set(SEED_MOL_DEFS.map((d) => d.id));
    for (const rec of this.listAllRaw()) {
      if (rec.uploader.userId !== "__seed__" || allowed.has(rec.id)) continue;
      const found = this.findFilePathById(rec.id);
      if (found) {
        try {
          fs.unlinkSync(found.filePath);
        } catch {
          /* ignore */
        }
      }
      this.purgeUserRefs(rec.id);
    }
  }

  /** 将 SEED 定义中的展示名与 catalog 标签同步到已有 seed JSON（不改 infoItems / summary）。 */
  syncSeedCatalogFromDefs(): void {
    const now = Date.now();
    for (const def of SEED_MOL_DEFS) {
      const found = this.findFilePathById(def.id);
      if (!found || found.record.uploader.userId !== "__seed__") continue;
      const rec = found.record;
      const tagsEq = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
      const changed =
        rec.name !== def.name ||
        rec.primaryCategory !== def.primaryCategory ||
        !tagsEq(rec.taskTags, def.taskTags) ||
        !tagsEq(rec.toneTags, def.toneTags) ||
        !tagsEq(rec.relationshipTags, def.relationshipTags) ||
        !tagsEq(rec.abilityTags, def.abilityTags) ||
        rec.popularityScore !== def.popularityScore ||
        rec.recommended !== def.recommended;
      if (!changed) continue;
      const next: MolWorldFile = {
        ...rec,
        name: def.name,
        primaryCategory: def.primaryCategory,
        taskTags: def.taskTags,
        toneTags: def.toneTags,
        relationshipTags: def.relationshipTags,
        abilityTags: def.abilityTags,
        popularityScore: def.popularityScore,
        recommended: def.recommended,
        updatedAt: now,
      };
      const fp = filePathFor(next.primaryCategory, next.id);
      if (fp !== found.filePath && fs.existsSync(fp)) continue;
      if (fp !== found.filePath) {
        atomicWriteJson(fp, next);
        try {
          fs.unlinkSync(found.filePath);
        } catch {
          /* ignore */
        }
      } else {
        atomicWriteJson(found.filePath, next);
      }
    }
  }

  /** 为资料为空的已有素颜补全默认信息集（仅本地文件）。 */
  backfillEmptyPersonas(): void {
    const touch = (filePath: string, record: MolWorldFile) => {
      const patched = applyPersonaDefaults(record);
      if (patched.summary === record.summary && patched.infoItems.length === record.infoItems.length) return;
      atomicWriteJson(filePath, { ...patched, updatedAt: Date.now() });
    };
    for (const rec of this.listAllRaw()) {
      const found = this.findFilePathById(rec.id);
      if (found) touch(found.filePath, rec);
    }
  }

  /** 从 settings 同步系统 seed 素颜的人格资料（仅 __seed__ 条目）。 */
  syncSeedPersonasFromSettings(): void {
    const now = Date.now();
    const allowed = new Set(SEED_MOL_DEFS.map((d) => d.id));
    for (const rec of this.listAllRaw()) {
      if (rec.uploader.userId !== "__seed__" || !allowed.has(rec.id)) continue;
      const found = this.findFilePathById(rec.id);
      if (!found) continue;
      let summary: string;
      let infoItems: MolWorldInfoItem[];
      try {
        summary = defaultSummaryForMol(rec.id, rec.primaryCategory);
        infoItems = defaultInfoItemsForMol(rec.id, rec.primaryCategory, now);
      } catch {
        continue;
      }
      const summarySame = rec.summary.trim() === summary.trim();
      const itemsSame =
        rec.infoItems.length === infoItems.length &&
        rec.infoItems.every((it, i) => it.title === infoItems[i]?.title && it.body === infoItems[i]?.body);
      if (summarySame && itemsSame) continue;
      atomicWriteJson(found.filePath, { ...rec, summary, infoItems, updatedAt: now });
    }
  }

  /** 从所有素颜文件移除标题为「示例」的信息项。 */
  stripExampleInfoItems(): void {
    const touch = (filePath: string, record: MolWorldFile) => {
      const nextItems = record.infoItems.filter((it) => it.title.trim() !== "示例");
      if (nextItems.length === record.infoItems.length) return;
      atomicWriteJson(filePath, { ...record, infoItems: nextItems, updatedAt: Date.now() });
    };
    for (const rec of this.listAllRaw()) {
      const found = this.findFilePathById(rec.id);
      if (found) touch(found.filePath, rec);
    }
  }

  countUploadsByUser(userId: string): number {
    let n = 0;
    for (const rec of this.listAllRaw()) {
      if (rec.uploader.userId === userId) n += 1;
    }
    return n;
  }

  listAllRaw(): MolWorldFile[] {
    const out: MolWorldFile[] = [];
    for (const cat of MOL_PRIMARY_CATEGORIES) {
      const dir = path.join(MOL_WORLD_DIR, cat);
      if (!fs.existsSync(dir)) continue;
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!ent.isFile() || !ent.name.endsWith(".json") || ent.name.startsWith(".")) continue;
        const fp = path.join(dir, ent.name);
        let raw: string;
        try {
          raw = fs.readFileSync(fp, "utf8");
        } catch {
          continue;
        }
        const parsed = parseMolFile(raw, fp);
        if (parsed) out.push(parsed);
      }
    }
    return out;
  }

  findFilePathById(molWorldId: string): { filePath: string; record: MolWorldFile } | null {
    for (const cat of MOL_PRIMARY_CATEGORIES) {
      const fp = filePathFor(cat, molWorldId);
      if (!fs.existsSync(fp)) continue;
      try {
        const raw = fs.readFileSync(fp, "utf8");
        const parsed = parseMolFile(raw, fp);
        if (parsed && parsed.id === molWorldId) return { filePath: fp, record: parsed };
      } catch {
        /* skip */
      }
    }
    return null;
  }

  getById(molWorldId: string): MolWorldFile | null {
    const found = this.findFilePathById(molWorldId);
    if (!found) return null;
    if (!needsPersonaBackfill(found.record.summary, found.record.infoItems)) {
      return found.record;
    }
    const patched = applyPersonaDefaults(found.record);
    atomicWriteJson(found.filePath, { ...patched, updatedAt: Date.now() });
    return patched;
  }

  create(uploaderUserId: string, uploaderPhone: string, body: unknown): MolWorldFile {
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new Error("INVALID_PARAMS");
    }
    const data = parsed.data;
    if (!isValidPrimaryCategory(data.primaryCategory)) {
      throw new Error("INVALID_CATEGORY");
    }
    if (this.countUploadsByUser(uploaderUserId) >= MAX_UPLOADS_PER_USER) {
      throw new Error("MOL_UPLOAD_LIMIT_EXCEEDED");
    }
    const id = `mw-${Date.now()}-${nanoid(8)}`;
    const now = Date.now();
    const infoItemsDraft: MolWorldInfoItem[] = (data.initialInfo ?? []).map((row, i) => ({
      id: row.id?.trim() || `inf-${now}-${i}-${nanoid(6)}`,
      title: row.title,
      body: row.body,
      source: row.source ?? "custom",
      softRemoved: row.softRemoved,
    }));
    const { summary, infoItems } = resolvePersonaOnCreate(id, data.primaryCategory, data.summary, infoItemsDraft, now);
    const record: MolWorldFile = {
      id,
      schemaVersion: SCHEMA_VERSION,
      name: data.name.trim(),
      summary,
      primaryCategory: data.primaryCategory,
      taskTags: data.taskTags ?? [],
      toneTags: data.toneTags ?? [],
      relationshipTags: data.relationshipTags ?? [],
      abilityTags: data.abilityTags ?? [],
      price: 0,
      popularityScore: 0,
      recommended: false,
      uploader: { userId: uploaderUserId, phoneMask: maskPhone(uploaderPhone) },
      createdAt: now,
      updatedAt: now,
      infoItems,
    };
    const fp = filePathFor(record.primaryCategory, id);
    atomicWriteJson(fp, record);
    return record;
  }

  updateById(molWorldId: string, uploaderUserId: string, body: unknown): MolWorldFile {
    const found = this.findFilePathById(molWorldId);
    if (!found) throw new Error("NOT_FOUND");
    const { filePath, record } = found;
    if (record.uploader.userId !== uploaderUserId) throw new Error("FORBIDDEN");
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) throw new Error("INVALID_PARAMS");
    const p = parsed.data;
    let next: MolWorldFile = { ...record, updatedAt: Date.now() };
    if (p.name !== undefined) next = { ...next, name: p.name.trim() };
    if (p.summary !== undefined) next = { ...next, summary: p.summary.trim() };
    if (p.taskTags !== undefined) next = { ...next, taskTags: p.taskTags };
    if (p.toneTags !== undefined) next = { ...next, toneTags: p.toneTags };
    if (p.relationshipTags !== undefined) next = { ...next, relationshipTags: p.relationshipTags };
    if (p.abilityTags !== undefined) next = { ...next, abilityTags: p.abilityTags };
    if (p.infoItems !== undefined) {
      const allowedIds = new Set(record.infoItems.map((it) => it.id));
      if (p.infoItems.some((it) => !allowedIds.has(it.id))) {
        throw new Error("INFO_ITEM_ADD_FORBIDDEN");
      }
      next = { ...next, infoItems: p.infoItems };
    }
    if (p.primaryCategory !== undefined) {
      if (!isValidPrimaryCategory(p.primaryCategory.trim())) throw new Error("INVALID_CATEGORY");
      next = { ...next, primaryCategory: p.primaryCategory.trim() };
    }
    next = {
      ...next,
      price: 0,
      popularityScore: record.popularityScore,
      recommended: record.recommended,
    };
    const newPath = filePathFor(next.primaryCategory, molWorldId);
    if (newPath !== filePath && fs.existsSync(newPath)) {
      throw new Error("INVALID_PARAMS");
    }
    if (newPath !== filePath) {
      atomicWriteJson(newPath, next);
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    } else {
      atomicWriteJson(filePath, next);
    }
    return next;
  }

  deleteById(molWorldId: string, uploaderUserId: string): void {
    const found = this.findFilePathById(molWorldId);
    if (!found) throw new Error("NOT_FOUND");
    if (found.record.uploader.userId !== uploaderUserId) throw new Error("FORBIDDEN");
    try {
      fs.unlinkSync(found.filePath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    this.purgeUserRefs(molWorldId);
  }
}

export { createBodySchema, patchBodySchema };
