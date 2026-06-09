import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { z } from "zod";
import { MOL_WORLD_DIR } from "../config";
import { isValidPrimaryCategory, MOL_PRIMARY_CATEGORIES } from "../constants/molWorld";
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

function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
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

const SEED_MOLS: Omit<MolWorldFile, "uploader" | "createdAt" | "updatedAt">[] = [
  {
    id: "mw-seed-pro",
    schemaVersion: SCHEMA_VERSION,
    name: "职场沟通专家",
    summary: "偏正式、强调结构与边界。",
    primaryCategory: "职场沟通",
    taskTags: ["谈合作", "催进度", "维护边界", "表达感谢"],
    toneTags: ["专业", "有边界感"],
    relationshipTags: ["同事", "客户", "领导"],
    abilityTags: ["会润色", "会多步引导"],
    price: 0,
    popularityScore: 920,
    recommended: true,
    infoItems: [
      { id: "inf-d1", source: "custom", title: "沟通风格", body: "专业、简洁、高效，避免口语化表达" },
      { id: "inf-d2", source: "store", title: "常用开场白", body: "您好，关于XX事项，我想和您沟通一下…" },
    ],
  },
  {
    id: "mw-seed-social",
    schemaVersion: SCHEMA_VERSION,
    name: "朋友社交达人",
    summary: "偏亲和、延续日常话题。",
    primaryCategory: "朋友社交",
    taskTags: ["破冰", "延续聊天", "推进关系", "表达感谢"],
    toneTags: ["温和", "活泼"],
    relationshipTags: ["朋友"],
    abilityTags: ["会接话", "会润色"],
    price: 0,
    popularityScore: 780,
    recommended: true,
    infoItems: [],
  },
  {
    id: "mw-seed-warm",
    schemaVersion: SCHEMA_VERSION,
    name: "亲友表达助手",
    summary: "自然口语，适合家庭与密友。",
    primaryCategory: "家庭亲友",
    taskTags: ["安慰", "表达感谢", "邀约", "延续聊天"],
    toneTags: ["温和", "有边界感"],
    relationshipTags: ["家人", "朋友"],
    abilityTags: ["擅长安慰", "会接话"],
    price: 0,
    popularityScore: 750,
    recommended: true,
    infoItems: [],
  },
];

export class MolWorldService {
  private purgeUserRefs: (molWorldId: string) => void = () => {};

  attachPurgeHandler(fn: (molWorldId: string) => void): void {
    this.purgeUserRefs = fn;
  }

  seedIfEmpty(): void {
    let count = 0;
    for (const cat of MOL_PRIMARY_CATEGORIES) {
      const dir = path.join(MOL_WORLD_DIR, cat);
      if (!fs.existsSync(dir)) continue;
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.isFile() && ent.name.endsWith(".json") && !ent.name.startsWith(".")) count += 1;
      }
    }
    if (count > 0) return;
    const now = Date.now();
    const uploader = { userId: "__seed__", phoneMask: "----" };
    for (const row of SEED_MOLS) {
      const full: MolWorldFile = {
        ...row,
        price: 0,
        recommended: row.recommended ?? false,
        uploader,
        createdAt: now,
        updatedAt: now,
      };
      const fp = filePathFor(full.primaryCategory, full.id);
      atomicWriteJson(fp, full);
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
    return this.findFilePathById(molWorldId)?.record ?? null;
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
    const infoItems: MolWorldInfoItem[] = (data.initialInfo ?? []).map((row, i) => ({
      id: row.id?.trim() || `inf-${now}-${i}-${nanoid(6)}`,
      title: row.title,
      body: row.body,
      source: row.source ?? "custom",
      softRemoved: row.softRemoved,
    }));
    const record: MolWorldFile = {
      id,
      schemaVersion: SCHEMA_VERSION,
      name: data.name.trim(),
      summary: data.summary.trim(),
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
    if (p.infoItems !== undefined) next = { ...next, infoItems: p.infoItems };
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
