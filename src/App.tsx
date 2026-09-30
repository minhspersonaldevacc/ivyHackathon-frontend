import { useCallback, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import StepModel from "./StepModel";
import "./App.css";

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    spark: (
      <>
        <path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z" />
        <path d="m20 2 .7 1.3L22 4l-1.3.7L20 6l-.7-1.3L18 4l1.3-.7Z" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
      </>
    ),
    cube: (
      <>
        <path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10v10M3 7l9 5 9-5M7.5 4.5l9 5v5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    reset: (
      <>
        <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />
      </>
    ),
    expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6" />,
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" fill="currentColor" />
        <circle cx="16" cy="17" r="3" fill="currentColor" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 1 1 4 3v2m-1 3h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    file: (
      <>
        <path d="M14 2H5v20h14V7Zm0 0v6h5M8 13h8M8 17h6" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    sort: (
      <>
        <path d="M8 4v16m-4-4 4 4 4-4M16 20V4m-4 4 4-4 4 4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.cube}
    </svg>
  );
}
function Panda() {
  return (
    <svg viewBox="0 0 48 48" width="39" height="39" aria-label="Panda logo">
      <circle cx="12" cy="12" r="8" fill="white" />
      <circle cx="36" cy="12" r="8" fill="white" />
      <ellipse cx="24" cy="26" rx="20" ry="18" fill="white" />
      <ellipse
        cx="16"
        cy="25"
        rx="6"
        ry="7"
        transform="rotate(25 16 25)"
        fill="#171719"
      />
      <ellipse
        cx="32"
        cy="25"
        rx="6"
        ry="7"
        transform="rotate(-25 32 25)"
        fill="#171719"
      />
      <circle cx="17" cy="24" r="2" fill="white" />
      <circle cx="31" cy="24" r="2" fill="white" />
      <path d="M20 34q4-5 8 0l-4 3Z" fill="#171719" />
    </svg>
  );
}
const parts = [
  {
    id: "PRT-00428",
    name: "Mounting Bracket A-12",
    material: "Aluminum 6061",
    category: "3-axis milling",
    similarity: 98.2,
    variant: 0,
    price: 42.5,
    date: "Sep 24, 2026",
  },
  {
    id: "PRT-00391",
    name: "Support Bracket B-08",
    material: "Aluminum 6061",
    category: "3-axis milling",
    similarity: 94.6,
    variant: 1,
    price: 38,
    date: "Sep 18, 2026",
  },
  {
    id: "PRT-00356",
    name: "Angle Mount C-04",
    material: "Aluminum 7075",
    category: "3-axis milling",
    similarity: 89.3,
    variant: 0,
    price: 56.2,
    date: "Sep 12, 2026",
  },
  {
    id: "PRT-00287",
    name: "Base Plate D-16",
    material: "Stainless Steel 304",
    category: "3-axis milling",
    similarity: 76.8,
    variant: 2,
    price: 64,
    date: "Sep 08, 2026",
  },
  {
    id: "PRT-00214",
    name: "Flanged Spacer F-02",
    material: "Aluminum 6061",
    category: "CNC turning",
    similarity: 62.4,
    variant: 3,
    price: 27.8,
    date: "Sep 02, 2026",
  },
];
function App() {
  const [tab, setTab] = useState("similarity"),
    [file, setFile] = useState(""),
    [modelFile, setModelFile] = useState<File | null>(null),
    [tolerance, setTolerance] = useState(80),
    [material, setMaterial] = useState("All materials"),
    [searched, setSearched] = useState(true),
    [onlyMatches, setOnlyMatches] = useState(true),
    [sort, setSort] = useState(true),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(parts[0].id),
    [uploaded, setUploaded] = useState(false),
    [comparison, setComparison] = useState(false),
    [zoom, setZoom] = useState(1),
    [resetToken, setResetToken] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [expanded, setExpanded] = useState(false),
    [features, setFeatures] = useState(true),
    [threshold, setThreshold] = useState(80),
    [searchMaterial, setSearchMaterial] = useState("All materials");
  const onModelError = useCallback(
    (message: string) => setNotice(`Could not display CAD model: ${message}`),
    [],
  );
  const input = useRef<HTMLInputElement>(null);
  const matches = parts.filter(
    (p) =>
      p.similarity >= threshold &&
      (searchMaterial === "All materials" || p.material === searchMaterial),
  );
  const visible = parts
    .filter(
      (p) =>
        (!searched || !onlyMatches || matches.includes(p)) &&
        `${p.name} ${p.id} ${p.material}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort && searched
        ? b.similarity - a.similarity
        : a.name.localeCompare(b.name),
    );
  const chosen = parts.find((p) => p.id === selected);
  function upload(f?: File) {
    if (!f) return;
    if (!/\.(step|stp|iges|igs)$/i.test(f.name)) {
      setNotice("Please choose a STEP or IGES file.");
      return;
    }
    setModelFile(f);
    setFile(f.name);
    setUploaded(true);
    setSearched(false);
    setComparison(false);
    setNotice("");
  }
  function search() {
    setBusy(true);
    setTimeout(() => {
      setThreshold(tolerance);
      setSearchMaterial(material);
      setSearched(true);
      setOnlyMatches(true);
      setBusy(false);
    }, 850);
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setTab("similarity")}>
          <Panda />
          <span>
            panda<span className="brand-suffix">cnc</span>
            <small>PRECISION. CONNECTED.</small>
          </span>
        </a>
        <div className="workspace-picker">
          <span className="workspace-avatar">AC</span>
          <span>
            Acme Manufacturing<small>Team workspace</small>
          </span>
          <Icon name="down" size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          <button
            className={tab === "similarity" ? "nav-item active" : "nav-item"}
            onClick={() => setTab("similarity")}
          >
            <Icon name="spark" />
            AI similarity check
            <Icon name="chevron" size={15} />
          </button>
          <button
            className={tab === "database" ? "nav-item active" : "nav-item"}
            onClick={() => setTab("database")}
          >
            <Icon name="database" />
            Database viewer<span className="wip">WIP</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-status">
            <span className="status-dot" /> Your workspace is up to date
            <small>5 demo parts in your database</small>
          </div>
          <button
            className="nav-item"
            onClick={() =>
              setNotice(
                "Upload a CAD file, adjust the similarity threshold, then search. Load a result to compare both models. This workspace uses demonstration data.",
              )
            }
          >
            <Icon name="help" />
            Help & getting started
            <Icon name="chevron" size={14} />
          </button>
          <div className="profile">
            <div className="avatar">JD</div>
            <div>
              Jamie Davis<small>Workspace admin</small>
            </div>
            <span className="profile-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace
            <Icon name="chevron" size={13} />
            <span>
              {tab === "similarity" ? "AI similarity check" : "Database viewer"}
            </span>
          </div>
          <div className="topbar-right">
            <span className="demo-tag">DEMO WORKSPACE</span>
            <span className="header-divider" />
            <span className="small-avatar">JD</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">LESS SEARCHING. MORE MAKING.</div>
              <h1>
                {tab === "similarity"
                  ? "Find your next quote in your past work."
                  : "Database viewer"}
              </h1>
              <p>
                {tab === "similarity"
                  ? "Compare CAD models, discover similar parts, and quote with confidence."
                  : "Your manufacturing knowledge, all in one place."}
              </p>
            </div>
            <button
              className="button upload-button"
              onClick={() => input.current?.click()}
            >
              <Icon name="upload" size={17} />
              Upload CAD file
            </button>
            <input
              hidden
              ref={input}
              type="file"
              accept=".step,.stp,.iges,.igs"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </div>
          {notice && (
            <div className="notice">
              <Icon name="help" size={17} />
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}
          {tab === "database" ? (
            <section className="empty-database">
              <Icon name="database" size={36} />
              <h2>A home for every part.</h2>
              <p>Your database viewer is taking shape.</p>
              <span className="tag">WORK IN PROGRESS</span>
            </section>
          ) : (
            <>
              <div className="content-grid">
                <div className="left-column">
                  <section
                    className={`panel viewer-panel ${expanded ? "expanded" : ""}`}
                  >
                    <div className="panel-heading">
                      <h2>
                        <Icon name="cube" size={18} />
                        Model workspace
                      </h2>
                      <span className="live-label">
                        <span />
                        INTERACTIVE PREVIEW
                      </span>
                    </div>
                    <div
                      className="viewer"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        upload(e.dataTransfer.files[0]);
                      }}
                    >
                      <div className="viewer-file">
                        <Icon name="file" size={16} />
                        <span>{file || "No file uploaded"}</span>
                        {file && <span className="file-type">{file.split(".").pop()?.toUpperCase()}</span>}
                      </div>
                      <div className="model-stage">
                        <StepModel
                          file={modelFile}
                          uploadedVisible={uploaded}
                          comparisonVisible={comparison}
                          comparisonVariant={chosen ? chosen.variant : null}
                          zoom={zoom}
                          resetToken={resetToken}
                          onError={onModelError}
                        />
                      </div>
                      <div className="view-label">
                        PERSPECTIVE <span>·</span> SOLID
                      </div>
                      <div className="viewer-tools">
                        <button
                          aria-label="Zoom in"
                          onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                        >
                          <Icon name="plus" size={17} />
                        </button>
                        <button
                          aria-label="Zoom out"
                          onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                        >
                          <Icon name="minus" size={17} />
                        </button>
                        <div />
                        <button
                          aria-label="Reset view"
                          onClick={() => {
                            setZoom(1);
                            setResetToken((token) => token + 1);
                          }}
                        >
                          <Icon name="reset" size={17} />
                        </button>
                        <button
                          aria-label={
                            expanded ? "Exit fullscreen" : "Expand viewer"
                          }
                          onClick={() => setExpanded(!expanded)}
                        >
                          <Icon name="expand" size={17} />
                        </button>
                      </div>
                      <div className="axis">
                        <span className="axis-z">Z</span>
                        <span className="axis-y">Y</span>
                        <span className="axis-x">X</span>
                        <svg width="55" height="55">
                          <path
                            d="M26 28V7M26 28 8 39M26 28l20 11"
                            stroke="#9aa1ab"
                            fill="none"
                          />
                          <circle cx="26" cy="28" r="3" fill="#89919b" />
                        </svg>
                      </div>
                      <div className="viewer-hint">
                        Drag to rotate <span>·</span> Use + / − to zoom
                      </div>
                      <div className="viewer-visibility" role="group" aria-label="Model visibility">
                      <div className="visibility-heading">MODEL VISIBILITY</div>
                      <label title={file || "Upload a STEP file to enable this model"}>
                        <i className="legend-dot gray" />
                        <span>Uploaded</span>
                        <input
                          type="checkbox"
                          role="switch"
                          aria-label="Show uploaded model"
                          checked={uploaded}
                          disabled={!modelFile}
                          onChange={(e) => setUploaded(e.target.checked)}
                        />
                      </label>
                      <label title={chosen?.name || "Load a database model to enable comparison"}>
                        <i className="legend-dot red" />
                        <span>Comparison</span>
                        <input
                          type="checkbox"
                          role="switch"
                          aria-label="Show comparison model"
                          checked={comparison}
                          disabled={!chosen}
                          onChange={(e) => setComparison(e.target.checked)}
                        />
                      </label>
                      <button
                        className="visibility-both"
                        disabled={!modelFile || !chosen}
                        onClick={() => { setUploaded(true); setComparison(true); }}
                      >
                        Show both
                      </button>
                      </div>
                    </div>
                  </section>
                  <section className="panel settings-panel">
                    <div className="panel-heading">
                      <h2>
                        <Icon name="settings" size={18} />
                        Search configuration
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => {
                          setTolerance(80);
                          setMaterial("All materials");
                          setFeatures(true);
                        }}
                      >
                        Reset
                      </button>
                    </div>
                    <div className="settings-body">
                      <div className="setting-label">
                        <label htmlFor="tolerance">
                          Minimum similarity{" "}
                          <span
                            className="info-circle"
                            title="Only parts at or above this similarity are included"
                          >
                            i
                          </span>
                        </label>
                        <span className="value-badge">
                          {tolerance}
                          <small>%</small>
                        </span>
                      </div>
                      <input
                        id="tolerance"
                        type="range"
                        min="50"
                        max="100"
                        value={tolerance}
                        style={
                          {
                            "--range": `${(tolerance - 50) * 2}%`,
                          } as CSSProperties
                        }
                        onChange={(e) => setTolerance(+e.target.value)}
                      />
                      <div className="range-labels">
                        <span>50% · Broader results</span>
                        <span>100% · Exact match</span>
                      </div>
                      <div className="config-row">
                        <div>
                          <label htmlFor="material">Material</label>
                          <div className="select-wrap">
                            <select
                              id="material"
                              value={material}
                              onChange={(e) => setMaterial(e.target.value)}
                            >
                              <option>All materials</option>
                              <option>Aluminum 6061</option>
                              <option>Aluminum 7075</option>
                              <option>Stainless Steel 304</option>
                            </select>
                            <Icon name="down" size={14} />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="analysis">Analysis mode</label>
                          <div className="select-wrap">
                            <select id="analysis">
                              <option>Geometry + features</option>
                              <option>Geometry only</option>
                            </select>
                            <Icon name="down" size={14} />
                          </div>
                        </div>
                      </div>
                      <label className="feature-check">
                        <input
                          type="checkbox"
                          checked={features}
                          onChange={(e) => setFeatures(e.target.checked)}
                        />
                        Normalize model scale
                        <span
                          className="info-circle"
                          title="Compare shapes independently of size"
                        >
                          i
                        </span>
                      </label>
                      <button
                        className="search-button"
                        onClick={search}
                        disabled={busy}
                      >
                        <Icon name={busy ? "reset" : "spark"} size={18} />
                        {busy ? "Analyzing models…" : "Find similar parts"}
                        <Icon name="arrow" size={18} />
                      </button>
                      <div className="search-footnote">
                        <span className="tiny-dot" />
                        Demo similarity engine
                        <span>5 parts ready to compare</span>
                      </div>
                    </div>
                  </section>
                </div>
                <section className="panel database-panel">
                  <div className="panel-heading">
                    <h2>
                      <Icon name="database" size={18} />
                      Parts database <span className="count">5</span>
                    </h2>
                    <span className="subtle">Your manufacturing history</span>
                  </div>
                  <div className="database-controls">
                    <div className="search-input">
                      <Icon name="search" size={17} />
                      <input
                        placeholder="Search parts, IDs, or materials..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <span>⌘ K</span>
                    </div>
                    <div className="filter-row">
                      <label className="switch-label">
                        <button
                          role="switch"
                          aria-checked={onlyMatches}
                          aria-label="Show matches only"
                          className={`switch ${onlyMatches ? "on" : ""}`}
                          onClick={() => setOnlyMatches(!onlyMatches)}
                        >
                          <span />
                        </button>
                        Matches only
                      </label>
                      <button
                        className={`sort-button ${sort ? "sorted" : ""}`}
                        onClick={() => setSort(!sort)}
                      >
                        <Icon name="sort" size={15} />
                        {sort ? "Similarity" : "Part name"}
                        <Icon name="down" size={13} />
                      </button>
                    </div>
                  </div>
                  {searched && (
                    <div className="results-summary">
                      <span className="match-icon">
                        <Icon name="check" size={13} />
                      </span>
                      <span>
                        <strong>{matches.length} similar parts found</strong>{" "}
                        above {threshold}% similarity
                      </span>
                      <span className="search-duration">0.8s</span>
                    </div>
                  )}
                  <div className="parts-list">
                    {visible.map((part, index) => (
                      <article
                        className={`part-card ${selected === part.id ? "selected" : ""}`}
                        key={part.id}
                      >
                        <div className="part-thumbnail">
                          <Icon name="cube" size={27} />
                          <span>CAD</span>
                        </div>
                        <div className="part-content">
                          <div className="part-title-row">
                            <span className="part-id">{part.id}</span>
                            {searched && (
                              <span
                                className={`similarity ${matches.includes(part) ? "match" : ""}`}
                              >
                                {part.similarity}% <span>match</span>
                              </span>
                            )}
                          </div>
                          <h3>{part.name}</h3>
                          <div className="part-tags">
                            <span>{part.material}</span>
                            <span>{part.category}</span>
                          </div>
                          <div className="part-card-footer">
                            <span>
                              Last quote{" "}
                              <strong>
                                ${part.price.toFixed(2)}
                                <small> / unit</small>
                              </strong>
                            </span>
                            <button
                              className={
                                comparison && selected === part.id
                                  ? "loaded-button"
                                  : "load-button"
                              }
                              onClick={() => {
                                setSelected(part.id);
                                setComparison(true);
                              }}
                            >
                              <Icon
                                name={
                                  comparison && selected === part.id
                                    ? "check"
                                    : "cube"
                                }
                                size={14}
                              />
                              {comparison && selected === part.id
                                ? "Loaded"
                                : "Load model"}
                            </button>
                          </div>
                        </div>
                        {index === 0 && searched && sort && (
                          <div className="best-match">BEST MATCH</div>
                        )}
                      </article>
                    ))}
                    {visible.length === 0 && (
                      <div className="no-results">
                        <Icon name="search" size={28} />
                        <h3>No parts found</h3>
                        <p>
                          Try a lower similarity threshold or a different
                          filter.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="database-bottom">
                    <span>
                      Showing {visible.length} of {parts.length} parts
                    </span>
                    <span>
                      <i className="legend-dot red" /> Built from your
                      experience
                    </span>
                  </div>
                </section>
              </div>
              <div className="bottom-tip">
                <span>
                  <Icon name="spark" size={17} />
                  <strong>A familiar part. A faster quote.</strong> Use past
                  work as your starting point for your next project.
                </span>
                <span>Made for the shop floor.</span>
              </div>
            </>
          )}
          <footer>
            <span>© 2026 Panda CNC</span>
            <span>Precision starts with better knowledge.</span>
            <span>
              <span className="status-dot" />
              All systems operational
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
export default App;
