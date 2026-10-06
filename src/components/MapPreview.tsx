interface Props {
  imageUrl: string;
  mapUrl?: string;
  alt: string;
}

export function MapPreview({ imageUrl, mapUrl, alt }: Props) {
  const image = (
    <img
      src={imageUrl}
      alt={alt}
      className="h-auto w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
      loading="lazy"
    />
  );

  if (!mapUrl?.trim()) {
    return <div className="overflow-hidden rounded-lg border border-border">{image}</div>;
  }

  return (
    <a
      href={mapUrl.trim()}
      target="_blank"
      rel="noreferrer noopener"
      className="group block overflow-hidden rounded-lg border border-border"
      aria-label="Otevřít interaktivní mapu míst"
    >
      {image}
    </a>
  );
}
