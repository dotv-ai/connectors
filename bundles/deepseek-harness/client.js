// =============================================================================
// DOTV 无限画布 —— DeepSeek Harness 插件的浏览器半边
// =============================================================================
// 侧栏里挂一个入口，点开是一张小卡片：打开 DOTV 画布，以及一句「agent 能对画布做什么」。
// 画布本身不在这里渲染 —— 它是 DOTV 那边的东西，这个插件只负责把人送到它面前，
// 以及把 agent 的能力挂在它旁边。
//
// 契约照 DSH 的来：浏览器里由 window.__ModuleLoader__.load 登记一个工厂，
// React 从外壳拿（种子提供的），样式与图标内联（不引资源路由 —— 那个路由要带内容
// 修订号，第三方包得自己复刻一套产物命名规则，不值得）。
// =============================================================================

window.__ModuleLoader__.load({
  id: "@dotv/dsh-canvas",
  factory(require) {
    const React = require("react");
    const createElement = React.createElement;
    const MAIN_ID = "dotv-canvas";
    const DEFAULT_URL = "https://dotv.ai";

    /** 画布地址：默认正式站，自建部署可以在插件设置里改（存在本机）。 */
    function canvasUrl() {
      try {
        const saved = window.localStorage.getItem("dotv.canvasUrl");
        return saved && saved.length > 0 ? saved : DEFAULT_URL;
      } catch {
        return DEFAULT_URL;
      }
    }

    /** DOTV 的标识：一个方底板上的 D。 */
    function DotvMark({ size = 20 }) {
      return createElement(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 512 512",
          fill: "none",
          "aria-hidden": true,
        },
        createElement("rect", {
          x: 1,
          y: 1,
          width: 510,
          height: 510,
          rx: 92,
          fill: "#0d0d0d",
        }),
        createElement(
          "g",
          { transform: "translate(76.8 132.96) scale(1.021)" },
          createElement(
            "g",
            { transform: "translate(26 0) skewX(-6.157)" },
            createElement("path", {
              d: "M0 0H273a52 52 0 0 1 52 52v137a52 52 0 0 1-52 52H0ZM0 76h232a17 17 0 0 1 17 17v55a17 17 0 0 1-17 17H76V121H0Z",
              fill: "#ffffff",
              fillRule: "evenodd",
            }),
          ),
        ),
      );
    }

    /** 主区的那张卡片：说清楚能干什么，并把人送进 DOTV。 */
    function DotvPage() {
      const url = canvasUrl();
      return createElement(
        "div",
        {
          style: {
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          },
        },
        createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "10px" } },
          createElement(DotvMark, { size: 24 }),
          createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "2px" } },
            createElement(
              "div",
              { style: { fontSize: "15px", fontWeight: 600 } },
              "DOTV 无限画布",
            ),
            createElement(
              "div",
              { style: { fontSize: "12px", opacity: 0.62 } },
              "一块画布：剧本、分镜、图片、视频、配音，一路到成片。",
            ),
          ),
        ),
        createElement(
          "div",
          { style: { fontSize: "13px", lineHeight: 1.75, opacity: 0.82 } },
          "这个插件给 agent 五个工具：列画布、列节点、加文本节点、跑一个节点、跑一个组。",
          createElement("br", null),
          "画布本身在 DOTV 那边 —— 让人去那儿看着 agent 干活。",
        ),
        createElement(
          "a",
          {
            href: url,
            target: "_blank",
            rel: "noreferrer",
            style: {
              alignSelf: "flex-start",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid currentColor",
              fontSize: "12px",
              textDecoration: "none",
            },
          },
          "打开 DOTV",
        ),
      );
    }

    function apply(ctx) {
      const ctxInject = ctx.inject;
      if (typeof ctxInject !== "function") {
        return;
      }
      ctxInject.call(ctx, ["layout"], (pageCtx) => {
        const pageSlots = pageCtx.slots;
        const layout = pageCtx.layout;
        if (pageSlots === undefined || layout === undefined) {
          return;
        }
        const stopMain = pageSlots.inject("main", () =>
          pageSlots.register({ name: "main", key: MAIN_ID }, DotvPage),
        );
        const stopSidebar = pageSlots.inject("sidebar.panellist", () =>
          pageSlots.register(
            {
              name: "sidebar.panellist",
              id: MAIN_ID,
              order: 30,
              label: "DOTV 画布",
            },
            () => createElement(DotvMark, { size: 18 }),
          ),
        );
        return () => {
          stopSidebar();
          stopMain();
        };
      });
    }

    return { inject: ["slots"], apply };
  },
});
