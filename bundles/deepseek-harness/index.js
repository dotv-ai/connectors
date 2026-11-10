// =============================================================================
// DOTV 无限画布 —— DeepSeek Harness 插件的 host 半边
// =============================================================================
// 这个文件跑在 harness 的 host 进程里，给 agent 五个工具：列画布、列节点、加文本节点、
// 跑一个节点、跑一个组。
//
// **零运行时依赖**：不 import 任何 @deepseek-ai/* 的包。
//   · 工具定义直接写成 ToolDefinition 的形状 —— ctx.tools.register 只校验形状与 JSON
//     Schema，defineTool 不过是把它编译成 JSON Schema 的类型化 helper；
//   · 配置用手写的 Standard Schema —— cordis 只调 `Config['~standard'].validate()`。
// 这样装这个插件不用在 profile 里解决任何 peer 版本范围问题：@deepseek-ai/* 的版本号带着
// 一堆预发布号，peer range 很容易写成「静默排除所有预发布版」的那种坑，踩上了用户只会
// 看到一句 ERESOLVE。
//
// 凭据从哪来：配置里的 apiKey；没配就读本机 `dotv` CLI 的登录凭据
// （~/.dotv/credentials.json，按服务地址分键）。也就是说 —— 这台机器上 `dotv login` 过，
// 这个插件就能直接用。
// =============================================================================

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Cordis 插件名。 */
export const name = "dotv-canvas";

/** 依赖的服务：工具注册表。 */
export const inject = ["tools"];

const DEFAULT_API_BASE = "https://dotv.ai";

// =============================================================================
// 配置
// =============================================================================

/**
 * 插件自己的配置。手写的 Standard Schema：cordis 只要求 `Config["~standard"].validate()`
 * 这个接口，vendor 是谁不重要（loader 里只有 schemastery 的 schema 走额外的 diff 逻辑）。
 *
 * @type {{ "~standard": { version: number, vendor: string, validate: (value: unknown) => { value?: object, issues?: object[] } } }}
 */
export const Config = {
  "~standard": {
    version: 1,
    vendor: "dotv",
    validate(value) {
      const raw = value && typeof value === "object" ? value : {};
      const issues = [];
      const read = (key) => {
        const item = raw[key];
        if (item === undefined || item === null) {
          return undefined;
        }
        if (typeof item !== "string") {
          issues.push({ message: `${key} must be a string`, path: [key] });
          return undefined;
        }
        const trimmed = item.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      };
      const apiBase = read("apiBase") ?? DEFAULT_API_BASE;
      if (!apiBase.startsWith("http://") && !apiBase.startsWith("https://")) {
        issues.push({
          message: "apiBase must be an http(s) origin, e.g. https://dotv.ai",
          path: ["apiBase"],
        });
      }
      if (issues.length > 0) {
        return { issues };
      }
      return {
        value: {
          apiBase: apiBase.replace(/\/+$/, ""),
          apiKey: read("apiKey"),
          canvasId: read("canvasId"),
          teamId: read("teamId"),
        },
      };
    },
  },
};

// =============================================================================
// 凭据
// =============================================================================

/**
 * 读本机 `dotv` CLI 的登录凭据。那份文件按服务地址分键，每条里 `key` 是要放进
 * Authorization 头的那个凭据。
 *
 * @param {string} apiBase 服务地址
 * @returns {string | undefined} 凭据；没有就 undefined
 */
function readLocalCredential(apiBase) {
  try {
    const file = join(homedir(), ".dotv", "credentials.json");
    const store = JSON.parse(readFileSync(file, "utf8"));
    const entry = store[apiBase];
    if (typeof entry === "string") {
      return entry;
    }
    if (entry && typeof entry === "object" && typeof entry.key === "string") {
      return entry.key;
    }
  } catch {
    // 没登录过、文件不存在、或者读不动 —— 都按「没有凭据」处理，错误在用工具时再说。
  }
  return undefined;
}

// =============================================================================
// 请求
// =============================================================================

/**
 * 调 DOTV 的 HTTP API。
 *
 * @param {object} options 请求参数
 * @param {string} options.apiBase 服务地址
 * @param {string} options.path 路径
 * @param {string} [options.method] 方法
 * @param {Record<string, string | number | undefined>} [options.query] 查询参数
 * @param {unknown} [options.body] JSON 请求体
 * @param {string | undefined} options.token 凭据
 * @param {string | undefined} options.teamId 团队空间
 * @returns {Promise<any>} 解析后的 JSON
 */
async function callApi(options) {
  const url = new URL(`${options.apiBase}${options.path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  const headers = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.teamId) {
    headers["X-Team-Id"] = options.teamId;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `DOTV API ${options.method ?? "GET"} ${options.path} → ${response.status} ${response.statusText}: ${text.slice(0, 600)}`,
    );
  }
  if (text.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// =============================================================================
// 工具
// =============================================================================

/** 工具参数：把 JSON Schema 写成这样，省得引依赖。 */
const stringParam = (description) => ({ type: "string", description });
const numberParam = (description) => ({ type: "number", description });

/** 输出：一段文本。 */
const textOutput = {
  schema: { type: "string" },
  render: (_args, value) => [{ type: "text", text: String(value) }],
};

/** 从参数里取一个必填的字符串。 */
function requireString(args, key) {
  const value = args?.[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`missing required argument: ${key}`);
  }
  return value.trim();
}

/** 节点摘要：画布上真正有用的那几列。 */
function summarizeNode(node) {
  const data = node.data ?? {};
  const content = data.text ?? data.prompt ?? data.name ?? "";
  return {
    id: node.id,
    type: node.type,
    status: data.status,
    name: data.name,
    content: typeof content === "string" ? content.slice(0, 120) : undefined,
    position: { x: node.positionX, y: node.positionY },
    parentId: node.parentId,
  };
}

/**
 * 装配插件：读配置、拿凭据、注册五个工具。
 *
 * @param {any} ctx cordis 上下文
 * @param {any} config 校验过的配置
 */
export function apply(ctx, config) {
  const apiBase = config.apiBase ?? DEFAULT_API_BASE;
  const teamId = config.teamId;

  /** 每次调用都现取凭据：用户在设置里换了 apiKey 或重新登录，不必重启插件。 */
  function credential() {
    return config.apiKey ?? readLocalCredential(apiBase);
  }

  /** 没凭据时的说法要说清楚 —— 用户看到这句话才知道要去 login。 */
  function requireToken() {
    const value = credential();
    if (!value) {
      throw new Error(
        "No DOTV credential on this machine. Run `dotv login`, or set `apiKey` in the plugin's configuration.",
      );
    }
    return value;
  }

  /** 默认画布：配置里的 canvasId，否则让调用方给。 */
  function resolveCanvasId(args) {
    const given =
      typeof args?.canvasId === "string" ? args.canvasId.trim() : "";
    if (given.length > 0) {
      return given;
    }
    if (config.canvasId) {
      return config.canvasId;
    }
    throw new Error("missing required argument: canvasId");
  }

  ctx.tools.register({
    name: "dotv_canvases",
    description:
      "List the DOTV canvases of the signed-in account (id, name, project). Use it to find the canvas to work on before listing or changing nodes.",
    parameters: {
      type: "object",
      properties: {
        projectId: stringParam(
          "Only canvases of this project (workspace). Optional.",
        ),
        pageSize: numberParam("How many rows to return. Default 50."),
      },
      additionalProperties: false,
    },
    output: textOutput,
    async execute(args) {
      const payload = await callApi({
        apiBase,
        path: "/api/canvas/list",
        query: { projectId: args?.projectId, pageSize: args?.pageSize ?? 50 },
        token: requireToken(),
        teamId,
      });
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      return JSON.stringify(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          projectId: row.projectId,
          updatedAt: row.updatedAt,
        })),
        null,
        2,
      );
    },
  });

  ctx.tools.register({
    name: "dotv_canvas_nodes",
    description:
      "List the nodes on one DOTV canvas (id, type, status, a snippet of its text or prompt, position). Read the canvas before changing it.",
    parameters: {
      type: "object",
      properties: {
        canvasId: stringParam("The canvas to read."),
        type: stringParam(
          "Only nodes of this type: text / image / video / audio / group.",
        ),
        pageSize: numberParam("How many rows to return. Default 200."),
      },
      required: ["canvasId"],
      additionalProperties: false,
    },
    output: textOutput,
    async execute(args) {
      const payload = await callApi({
        apiBase,
        path: "/api/canvas-node/list",
        query: {
          canvasId: resolveCanvasId(args),
          type: args?.type,
          pageSize: args?.pageSize ?? 200,
        },
        token: requireToken(),
        teamId,
      });
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      return JSON.stringify(
        {
          canvasId: resolveCanvasId(args),
          total: payload?.total ?? rows.length,
          nodes: rows.map(summarizeNode),
        },
        null,
        2,
      );
    },
  });

  ctx.tools.register({
    name: "dotv_canvas_add_text",
    description:
      "Add a text node to a DOTV canvas and return the node id. The node is created as a draft: run it with dotv_canvas_run to generate from it.",
    parameters: {
      type: "object",
      properties: {
        canvasId: stringParam("The canvas to write to."),
        text: stringParam("The text to put on the node."),
        x: numberParam("Canvas X coordinate. Default 0."),
        y: numberParam("Canvas Y coordinate. Default 0."),
        parentId: stringParam("Put the node inside this group node. Optional."),
      },
      required: ["canvasId", "text"],
      additionalProperties: false,
    },
    output: textOutput,
    async execute(args) {
      const canvasId = resolveCanvasId(args);
      const id = crypto.randomUUID();
      await callApi({
        apiBase,
        path: "/api/canvas-node/sync",
        method: "POST",
        body: {
          canvasId,
          upserts: [
            {
              id,
              type: "text",
              positionX: args?.x ?? 0,
              positionY: args?.y ?? 0,
              ...(args?.parentId ? { parentId: args.parentId } : {}),
              data: { text: String(args.text), status: "draft" },
            },
          ],
        },
        token: requireToken(),
        teamId,
      });
      // 读回来确认服务端真的存成了那样 —— 写进去的东西没落地，报告里要说得出来。
      const readBack = await callApi({
        apiBase,
        path: "/api/canvas-node/list",
        query: { canvasId, id },
        token: requireToken(),
        teamId,
      });
      const stored = Array.isArray(readBack?.data)
        ? readBack.data[0]
        : undefined;
      return JSON.stringify(
        stored
          ? {
              id: stored.id,
              type: stored.type,
              status: stored.data?.status,
              canvasId,
            }
          : {
              id,
              type: "text",
              status: "draft",
              canvasId,
              note: "created, but reading it back returned nothing",
            },
        null,
        2,
      );
    },
  });

  ctx.tools.register({
    name: "dotv_canvas_run",
    description:
      "Run one node's generation on a DOTV canvas. Synchronous models come back finished; video returns a task id that is still pending — poll it with dotv_canvas_nodes.",
    parameters: {
      type: "object",
      properties: {
        canvasId: stringParam("The canvas the node lives on."),
        nodeId: stringParam("The node to run."),
        params: {
          type: "object",
          description:
            "Parameter overrides for this run (model, prompt, resolution…). Optional.",
          additionalProperties: true,
        },
      },
      required: ["canvasId", "nodeId"],
      additionalProperties: false,
    },
    output: textOutput,
    async execute(args) {
      const payload = await callApi({
        apiBase,
        path: "/api/canvas-node/generate",
        method: "POST",
        body: {
          canvasId: resolveCanvasId(args),
          nodeId: requireString(args, "nodeId"),
          ...(args?.params ? { params: args.params } : {}),
        },
        token: requireToken(),
        teamId,
      });
      return JSON.stringify(payload ?? {}, null, 2);
    },
  });

  ctx.tools.register({
    name: "dotv_canvas_run_group",
    description:
      "Run every pending node inside a group on a DOTV canvas, in parallel. Use it when the user wants a whole group generated.",
    parameters: {
      type: "object",
      properties: {
        canvasId: stringParam("The canvas the group lives on."),
        groupNodeId: stringParam("The group container node to run as a whole."),
        nodeType: stringParam(
          "Only run nodes of this type: text / image / video / audio.",
        ),
      },
      required: ["canvasId", "groupNodeId"],
      additionalProperties: false,
    },
    output: textOutput,
    async execute(args) {
      const payload = await callApi({
        apiBase,
        path: "/api/canvas-node/run-group",
        method: "POST",
        body: {
          canvasId: resolveCanvasId(args),
          groupNodeId: requireString(args, "groupNodeId"),
          ...(args?.nodeType ? { nodeType: args.nodeType } : {}),
        },
        token: requireToken(),
        teamId,
      });
      return JSON.stringify(payload ?? {}, null, 2);
    },
  });
}
