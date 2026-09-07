export default async function IdeaPage({
  params,
}: {
  params: Promise<{ ideaId: string }>;
}) {
  const { ideaId } = await params;

  return (
    <section className="placeholder-card">
      <p className="eyebrow">Idea document</p>
      <h1>{ideaId}</h1>
      <p>The downloadable Markdown preview arrives in Item 8.</p>
    </section>
  );
}
