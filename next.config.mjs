/** @type {import('next').NextConfig} */
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true";
const repoName = "china-politician-activity";

const nextConfig = {
  typedRoutes: false,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: isGitHubPagesBuild ? `/${repoName}` : "",
  assetPrefix: isGitHubPagesBuild ? `/${repoName}/` : undefined
};

export default nextConfig;
