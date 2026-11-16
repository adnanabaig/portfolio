import Head from "next/head";
import portfolio from "../../data/portfolio.json";

export interface SeoProps {
  /** Full page title, separated with " | " (e.g. "Blog | Adnan Baig"). */
  title: string;
  description?: string;
  /** Path from the site root, starting with "/". */
  path: string;
  /** Absolute URL or a path under /public. Defaults to the generated /og.png. */
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  noindex?: boolean;
  /** Structured data objects, emitted as application/ld+json. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = portfolio.name;

function absolute(urlOrPath: string) {
  if (/^https?:\/\//.test(urlOrPath)) return urlOrPath;
  return `${portfolio.siteUrl}${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;
}

// JSON-LD is inlined in a script tag, so "<" must not appear raw.
function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const Seo = ({
  title,
  description = portfolio.seo.description,
  path,
  image = "/og.png",
  type = "website",
  publishedTime,
  noindex = false,
  jsonLd,
}: SeoProps) => {
  const url = absolute(path);
  const imageUrl = image ? absolute(image) : undefined;
  const isDefaultImage = image === "/og.png";
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={url} />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="en_US" />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      {imageUrl && isDefaultImage && <meta property="og:image:width" content="1200" />}
      {imageUrl && isDefaultImage && <meta property="og:image:height" content="630" />}
      {imageUrl && isDefaultImage && <meta property="og:image:alt" content={`${SITE_NAME}, ${portfolio.title}. Pixel art of the robot AB-01 beside a robot arm.`} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      <meta name="twitter:card" content={imageUrl ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}

      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
        />
      ))}
    </Head>
  );
};

export default Seo;
