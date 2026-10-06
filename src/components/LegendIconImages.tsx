interface Props {
  imageUrl: string;
  imageUrl2?: string;
}

export function LegendIconImages({ imageUrl, imageUrl2 }: Props) {
  const urls = [...new Set([imageUrl, imageUrl2].map((url) => url?.trim()).filter((url): url is string => Boolean(url)))];

  return (
    <div className="flex h-16 min-w-16 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background/60 px-2">
      {urls.map((url) => (
        <img key={url} src={url} alt="" className="max-h-12 max-w-12 object-contain" />
      ))}
    </div>
  );
}
