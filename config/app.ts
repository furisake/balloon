export const APP_CONFIG = {
  catalogUrl: "https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip",
  cacheTtlSeconds: 3600,
  allowedImageHosts: ["www.aozora.gr.jp"],
  historyLimit: 1000,
  bodyCacheLimit: 10,
  searchPageSize: 50,
} as const;

export const EXTERNAL_URLS = {
  github: "https://github.com/naofumi/balloon",
  aozora: "https://www.aozora.gr.jp/",
  aozoraNotation: "https://www.aozora.gr.jp/annotation/",
  proofreader: "https://eunheui.sakura.ne.jp/aozora/proofreader.html",
} as const;
