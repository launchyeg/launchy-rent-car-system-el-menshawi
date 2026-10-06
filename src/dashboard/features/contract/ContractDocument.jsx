// Renders the structure from buildContract(). All wording comes from
// src/content/contractTemplate.js; this only decides how it looks.

function Segments({ segments }) {
  return segments.map((segment, index) =>
    segment.type === "blank" ? (
      <span key={index} className="contract-blank" aria-label="فراغ للتعبئة باليد">
        &nbsp;
      </span>
    ) : (
      <span key={index}>{segment.value}</span>
    ),
  );
}

export default function ContractDocument({ contract }) {
  return (
    <article className="contract-sheet" lang="ar" dir="rtl">
      <h1 className="contract-title">{contract.title}</h1>

      <div className="contract-header">
        {contract.headerLines.map((segments, index) => (
          <p key={index}>
            <Segments segments={segments} />
          </p>
        ))}
      </div>

      <p>
        <Segments segments={contract.opening} />
      </p>
      {contract.parties.map((segments, index) => (
        <p key={index}>
          <Segments segments={segments} />
        </p>
      ))}

      <h2 className="contract-section-heading">{contract.carHeading}</h2>
      {contract.carLines.map((segments, index) => (
        <p key={index}>
          <Segments segments={segments} />
        </p>
      ))}

      {contract.articles.map((article) => (
        <p key={article.number} className="contract-article">
          <span className="contract-article-number">
            <Segments segments={article.heading} />
          </span>{" "}
          <Segments segments={article.segments} />
        </p>
      ))}

      <section className="contract-signatures">
        <h2 className="contract-section-heading">{contract.signatures.heading}</h2>
        <div className="contract-signature-columns">
          {contract.signatures.columns.map((column) => (
            <div key={column.title}>
              <p className="contract-signature-title">{column.title}</p>
              {column.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
