import { BrandMark } from "@/components/brand/brand-mark";
import { ProductLink } from "@/components/brand/product-link";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MUEDEAR_APP_STORE_URL } from "@/lib/muedear/constants";
import { MUEDVOX_LIVE, MUEDVOX_SCREENSHOT } from "@/lib/muedvox/config";
import styles from "./studio-showroom.module.css";
const modules = [
  {
    name: "MUEDsat",
    slug: "muedsat",
    image: "/muedsat/faceplate-1.0.1-drive30.webp",
    width: 1000,
    height: 700,
    key: "sat",
  },
  {
    name: "MUEDlim",
    slug: "muedlim",
    image: "/muedlim/faceplate-1.0.1.webp",
    width: 1000,
    height: 700,
    key: "lim",
  },
  {
    name: "MUEDrive",
    slug: "muedrive",
    image: "/muedrive/faceplate.png",
    width: 1000,
    height: 700,
    key: "drive",
  },
] as const;
export async function StudioShowroom({
  locale,
  preview = true,
}: {
  locale: string;
  preview?: boolean;
}) {
  const homePath = `/${locale}${preview ? "/redesign/studio" : ""}`;
  const t = await getTranslations({ locale, namespace: "studioShowroom" });
  const portal = await getTranslations({ locale, namespace: "landing.v2" });
  // ★MUEDvox's own approved words (the muedvox namespace, joined in on the server by lib/i18n/request.ts) — the card adds no copy of its own
  //   beyond the link label. Shown only while the product page is LIVE, so it never links to a 404.
  const vox = await getTranslations({ locale, namespace: "muedvox" });
  return (
    <div className={styles.showroom}>
      <a className={styles.skip} href="#studio-main">
        {t("skip")}
      </a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link
            href={homePath}
            className={styles.brand}
            aria-label={preview ? t("home") : "MUED"}
          >
            <BrandMark />
          </Link>
          <nav className={styles.navigation} aria-label={t("navigation")}>
            <a href="#instruments">{t("navProducts")}</a>
            <a href="#hoo">Hoo</a>
            <Link href={`/${locale}/support`}>{t("support")}</Link>
          </nav>
          <div className={styles.utilities}>
            <nav className={styles.languages} aria-label={t("language")}>
              {(["ja", "en"] as const).map((language) => (
                <a
                  key={language}
                  href={`/${language}${preview ? "/redesign/studio" : ""}`}
                  lang={language}
                  hrefLang={language}
                  aria-label={language === "ja" ? "日本語" : "English"}
                  aria-current={locale === language ? "page" : undefined}
                >
                  {language.toUpperCase()}
                </a>
              ))}
            </nav>
            <Link href="/sign-in" className={styles.login}>
              {t("login")} <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="studio-main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="studio-title">
          <div className={styles.heroArt}>
            <Image
              src="/muedial-hoo-mixing-console.webp"
              alt={t("hooAlt")}
              fill
              priority
              sizes="(min-width: 900px) 75vw, 100vw"
              className={styles.heroImage}
            />
          </div>
          <div className={`${styles.container} ${styles.heroInner}`}>
            {/* ★One line only (kimny 2026-09-30: 「『クリエイター自身が作る、制作のための道具。』だけにしよう」).
                It is the page's single h1 — structurally, not visually: a compact size, not a banner
                (kimny: 「そんなに馬鹿でかいヒーローにしないでいいよ。小気味良いサイズで」). */}
            <h1 id="studio-title" className={styles.heroTitle}>
              {/* ★When it has to wrap (375px), ja breaks only after 「、」 — keep-all + <wbr>, never mid-word. */}
              {portal("hero.lead")
                .split("、")
                .map((part, i, all) => (
                  <Fragment key={i}>
                    {part}
                    {i < all.length - 1 && (
                      <>
                        、<wbr />
                      </>
                    )}
                  </Fragment>
                ))}
            </h1>
            <a href="#instruments" className={styles.primaryLink}>
              {t("explore")} <ArrowDown size={18} aria-hidden="true" />
            </a>
            <p className={styles.heroCredit}>MUED / BY GLASSWERKS</p>
          </div>
          <div className={styles.heroCaption} aria-hidden="true">
            <span>HOO</span> YOUR SEAT AT THE CONSOLE.
          </div>
        </section>

        <nav className={styles.index} aria-label={t("workflow")}>
          <div className={styles.container}>
            {(
              [
                ["01", "master", "MUEDsp", "instruments"],
                ["02", "mix", "MUEDial", "hoo"],
                ["03", "train", "MUEDear", "train"],
              ] as const
            ).map(([number, key, name, anchor]) => (
              <a key={key} href={`#${anchor}`}>
                <span className={styles.indexNumber}>{number}</span>
                <span>
                  <strong>{portal(`${key}.label`)}</strong>
                  <small>{name}</small>
                </span>
                <ArrowDown size={17} aria-hidden="true" />
              </a>
            ))}
          </div>
        </nav>

        <section
          id="instruments"
          className={styles.instruments}
          aria-labelledby="instruments-title"
        >
          <div className={styles.container}>
            <div className={styles.sectionTop}>
              <p className={styles.eyebrow}>01 / MASTER</p>
              <span>{t("pluginCollection")}</span>
            </div>
            <div className={styles.featureIntro}>
              <div>
                <h2 id="instruments-title">
                  MUEDsp<span>masterchain</span>
                </h2>
              </div>
              <div className={styles.featureCopy}>
                <p>{portal("master.origin")}</p>
                <ProductLink
                  href={`/${locale}/muedsp`}
                  product="muedsp"
                  location="portal_master"
                  preview={preview}
                  className={styles.textLink}
                >
                  {portal("master.cta")}{" "}
                  <ArrowUpRight size={20} aria-hidden="true" />
                </ProductLink>
              </div>
            </div>
            <figure className={styles.masterFigure}>
              <div className={styles.masterBackdrop}>
                <span aria-hidden="true" className={styles.backdropLabel}>
                  THE FINISHING TOUCH.
                </span>
                <Image
                  src="/muedsp/masterchain-1.0.1-licensed.webp"
                  width={2186}
                  height={910}
                  alt={t("masterAlt")}
                  sizes="(min-width: 1280px) 1120px, 92vw"
                />
              </div>
              <figcaption>
                <span className={styles.status}>{t("inDevelopment")}</span>
                <span>{t("mockNote")}</span>
              </figcaption>
            </figure>

            {/* ★The second paid product, beside masterchain (kimny 10/27 「LPのtopからの遷移、作ってなくない？」 —
                the 10/3 launch plan's 「入口 2」). */}
            {MUEDVOX_LIVE && (
              <div className={styles.paidSecond}>
                <div className={styles.paidSecondImage}>
                  <Image
                    src={MUEDVOX_SCREENSHOT}
                    width={1200}
                    height={900}
                    alt={vox("screen.alt")}
                    sizes="(min-width: 900px) 520px, 92vw"
                  />
                </div>
                <div className={styles.paidSecondCopy}>
                  <h3>MUEDvox</h3>
                  <p>{vox("hero.title")}</p>
                  <p className={styles.paidSecondPrice}>{vox("buy.price")}</p>
                  <ProductLink
                    href={`/${locale}/muedvox`}
                    product="muedvox"
                    location="portal_master_vox"
                    preview={preview}
                    className={styles.textLink}
                  >
                    {t("voxCta")} <ArrowUpRight size={20} aria-hidden="true" />
                  </ProductLink>
                </div>
              </div>
            )}

            <div className={styles.collectionIntro}>
              <h3>{t("modulesTitle")}</h3>
              <p>{t("modulesBody")}</p>
            </div>
            <div className={styles.modules}>
              {modules.map((module, i) => (
                <Link
                  key={module.slug}
                  href={`/${locale}/${module.slug}`}
                  className={styles.module}
                >
                  <div className={styles.moduleImage}>
                    <Image
                      src={module.image}
                      width={module.width}
                      height={module.height}
                      alt={t(`${module.key}Alt`)}
                      sizes="(min-width: 900px) 350px, (min-width: 600px) 45vw, 90vw"
                    />
                  </div>
                  <div className={styles.moduleTitle}>
                    <h4>{module.name}</h4>
                    <span>{t("freeAlpha")}</span>
                  </div>
                  <p>{t(`${module.key}Description`)}</p>
                  <div className={styles.moduleBottom}>
                    <span>
                      0{i + 1} / {t(`${module.key}Category`)}
                    </span>
                    <ArrowUpRight size={22} aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section
          id="hoo"
          className={styles.hooSection}
          aria-labelledby="hoo-title"
        >
          <div className={`${styles.container} ${styles.hooGrid}`}>
            <div className={styles.hooPortrait}>
              <Image
                src="/muedial-hoo-mixing-console.webp"
                width={2752}
                height={1536}
                alt={t("hooAlt")}
                sizes="(min-width: 900px) 600px, 100vw"
              />
              <span className={styles.portraitSignature}>
                <Image src="/hoo-animated.svg" width={48} height={31} alt="" />{" "}
                Hoo / MUEDial
              </span>
            </div>
            <div className={styles.hooCopy}>
              <p className={styles.eyebrow}>02 / MIX</p>
              <h2 id="hoo-title">
                {t("mixTitle1")}
                <br />
                <span>{t("mixTitle2")}</span>
              </h2>
              <p className={styles.productRole}>
                MUEDial — {portal("mix.role")}
              </p>
              <p className={styles.description}>
                {portal("mix.origin")}
                <br />
                {t("mixBody")}
              </p>
              <ProductLink
                href={`/${locale}/muedial`}
                product="muedial"
                location="portal_mix"
                preview={preview}
                className={styles.primaryLink}
              >
                {portal("mix.cta")}{" "}
                <ArrowUpRight size={18} aria-hidden="true" />
              </ProductLink>
            </div>
          </div>
        </section>

        <section
          id="train"
          className={styles.trainSection}
          aria-labelledby="train-title"
        >
          <div className={`${styles.container} ${styles.trainGrid}`}>
            <div>
              <p className={styles.eyebrow}>03 / TRAIN</p>
              <h2 id="train-title">
                {t("trainTitle1")}
                <br />
                {t("trainTitle2")}
              </h2>
              <p className={styles.productRole}>
                MUEDear — {portal("train.role")}
              </p>
              <p className={styles.description}>{portal("train.origin")}</p>
              <ProductLink
                href={MUEDEAR_APP_STORE_URL}
                product="muedear"
                location="portal_train"
                external
                preview={preview}
                className={styles.textLink}
              >
                {portal("train.cta")}{" "}
                <ArrowUpRight size={20} aria-hidden="true" />
              </ProductLink>
            </div>
            <figure className={styles.earFigure}>
              <Image
                src="/images/muedear/mufreq.webp"
                width={2622}
                height={1206}
                alt={t("earAlt")}
                sizes="(min-width: 900px) 600px, 90vw"
              />
              <figcaption>MUEDear / MuFreQ</figcaption>
            </figure>
          </div>
        </section>

        <section className={styles.closing} aria-label={t("philosophy")}>
          <div className={styles.container}>
            <Image src="/hoo-animated.svg" width={70} height={45} alt="" />
            <p>{portal("philosophy.quote")}</p>
            <span>{portal("designer")}</span>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerMain}>
            <Link
              href={homePath}
              className={styles.footerWordmark}
              aria-label={preview ? t("home") : "MUED"}
            >
              MUED<span>.</span>
            </Link>
            <p>
              {t("footerLine")}
              <br />
              <a href="https://www.glasswerks.jp">
                glasswerks inc. <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </p>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} glasswerks inc.</span>
            <nav aria-label={t("footerNavigation")}>
              <Link href={`/${locale}/support`}>{t("support")}</Link>
              <Link href={`/${locale}/privacy`}>{t("privacy")}</Link>
              <Link href={`/${locale}/tokushoho`}>{t("legal")}</Link>
              {locale === "ja" && <Link href="/ja/advisory">AI開発の相談</Link>}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
