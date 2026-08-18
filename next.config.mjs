import createMDX from "@next/mdx";

const withMDX = createMDX();

export default withMDX({
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "www.aozora.gr.jp" }],
  },
});
