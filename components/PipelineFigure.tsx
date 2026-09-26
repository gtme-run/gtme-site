import {
  describePipeline,
  layoutPipeline,
  FONT,
  SMALL,
  type Pipeline,
} from "@/lib/pipeline";

// The pipeline figure: source at the top, one box per step, `when:` as a
// gate on the edge into its step, deliver at the bottom, the ledger as a bus
// alongside. Rendered on the server as inline SVG so it styles from the
// page's tokens and needs no script. Each box carries data-step so the
// prose, the YAML, and the figure can be bound later.

const LINE = 16;

export default function PipelineFigure({
  pipeline,
  id,
}: {
  pipeline: Pipeline;
  id: string;
}) {
  const l = layoutPipeline(pipeline);
  const description = describePipeline(pipeline);
  const arrow = `${id}-arrow`;
  const arrowBack = `${id}-arrow-back`;

  return (
    <figure className="pipeline-figure" data-pipeline={pipeline.name ?? ""}>
      <svg
        viewBox={`0 0 ${l.width} ${l.height}`}
        width={l.width}
        height={l.height}
        role="img"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
      >
        <title id={`${id}-title`}>
          {pipeline.name ? `Pipeline ${pipeline.name}` : "Pipeline"}
        </title>
        <desc id={`${id}-desc`}>{description}</desc>
        <defs>
          <marker
            id={arrow}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="pf-arrowhead" />
          </marker>
          <marker
            id={arrowBack}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="pf-arrowhead pf-muted" />
          </marker>
        </defs>

        {/* The ledger bus: a cylinder the height of the pipeline. */}
        <g className="pf-ledger" data-ledger="">
          <rect
            x={l.ledger.x}
            y={l.ledger.y}
            width={l.ledger.w}
            height={l.ledger.h}
            rx={l.ledger.w / 2}
            ry={6}
          />
          <ellipse
            cx={l.ledger.x + l.ledger.w / 2}
            cy={l.ledger.y + 6}
            rx={l.ledger.w / 2}
            ry={6}
          />
          <text
            x={l.ledger.x + l.ledger.w / 2}
            y={l.ledger.labelY}
            textAnchor="middle"
            fontSize={SMALL}
          >
            ledger
          </text>
        </g>

        {/* Dotted taps: every step writes; readers get an arrow back. */}
        {l.taps.map((t) => (
          <line
            key={t.id}
            className="pf-tap"
            data-step={t.id}
            x1={t.x1}
            y1={t.y}
            x2={t.x2}
            y2={t.y}
            markerEnd={`url(#${arrow})`}
            markerStart={t.reads ? `url(#${arrowBack})` : undefined}
          />
        ))}

        {/* Record flow, top to bottom, with a gate where the YAML has when:. */}
        {l.edges.map((e) => {
          if (!e.gate) {
            return (
              <line
                key={e.to}
                className="pf-edge"
                x1={e.x}
                y1={e.y1}
                x2={e.x}
                y2={e.y2}
                markerEnd={`url(#${arrow})`}
              />
            );
          }
          const gy = e.gateY!;
          const g = 14;
          return (
            <g key={e.to} className="pf-gate" data-step={e.to}>
              <line className="pf-edge" x1={e.x} y1={e.y1} x2={e.x} y2={gy - g} />
              <path
                className="pf-diamond"
                d={`M ${e.x} ${gy - g} L ${e.x + g} ${gy} L ${e.x} ${gy + g} L ${e.x - g} ${gy} z`}
              />
              <line
                className="pf-edge"
                x1={e.x}
                y1={gy + g}
                x2={e.x}
                y2={e.y2}
                markerEnd={`url(#${arrow})`}
              />
              <text
                className="pf-gate-label"
                x={e.x - g - 8}
                y={gy + SMALL / 3}
                textAnchor="end"
                fontSize={SMALL}
              >
                when: {e.gate}
              </text>
            </g>
          );
        })}

        {/* The boxes. */}
        {l.nodes.map((n) => (
          <g key={n.id} className={`pf-node pf-${n.role}`} data-step={n.id}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={4} />
            <text
              className="pf-id"
              x={n.x + n.w / 2}
              y={n.y + 6 + LINE - 4}
              textAnchor="middle"
              fontSize={FONT}
              fontWeight={600}
            >
              {n.id}
            </text>
            <text
              className="pf-use"
              x={n.x + n.w / 2}
              y={n.y + 6 + 2 * LINE - 4}
              textAnchor="middle"
              fontSize={FONT}
            >
              {n.use}
            </text>
            {n.tags.map((t, i) => (
              <text
                key={t}
                className="pf-tag"
                x={n.x + n.w / 2}
                y={n.y + 6 + 2 * LINE + (i + 1) * (SMALL + 3) - 3}
                textAnchor="middle"
                fontSize={SMALL}
              >
                {t}
              </text>
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="visually-hidden">{description}</figcaption>
    </figure>
  );
}
