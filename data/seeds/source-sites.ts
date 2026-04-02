import { REGION_SEEDS } from "./regions";

export type SourceSiteSeed = {
  regionCode: string;
  siteName: string;
  baseDomain: string;
  sourceType: "PARTY" | "GOVERNMENT" | "OFFICIAL_MEDIA" | "CENTRAL_MEDIA";
  credibilityLevel: "A" | "B" | "C" | "D";
  enabled: boolean;
  notes?: string;
};

const REGION_GOV_SITES: SourceSiteSeed[] = REGION_SEEDS.map((region) => ({
  regionCode: region.code,
  siteName: region.level === "CITY" ? `${region.name}市政府门户` : `${region.name}省级政府门户`,
  baseDomain: region.govDomain,
  sourceType: "GOVERNMENT",
  credibilityLevel: "A",
  enabled: true,
  notes: region.level === "CITY" ? "MVP 默认启用的市级政府主站白名单。" : "MVP 默认启用的省级政府主站白名单。"
}));

const EXTRA_MEDIA_SITES: SourceSiteSeed[] = [
  {
    regionCode: "beijing",
    siteName: "北京日报客户端",
    baseDomain: "bjd.com.cn",
    sourceType: "OFFICIAL_MEDIA",
    credibilityLevel: "B",
    enabled: true,
    notes: "北京地区官方媒体补充源。"
  },
  {
    regionCode: "guangdong",
    siteName: "南方网",
    baseDomain: "southcn.com",
    sourceType: "OFFICIAL_MEDIA",
    credibilityLevel: "B",
    enabled: true,
    notes: "广东地区官方媒体补充源。"
  },
  {
    regionCode: "zhejiang",
    siteName: "浙江在线",
    baseDomain: "zjol.com.cn",
    sourceType: "OFFICIAL_MEDIA",
    credibilityLevel: "B",
    enabled: true,
    notes: "浙江地区官方媒体补充源。"
  },
  {
    regionCode: "hubei",
    siteName: "荆楚网",
    baseDomain: "news.cnhubei.com",
    sourceType: "OFFICIAL_MEDIA",
    credibilityLevel: "B",
    enabled: true,
    notes: "湖北地区官方媒体补充源。"
  },
  {
    regionCode: "sichuan",
    siteName: "四川在线",
    baseDomain: "scol.com.cn",
    sourceType: "OFFICIAL_MEDIA",
    credibilityLevel: "B",
    enabled: true,
    notes: "四川地区官方媒体补充源。"
  },
  {
    regionCode: "chengdu",
    siteName: "红星新闻网",
    baseDomain: "news.chengdu.cn",
    sourceType: "OFFICIAL_MEDIA",
    credibilityLevel: "B",
    enabled: true,
    notes: "成都本地党媒新闻门户，市长活动报道高频来源。"
  },
  {
    regionCode: "chengdu",
    siteName: "成都全搜索",
    baseDomain: "chengdu.cn",
    sourceType: "OFFICIAL_MEDIA",
    credibilityLevel: "B",
    enabled: true,
    notes: "成都全搜索主站及专题页补充源。"
  },
  {
    regionCode: "chengdu",
    siteName: "看度新闻",
    baseDomain: "cdtv.cn",
    sourceType: "OFFICIAL_MEDIA",
    credibilityLevel: "B",
    enabled: true,
    notes: "成都广播电视台融媒体平台补充源。"
  }
];

export const SOURCE_SITE_SEEDS: SourceSiteSeed[] = [...REGION_GOV_SITES, ...EXTRA_MEDIA_SITES];
