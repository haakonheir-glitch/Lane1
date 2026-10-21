export function ReportHeader({
  title,
  subject,
  fields,
}: {
  title: string;
  subject: string;
  fields: { label: string; value: string }[];
}) {
  return (
    <header className="border-b border-rule-strong pb-8">
      <p className="label text-ink-3">{title}</p>
      <h1 className="mt-4 text-h1 font-medium text-ink">{subject}</h1>
      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <dt className="label text-ink-3">{f.label}</dt>
            <dd className="font-mono text-small text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

