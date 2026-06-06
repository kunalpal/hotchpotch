export default function SectionHeading({
  title,
  className,
  ...props
}: {
  title: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      <div className="font-serif text-xl font-medium">{title}</div>
      <div className="bg-primary mt-1 h-[3px] w-4 rounded-full" />
    </div>
  );
}
