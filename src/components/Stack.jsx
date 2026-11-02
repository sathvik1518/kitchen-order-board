/** Lays children out in a row or column with an even gap. gap is in steps of 4px. */
export default function Stack({ direction = "column", gap = 2, align, justify, wrap = false, as: Tag = "div", children, ...rest }) {
  return (
    <Tag
      className="stack"
      style={{ flexDirection: direction, gap: `calc(var(--space) * ${gap})`, alignItems: align, justifyContent: justify, flexWrap: wrap ? "wrap" : undefined }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
