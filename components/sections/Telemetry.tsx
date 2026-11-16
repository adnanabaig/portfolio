// The instrument row under the hero. Values are real DOM text derived in
// lib/facts.ts; the segmented gauge is decorative and fully lit (it is not a
// scale), filling once on load when motion is allowed.
import { telemetry } from "../../lib/facts";

const SEGMENTS = 8;

const Telemetry = () => (
  <dl className="telemetry" aria-label="Telemetry">
    {telemetry.map((item) => (
      <div key={item.label} className="telemetry__item" data-accent={item.accent}>
        <dt className="telemetry__label">{item.label}</dt>
        <dd className="telemetry__value">{item.value}</dd>
        <dd className="telemetry__gauge" aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <i key={i} style={{ animationDelay: `${400 + i * 60}ms` }} />
          ))}
        </dd>
      </div>
    ))}
  </dl>
);

export default Telemetry;
