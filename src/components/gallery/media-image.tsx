import { getPresignedUrl, type MediaVariantSize } from "@/server/services/media";

interface MediaImageProps {
  alt: string;
  media: {
    height: number | null;
    objectKey: string;
    variants: Array<{ label: string; objectKey: string }>;
    width: number | null;
  };
  size: MediaVariantSize;
}

export async function MediaImage({ alt, media, size }: MediaImageProps) {
  const src = await getPresignedUrl(media, size);

  return (
    <img
      alt={alt}
      className="h-full w-full rounded-2xl object-cover"
      height={media.height ?? undefined}
      loading="lazy"
      src={src}
      width={media.width ?? undefined}
    />
  );
}
