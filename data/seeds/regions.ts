export type RegionSeed = {
  code: string;
  name: string;
  type: "PROVINCE" | "AUTONOMOUS_REGION" | "MUNICIPALITY";
  govDomain: string;
};

export const REGION_SEEDS: RegionSeed[] = [
  { code: "beijing", name: "北京", type: "MUNICIPALITY", govDomain: "beijing.gov.cn" },
  { code: "tianjin", name: "天津", type: "MUNICIPALITY", govDomain: "tj.gov.cn" },
  { code: "hebei", name: "河北", type: "PROVINCE", govDomain: "hebei.gov.cn" },
  { code: "shanxi", name: "山西", type: "PROVINCE", govDomain: "shanxi.gov.cn" },
  { code: "inner_mongolia", name: "内蒙古", type: "AUTONOMOUS_REGION", govDomain: "nmg.gov.cn" },
  { code: "liaoning", name: "辽宁", type: "PROVINCE", govDomain: "ln.gov.cn" },
  { code: "jilin", name: "吉林", type: "PROVINCE", govDomain: "jl.gov.cn" },
  { code: "heilongjiang", name: "黑龙江", type: "PROVINCE", govDomain: "hlj.gov.cn" },
  { code: "shanghai", name: "上海", type: "MUNICIPALITY", govDomain: "shanghai.gov.cn" },
  { code: "jiangsu", name: "江苏", type: "PROVINCE", govDomain: "jiangsu.gov.cn" },
  { code: "zhejiang", name: "浙江", type: "PROVINCE", govDomain: "zj.gov.cn" },
  { code: "anhui", name: "安徽", type: "PROVINCE", govDomain: "ah.gov.cn" },
  { code: "fujian", name: "福建", type: "PROVINCE", govDomain: "fujian.gov.cn" },
  { code: "jiangxi", name: "江西", type: "PROVINCE", govDomain: "jiangxi.gov.cn" },
  { code: "shandong", name: "山东", type: "PROVINCE", govDomain: "shandong.gov.cn" },
  { code: "henan", name: "河南", type: "PROVINCE", govDomain: "henan.gov.cn" },
  { code: "hubei", name: "湖北", type: "PROVINCE", govDomain: "hubei.gov.cn" },
  { code: "hunan", name: "湖南", type: "PROVINCE", govDomain: "hunan.gov.cn" },
  { code: "guangdong", name: "广东", type: "PROVINCE", govDomain: "gd.gov.cn" },
  { code: "guangxi", name: "广西", type: "AUTONOMOUS_REGION", govDomain: "gxzf.gov.cn" },
  { code: "hainan", name: "海南", type: "PROVINCE", govDomain: "hainan.gov.cn" },
  { code: "chongqing", name: "重庆", type: "MUNICIPALITY", govDomain: "cq.gov.cn" },
  { code: "sichuan", name: "四川", type: "PROVINCE", govDomain: "sc.gov.cn" },
  { code: "guizhou", name: "贵州", type: "PROVINCE", govDomain: "guizhou.gov.cn" },
  { code: "yunnan", name: "云南", type: "PROVINCE", govDomain: "yn.gov.cn" },
  { code: "xizang", name: "西藏", type: "AUTONOMOUS_REGION", govDomain: "xizang.gov.cn" },
  { code: "shaanxi", name: "陕西", type: "PROVINCE", govDomain: "shaanxi.gov.cn" },
  { code: "gansu", name: "甘肃", type: "PROVINCE", govDomain: "gansu.gov.cn" },
  { code: "qinghai", name: "青海", type: "PROVINCE", govDomain: "qinghai.gov.cn" },
  { code: "ningxia", name: "宁夏", type: "AUTONOMOUS_REGION", govDomain: "nx.gov.cn" },
  { code: "xinjiang", name: "新疆", type: "AUTONOMOUS_REGION", govDomain: "xinjiang.gov.cn" }
];
