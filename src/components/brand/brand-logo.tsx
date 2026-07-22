import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

export type BrandLogoTone = "default" | "onDark" | "auto";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  /**
   * - default: dark logo for light backgrounds
   * - onDark: white logo for dark backgrounds
   * - auto: switches with dark mode (default)
   */
  tone?: BrandLogoTone;
}

const sizeMap = {
  sm: { width: 200, height: 40, className: "h-10 w-auto" },
  md: { width: 240, height: 48, className: "h-12 w-auto" },
  lg: { width: 280, height: 56, className: "h-14 w-auto" },
  xl: { width: 320, height: 64, className: "h-16 w-auto" },
  "2xl": { width: 400, height: 80, className: "h-20 w-auto" },
};

function LogoImage({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("shrink-0 object-contain object-left", className)}
      priority
    />
  );
}

export function BrandLogo({
  href = "/",
  size = "md",
  className,
  tone = "auto",
}: BrandLogoProps) {
  const { width, height, className: sizeClass } = sizeMap[size];
  const { logo, logoOnDark } = siteConfig.brand;

  const image =
    tone === "auto" ? (
      <>
        <LogoImage
          src={logo}
          alt={siteConfig.name}
          width={width}
          height={height}
          className={cn(sizeClass, "dark:hidden")}
        />
        <LogoImage
          src={logoOnDark}
          alt={siteConfig.name}
          width={width}
          height={height}
          className={cn(sizeClass, "hidden dark:block")}
        />
      </>
    ) : (
      <LogoImage
        src={tone === "onDark" ? logoOnDark : logo}
        alt={siteConfig.name}
        width={width}
        height={height}
        className={sizeClass}
      />
    );

  if (href) {
    return (
      <Link
        href={href}
        className={cn("inline-flex items-center", className)}
        aria-label={`${siteConfig.name} home`}
      >
        {image}
      </Link>
    );
  }

  return <div className={cn("inline-flex items-center", className)}>{image}</div>;
}
