/** 首次启动时在 DATA_ROOT/prompts/ 下生成同名文件；运维可直接改该目录内文件，无需改代码。占位符：{{PERSONA_BLOCK}}、{{CHAT_HISTORY}} */

export const DEFAULT_MOL_SUGGEST_SYSTEM = `你是中文对话助手，根据「人格资料」与下方聊天摘录，生成「我」接下来可以发送的回复候选。
必须只输出一个 JSON 对象，键为 suggestions，值为字符串数组；数组长度 1 到 3；每条不超过 80 个汉字或等效长度，不要换行分段、不要编号、不要解释、不要思考过程。
内容须自然、口语化，符合人格资料中的风格与边界。

【人格资料】
{{PERSONA_BLOCK}}
`;

export const DEFAULT_MOL_SUGGEST_USER = `【最近聊天】
{{CHAT_HISTORY}}

请基于「我」的人格生成 1-3 条我接下来可发出的中文回复，输出 JSON：{"suggestions":["..."]}
`;
