import { SafeImg } from "./SafeImg";

export function CoverBlock({  names,
  dateText,
  subtitle,
  heroImageUrl,
  decoration,
}: {
  names: string[];
  dateText: string;
  subtitle?: string;
  heroImageUrl?: string;
  decoration: React.ReactNode;
}) {
  return (
    <div className="relative flex w-full flex-col items-center justify-center py-10 text-center">
      {heroImageUrl ? (
        <>
          <SafeImg
            src={heroImageUrl}
            alt=""
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : null}
      <div className={`relative z-10 ${heroImageUrl ? "text-white" : ""}`}>
        <div className="mx-auto mb-8 w-28 opacity-90">{decoration}</div>
        {subtitle ? (
          <p className="mb-6 text-xs tracking-[0.5em] opacity-80">
            {subtitle}
          </p>
        ) : null}
        <h1
          className="mb-4 text-4xl leading-snug tracking-[0.15em]"
          style={{ fontFamily: "var(--tk-font-display)" }}
        >
          {names.join("  ·  ")}
        </h1>
        <div className="mx-auto mb-5 h-px w-16 bg-current opacity-40" />
        <p className="text-sm tracking-widest opacity-90">{dateText}</p>
      </div>
    </div>
  );
}

export function GalleryBlock({
  images,
  editable = false,
}: {
  images: Array<{ url: string; caption?: string }>;
  editable?: boolean;
}) {
  if (images.length === 0) {
    if (!editable) return null;
    return (
      <div className="rounded-2xl border border-dashed border-[var(--tk-primary-soft)] py-10 text-center text-sm text-[var(--tk-muted)]">
        相册空空如也，去编辑器上传照片吧
      </div>
    );
  }
  const grid =
    images.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-2";
  return (
    <div className={`grid gap-2.5 ${grid}`}>
      {images.map((img, i) => (
        <figure key={`${img.url}-${i}`} className="overflow-hidden rounded-2xl">
          <SafeImg
            src={img.url}
            alt={img.caption ?? `照片 ${i + 1}`}
            loading="lazy"
            className="aspect-square w-full object-cover"
          />
          {img.caption ? (
            <figcaption className="mt-1 text-center text-xs text-[var(--tk-muted)]">
              {img.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

function mapLinks(
  venueName: string,
  venueAddress: string,
  lat?: number,
  lng?: number,
) {
  const name = encodeURIComponent(venueName || venueAddress);
  if (lat != null && lng != null) {
    return {
      amap: `https://uri.amap.com/marker?position=${lng},${lat}&name=${name}`,
      qq: `https://apis.map.qq.com/uri/v1/marker?marker=coord:${lat},${lng};title:${name}&referer=memento`,
    };
  }
  const keyword = encodeURIComponent(venueAddress || venueName);
  return {
    amap: `https://uri.amap.com/search?keyword=${keyword}`,
    qq: `https://apis.map.qq.com/uri/v1/search?keyword=${keyword}&referer=memento`,
  };
}

export function MapBlock({
  venueName,
  venueAddress,
  lat,
  lng,
}: {
  venueName: string;
  venueAddress: string;
  lat?: number;
  lng?: number;
}) {
  const links = mapLinks(venueName, venueAddress, lat, lng);
  return (
    <div
      className="rounded-3xl p-6 text-center"
      style={{ background: "var(--tk-surface)" }}
    >
      <p className="mb-1 text-xs tracking-[0.4em] text-[var(--tk-muted)]">
        地 点
      </p>
      <h3
        className="mb-2 text-xl tracking-wide text-[var(--tk-text)]"
        style={{ fontFamily: "var(--tk-font-display)" }}
      >
        {venueName}
      </h3>
      {venueAddress ? (
        <p className="mb-5 text-sm leading-relaxed text-[var(--tk-muted)]">
          {venueAddress}
        </p>
      ) : (
        <p className="mb-5 text-sm text-[var(--tk-muted)]">地址待补充</p>
      )}
      <div className="flex justify-center gap-3">
        <a
          href={links.amap}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full px-5 py-2 text-sm font-medium"
          style={{ background: "var(--tk-button-bg)", color: "var(--tk-button-text)" }}
        >
          高德导航
        </a>
        <a
          href={links.qq}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-[var(--tk-primary-soft)] px-5 py-2 text-sm text-[var(--tk-text)]"
        >
          腾讯地图
        </a>
      </div>
    </div>
  );
}

const proseCls =
  "whitespace-pre-wrap text-[15px] leading-loose text-[var(--tk-text)]";

export function StoryBlock({
  heading,
  body,
}: {
  heading?: string;
  body: string;
}) {
  return (
    <section
      className="rounded-3xl px-6 py-7"
      style={{ background: "var(--tk-surface)" }}
    >
      {heading ? (
        <h2
          className="mb-4 text-center text-xl tracking-[0.3em] text-[var(--tk-text)]"
          style={{ fontFamily: "var(--tk-font-display)" }}
        >
          {heading}
        </h2>
      ) : null}
      <span
        aria-hidden
        className="mb-2 block text-center text-3xl leading-none text-[var(--tk-primary)]"
      >
        ❝
      </span>
      <p className={proseCls}>{body}</p>
    </section>
  );
}

export function TextBlock({
  heading,
  body,
}: {
  heading?: string;
  body: string;
}) {
  return (
    <section className="px-2 py-4">
      {heading ? (
        <h2
          className="mb-3 text-lg tracking-[0.25em] text-[var(--tk-text)]"
          style={{ fontFamily: "var(--tk-font-display)" }}
        >
          {heading}
        </h2>
      ) : null}
      <p className={proseCls}>{body}</p>
    </section>
  );
}
