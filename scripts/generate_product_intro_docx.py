"""Generate AIChat product introduction Word document."""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "AIChat产品介绍.docx"


def set_doc_font(doc: Document) -> None:
    style = doc.styles["Normal"]
    style.font.name = "Microsoft YaHei"
    style.font.size = Pt(11)
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")


def add_title(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(22)
    run.font.color.rgb = RGBColor(0x1A, 0x1A, 0x2E)


def add_subtitle(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)


def add_heading(doc: Document, text: str, level: int = 1) -> None:
    doc.add_heading(text, level=level)


def add_para(doc: Document, text: str, bold: bool = False) -> None:
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold


def add_bullets(doc: Document, items: list[str]) -> None:
    for item in items:
        doc.add_paragraph(item, style="List Bullet")


def add_table(doc: Document, headers: list[str], rows: list[list[str]]) -> None:
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = h
        for p in hdr[i].paragraphs:
            for r in p.runs:
                r.bold = True
    for ri, row in enumerate(rows):
        cells = table.rows[ri + 1].cells
        for ci, val in enumerate(row):
            cells[ci].text = val
    doc.add_paragraph()


def build() -> None:
    doc = Document()
    set_doc_font(doc)

    for section in doc.sections:
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(2.8)
        section.right_margin = Cm(2.8)

    add_title(doc, "AIChat 产品介绍")
    add_subtitle(doc, "功能概览 · 使用场景 · 产品价值")
    doc.add_paragraph()

    add_para(
        doc,
        "文档版本：2026 年 6 月　|　适用平台：Android（V1）",
    )
    doc.add_paragraph()

    # 1
    add_heading(doc, "一、产品定位", 1)
    add_para(
        doc,
        "AIChat 是一款面向年轻用户的 AI 社交娱乐应用。产品以「和真人聊天」为核心，"
        "通过 AI 辅助表达、被动展示与群聊护场三类能力，帮助用户在真实社交关系中"
        "更从容地沟通、被了解，并在复杂多人场景中降低摩擦。",
    )
    add_para(doc, "产品 Slogan 可概括为：", bold=True)
    add_bullets(
        doc,
        [
            "和真人聊，不被话术卡住——你发最后一条，AI 只帮你想。",
            "不发朋友圈，也能让熟人按问题来了解你。",
            "关键对话有人帮盯场，娱乐感与边界感并存。",
        ],
    )
    add_para(doc, "三大 AI 能力并列且体系独立：", bold=True)
    add_table(
        doc,
        ["能力", "方向", "一句话说明"],
        [
            ["素颜辅助聊天", "向内 · 练表达", "与真人私聊时，切换表达人格，获取回复建议后再自行发送"],
            ["朋友圈被动探索", "向外 · 挂资料", "维护个人展示条目，供熟人带着问题来探索，而非刷屏发动态"],
            ["搭子护场群聊", "在场 · 护边界", "真人 + AI 搭子混合群聊，按场景主动接话、调解与风险提示"],
        ],
    )

    # 2
    add_heading(doc, "二、目标用户与典型场景", 1)
    add_para(doc, "产品主要服务 30 岁以下、有真实社交关系、但在表达与边界上常感吃力的年轻用户。")
    add_table(
        doc,
        ["用户画像", "常见痛点", "AIChat 如何回应"],
        [
            ["社交活跃用户", "和熟人/暧昧对象聊天时不知如何措辞", "素颜切换不同表达人格，生成 2–3 条建议话术供选择"],
            ["不爱发朋友圈的人", "不愿刷屏，又希望被了解观点与偏好", "「我的日常」被动展示 + 好友「探索」问答"],
            ["多人协商参与者", "装修、采购、恋爱、亲子等群聊易升级", "邀请场景化搭子进群，按人设护场、给台阶"],
            ["表达风格多样者", "对不同对象需要不同语气与边界", "自建或从素颜世界加入多个人格，按会话切换"],
        ],
    )
    add_para(doc, "典型使用场景包括：恋爱暧昧、校园师生、亲子沟通、科学育儿、居家装修、大件采购、店铺经营等。")

    # 3
    add_heading(doc, "三、主导航与功能模块", 1)
    add_para(doc, "登录后进入五 Tab 主导航，覆盖消息、群聊、朋友圈、人物与账号管理。")
    add_table(
        doc,
        ["Tab", "名称", "核心功能"],
        [
            ["消息", "私聊", "联系人会话列表，进入一对一实时聊天，支持素颜建议辅助"],
            ["群聊", "搭子群", "查看/创建护场群，进入搭子大厅挑选 AI 角色"],
            ["朋友圈", "探索与展示", "探索好友、我的日常、热点话题与探索记录"],
            ["人物", "关系与 AI 入口", "好友请求、联系人、我的素颜、搭子大厅"],
            ["我的", "账号", "昵称与头像（含 AI 生成）、注销账号、退出登录"],
        ],
    )

    add_heading(doc, "3.1 消息 · 私聊与素颜辅助", 2)
    add_bullets(
        doc,
        [
            "基于互为联系人的一对一聊天，消息通过 WebSocket 实时收发。",
            "每个会话可独立切换当前「素颜」（表达人格），选择会被记住。",
            "输入栏旁可打开素颜建议面板：基于最近对话与当前草稿，生成最多 3 条回复建议。",
            "选中建议后直接发送——AI 不自动代发，最终发送权始终在用户手中。",
            "可从聊天页跳转「我的素颜」或「素颜信息管理」，补充资料条目以提升建议质量。",
        ],
    )
    add_para(doc, "使用价值：降低「想回但不知道怎么写」的心理门槛，同时保持真实社交中的主动性与分寸感。")

    add_heading(doc, "3.2 素颜 · 表达人格体系", 2)
    add_para(
        doc,
        "「素颜」是产品的核心概念，意为卸下伪装、放肆表达自我。"
        "每个素颜代表一套表达风格与话术样例，可在不同聊天对象间切换。",
    )
    add_table(
        doc,
        ["子模块", "功能说明"],
        [
            ["我的素颜", "管理已拥有的素颜列表；可快速新建（素颜-1、素颜-2…），上限 6 个"],
            ["素颜资料", "维护对话样例与约束规则，作为 AI 生成建议的参考依据"],
            ["素颜信息管理", "编辑名称、场景分类、信息条目（标题 + 描述）"],
            ["素颜世界", "浏览、搜索、筛选他人发布的素颜模板，一键加入「我的素颜」"],
        ],
    )
    add_para(doc, "来源分为两类：自己创建（可完整编辑）与来自素颜世界（按来源规则只读或可编辑）。")
    add_para(doc, "使用价值：把「怎么说」沉淀为可切换、可训练、可分享的人格资产，越用越贴合个人表达习惯。")

    add_heading(doc, "3.3 朋友圈 · 被动展示与探索", 2)
    add_bullets(
        doc,
        [
            "我的日常：主人维护被动展示条目（观点、偏好、事实类信息），供熟人探索时引用。",
            "探索好友：选择联系人，基于对方已授权展示的资料进行 AI 问答式探索。",
            "热点：聚合微博、知乎、抖音等平台热搜，生成话题供主人补全动态，降低「不知道写什么」的启动成本。",
            "探索记录：按日分组保存探索对话，可回看并继续。",
        ],
    )
    add_para(doc, "合规边界：探索可见范围限于本人已填写或已授权的内容；AI 不得代表用户给出未授权的态度或现场答复。")
    add_para(doc, "使用价值：解决「不爱发朋友圈又希望被了解」的矛盾，让了解发生在有问题的对话里，而非无效刷动态。")

    add_heading(doc, "3.4 群聊 · 搭子护场", 2)
    add_bullets(
        doc,
        [
            "支持 2 位及以上真人 + 最多 3 位 AI 搭子的混合群聊（群总人数上限 20）。",
            "创建时可选择用途（如恋爱暧昧、科学育儿、大件采购等），系统推荐同场景搭子。",
            "搭子按角色人设主动接话：可中立疏导、协调气氛，或在特定场景下有明确倾向（如护短、点破套路）。",
            "群主可查看风险提示等 owner hints，辅助判断对话走向。",
        ],
    )
    add_para(doc, "搭子与素颜分属两套独立 catalog，前者服务群聊护场，后者服务私聊表达，互不混用。")
    add_para(doc, "使用价值：把「需要第三方在场」的社交场景产品化，在娱乐感中提供边界感与安全感。")

    add_heading(doc, "3.5 人物 · 关系管理", 2)
    add_bullets(
        doc,
        [
            "通过手机号发起好友请求，对方接受后成为联系人。",
            "统一入口管理：好友请求、联系人列表、我的素颜、搭子大厅。",
            "支持搜索联系人，从人物页直接进入私聊。",
        ],
    )

    add_heading(doc, "3.6 我的 · 账号与个人资料", 2)
    add_bullets(
        doc,
        [
            "短信验证码登录，首次登录即完成注册。",
            "编辑昵称，上传相册头像或使用 AI 根据文字描述生成头像。",
            "支持短信验证后注销账号。",
        ],
    )

    # 4
    add_heading(doc, "四、典型使用流程", 1)

    add_heading(doc, "流程 1：新用户开始私聊", 2)
    add_bullets(
        doc,
        [
            "短信登录 → 进入「人物」Tab → 添加好友（输入手机号与验证消息）。",
            "对方接受后，「消息」Tab 出现会话 → 点击进入私聊。",
        ],
    )

    add_heading(doc, "流程 2：用素颜辅助回复", 2)
    add_bullets(
        doc,
        [
            "确保已在「人物 → 我的素颜」中添加至少一个素颜。",
            "进入私聊 → 切换当前素颜（右上角菜单）→ 输入草稿或打开建议面板。",
            "从 2–3 条建议中选择一条 → 确认后发送。",
            "（可选）进入素颜信息管理，补充信息条目以提升后续建议质量。",
        ],
    )

    add_heading(doc, "流程 3：搭建子护场群", 2)
    add_bullets(
        doc,
        [
            "「群聊」Tab → 发起群聊 → 选择用途（如恋爱暧昧）。",
            "邀请联系人（≤19 人）+ 选择 1–3 位同场景搭子 → 创建群聊。",
            "在群内正常对话，搭子按人设主动护场、调解或提示风险。",
        ],
    )

    add_heading(doc, "流程 4：朋友圈被动展示与探索", 2)
    add_bullets(
        doc,
        [
            "「朋友圈」→「我的日常」→ 添加展示条目（观点/偏好/事实）。",
            "（可选）在「热点」页选取热搜话题，补全为自己的动态。",
            "好友侧：「探索好友」→ 选择联系人 → 提问 → AI 基于对方已填资料回复。",
            "探索记录保存在朋友圈 Tab，可按日回看。",
        ],
    )

    add_heading(doc, "流程 5：从素颜世界扩充人格", 2)
    add_bullets(
        doc,
        [
            "「人物 → 我的素颜 → 打开素颜世界」。",
            "按场景、语气、关系等标签筛选 → 加入感兴趣的素颜。",
            "在素颜信息管理页维护条目 → 回到私聊切换使用。",
        ],
    )

    # 5
    add_heading(doc, "五、产品价值总结", 1)
    add_table(
        doc,
        ["模块", "核心价值"],
        [
            ["消息 + 素颜", "降低表达焦虑，保留真人发送的最终控制权"],
            ["素颜世界", "发现他人沉淀的好人格，快速扩展自己的表达工具箱"],
            ["朋友圈 · 我的日常", "不发朋友圈，也能被熟人按问题了解"],
            ["朋友圈 · 探索", "带着问题聊，替代无效刷动态"],
            ["朋友圈 · 热点", "热搜变选题，降低内容启动门槛"],
            ["群聊 · 搭子", "复杂多人场景有人帮盯场，娱乐与边界并存"],
            ["人物", "真人关系与 AI 能力一处可达，社交前置"],
        ],
    )

    # 6
    add_heading(doc, "六、数据与隐私说明", 1)
    add_bullets(
        doc,
        [
            "聊天记录（私聊、群聊、探索对话）仅存本机，服务端只做转发与在线推送，不持久化气泡内容。",
            "换机、卸载或清缓存会导致聊天记录不可恢复；离线期间的消息无法补收。",
            "群聊 AI 上下文由客户端在发送时附带最近消息摘录，供搭子接话参考。",
            "朋友圈探索仅基于对方已授权展示的资料生成回复，不越权代表用户表态。",
            "AI 能力全部经服务端调用，未配置 AI 服务时相关功能会明确报错，不做静默降级。",
        ],
    )

    # 7
    add_heading(doc, "七、术语表", 1)
    add_table(
        doc,
        ["术语", "含义"],
        [
            ["素颜", "表达人格：一套风格、话术样例与约束，用于私聊辅助成稿"],
            ["素颜世界", "素颜模板的分发与浏览市场，可加入「我的素颜」"],
            ["搭子", "群聊中的 AI 护场角色，按场景与人设有不同立场与接话风格"],
            ["被动展示", "用户主动填写、供熟人探索引用的个人资料条目，非实时动态流"],
            ["探索", "访客基于被动展示资料向 AI 提问，获取 clone 侧参考回复"],
            ["Owner hints", "群主可见的风险提示与对话元信息，辅助判断群聊走向"],
        ],
    )

    # 8
    add_heading(doc, "八、平台与账号", 1)
    add_bullets(
        doc,
        [
            "V1 发布平台：Android（Capacitor 原生壳 + Web 技术栈）。",
            "iOS 与独立 Web 端按产品节奏后续扩展。",
            "账号体系：手机号 + 短信验证码，JWT 会话保持。",
        ],
    )

    doc.add_paragraph()
    add_para(
        doc,
        "— 本文档基于 AIChat 当前产品实现整理，供内部介绍、合作沟通与用户说明使用。",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT))
    print(f"Written: {OUT}")


if __name__ == "__main__":
    build()
