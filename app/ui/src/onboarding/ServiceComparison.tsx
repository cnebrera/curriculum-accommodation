import { useStrings } from '../i18n/context.js';
import { Callout } from '../components/Callout.js';
import { formatDate, type Service } from './services.js';

/**
 * The full list, comparing what actually decides it (009 T020–T023, FR-710).
 *
 * Not a feature matrix. The columns are the seven things a teacher and her
 * school actually weigh: does it need a card, is any of it free and what is the
 * limit, what does a worksheet cost, where is it processed, what do the terms
 * say about training, does it read photographs, who is it for.
 *
 * Every number and every claim carries its check date (FR-706), and nothing here
 * is presented as approval (FR-711) — these are third-party statements with a
 * date on them, which is a different thing from a recommendation and a very
 * different thing from a certification.
 */
export function ServiceComparison({
  services, onChoose, onBack,
}: {
  services: Service[];
  onChoose: (id: string) => void;
  onBack: () => void;
}) {
  const { t: es } = useStrings();
  const c = es.connect;

  const anyAgeing = services.some((s) => s.freshness === 'ageing');
  const anyAggregator = services.some((s) => s.jurisdiction === 'varies');
  const anyUnmeasured = services.some((s) => s.quality === 'unmeasured');

  return (
    <div className="stack gap5">
      <div className="stack gap2">
        <h2>{c.compareTitle}</h2>
        <p className="lede">{c.compareIntro}</p>
      </div>

      {anyUnmeasured ? <Callout intent="info" title={c.provisional}>{c.provisionalWhy}</Callout> : null}
      {anyAgeing ? <Callout intent="decide" title={c.checkedAgo(0).split(' hace')[0]}>{c.ageingWhy}</Callout> : null}

      {/*
        Its own horizontal scroll container. Eight columns of real sentences do
        not fit 1366px however carefully they are set, and the page body must
        never scroll sideways (spec 010 SC-802).
      */}
      <div className="table-scroll">
        <table className="compare">
          <caption className="sr-only">{c.compareTitle}</caption>
          <thead>
            <tr>
              <th scope="col">{c.colService}</th>
              <th scope="col">{c.colCard}</th>
              <th scope="col">{c.colFree}</th>
              <th scope="col">{c.colCost}</th>
              <th scope="col">{c.colWhere}</th>
              <th scope="col">{c.colTrains}</th>
              <th scope="col">{c.colPhotos}</th>
              <th scope="col">{c.colSuits}</th>
              <th scope="col"><span className="sr-only">Elegir</span></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <th scope="row">
                  <span className="svc">{s.label}</span>
                  <span className="meta">{s.vendor}</span>
                  {/*
                    T021 · FR-706. The date is per row, not per page: entries are
                    checked one at a time and a single page-level date would be
                    wrong for five of the six.
                  */}
                  <span className="meta">
                    {s.freshness === 'ageing'
                      ? `⚠ ${c.checkedAgo(s.monthsSinceChecked)}`
                      : c.checkedOn(formatDate(s.lastChecked))}
                  </span>
                </th>

                <td>{s.requiresCard ? c.cardNeeded : c.cardNotNeeded}</td>

                <td>{s.freeTier ?? c.no}</td>

                <td>
                  {s.costCents === 0
                    ? 'gratis'
                    : `~${s.costCents} céntimo${s.costCents === 1 ? '' : 's'}`}
                  {/*
                    T022 · research R6. No figure in this catalogue has been
                    measured yet, so every one of them says so. A cost presented
                    as measured would be a fabrication, and it is the number a
                    school will quote back.
                  */}
                  {!s.costMeasured
                    ? <span className="meta" title={c.estimateWhy}> ({c.estimate})</span>
                    : null}
                </td>

                <td>
                  {s.processedIn}
                  {s.jurisdiction === 'varies'
                    ? <span className="meta"> · depende</span>
                    : null}
                </td>

                <td>{c.trains[s.trainsOnInput] ?? s.trainsOnInput}</td>

                <td>{s.vision ? c.photosYes : c.photosNo}</td>

                <td className="suits">{s.suits}</td>

                <td>
                  <button className="btn btn-sm" onClick={() => onChoose(s.id)}>
                    {c.recommendUse}
                    <span className="sr-only"> {s.label}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*
        T023. An aggregator answers "where is it processed" with *depende*, and a
        school cannot act on *depende* — so it is flagged in words rather than
        left to be inferred from a row that reads plausibly.
      */}
      {anyAggregator ? <Callout intent="decide" title="depende">{c.aggregator}</Callout> : null}

      <div className="stack gap3">
        <p className="small">{c.residual}</p>
        <div className="row">
          <button className="btn btn-ghost" onClick={onBack}>{c.recommendBack}</button>
        </div>
      </div>
    </div>
  );
}
