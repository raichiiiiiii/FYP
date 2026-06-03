import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';
import type { RoleEntry } from './Sidebar';

interface Props { role: RoleEntry; }

type NodeType = 'org' | 'opportunity' | 'contract' | 'financier' | 'buyer' | 'channel';

interface GraphNode {
  id: string;
  label: string;
  sub?: string;
  type: NodeType;
  status: string;
  risk: 'low' | 'medium' | 'high';
  x: number;
  y: number;
  logoColor?: string;
  initials?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
  type: 'procurement' | 'finance' | 'mudarabah' | 'delivery' | 'channel';
}

const NODES: GraphNode[] = [
  { id: 'techbuild',   label: 'TechBuild Sdn Bhd',    sub: 'SME Mudarib',       type: 'org',         status: 'ACTIVE',        risk: 'low',    x: 400, y: 290, logoColor: '#0ea5e9', initials: 'TB' },
  { id: 'mega',        label: 'Mega Components',       sub: 'Approved Supplier', type: 'org',         status: 'ACTIVE',        risk: 'low',    x: 110, y: 190, logoColor: '#059669', initials: 'MC' },
  { id: 'techparts',   label: 'TechParts Asia',        sub: 'Approved Supplier', type: 'org',         status: 'ACTIVE',        risk: 'medium', x: 110, y: 390, logoColor: '#10b981', initials: 'TA' },
  { id: 'solartech',   label: 'SolarTech Industries',  sub: 'End Buyer',         type: 'buyer',       status: 'ACTIVE',        risk: 'low',    x: 700, y: 190, logoColor: '#3b82f6', initials: 'SI' },
  { id: 'amanah',      label: 'Amanah Islamic Bank',   sub: 'Rabb-ul-Mal',       type: 'financier',   status: 'ACTIVE',        risk: 'low',    x: 700, y: 390, logoColor: '#7c3aed', initials: 'AI' },
  { id: 'opp001',      label: 'OPP-2024-001',          sub: 'Solar Panel Supply',type: 'opportunity', status: 'DUE_DILIGENCE', risk: 'medium', x: 400, y: 110, logoColor: '#ca8a04', initials: 'OP' },
  { id: 'contract001', label: 'CONTRACT-001',           sub: 'Mudarabah',         type: 'contract',    status: 'PENDING',       risk: 'low',    x: 565, y: 450, logoColor: '#a855f7', initials: 'CT' },
  // Hyperledger Fabric channel nodes — orgs never connect directly
  { id: 'ch-mega-tb',   label: 'HLF Channel', sub: 'Mega ↔ TechBuild',   type: 'channel', status: 'ACTIVE', risk: 'low', x: 255, y: 228 },
  { id: 'ch-parts-tb',  label: 'HLF Channel', sub: 'Parts ↔ TechBuild',  type: 'channel', status: 'ACTIVE', risk: 'low', x: 255, y: 352 },
  { id: 'ch-tb-solar',  label: 'HLF Channel', sub: 'TechBuild ↔ Buyer',  type: 'channel', status: 'ACTIVE', risk: 'low', x: 552, y: 228 },
];

const EDGES: GraphEdge[] = [
  // Procurement — always routed through HLF channel nodes
  { from: 'mega',        to: 'ch-mega-tb',  label: '',            type: 'channel' },
  { from: 'ch-mega-tb',  to: 'techbuild',   label: 'PO-2024-001', type: 'procurement' },
  { from: 'techparts',   to: 'ch-parts-tb', label: '',            type: 'channel' },
  { from: 'ch-parts-tb', to: 'techbuild',   label: 'PO-2024-003', type: 'procurement' },
  { from: 'techbuild',   to: 'ch-tb-solar', label: '',            type: 'channel' },
  { from: 'ch-tb-solar', to: 'solartech',   label: 'BC-2024-089', type: 'delivery' },
  // Finance & Mudarabah flow
  { from: 'techbuild',   to: 'opp001',      label: 'Opportunity', type: 'finance' },
  { from: 'opp001',      to: 'amanah',      label: 'Capital req.', type: 'finance' },
  { from: 'amanah',      to: 'contract001', label: 'Issues',      type: 'mudarabah' },
  { from: 'contract001', to: 'techbuild',   label: 'MYR 125k',   type: 'mudarabah' },
];

const NODE_STYLES: Record<NodeType, { fill: string; stroke: string; textColor: string }> = {
  org:         { fill: '#ecfdf5', stroke: '#059669', textColor: '#047857' },
  buyer:       { fill: '#eff6ff', stroke: '#3b82f6', textColor: '#1d4ed8' },
  financier:   { fill: '#f5f3ff', stroke: '#8b5cf6', textColor: '#5b21b6' },
  opportunity: { fill: '#fefce8', stroke: '#ca8a04', textColor: '#92400e' },
  contract:    { fill: '#fdf4ff', stroke: '#a855f7', textColor: '#7e22ce' },
  channel:     { fill: '#eef2ff', stroke: '#6366f1', textColor: '#4338ca' },
};

const EDGE_STYLES: Record<string, { color: string; dash?: string }> = {
  procurement: { color: '#3b82f6' },
  finance:     { color: '#059669' },
  mudarabah:   { color: '#8b5cf6', dash: '5,3' },
  delivery:    { color: '#f59e0b', dash: '3,3' },
  channel:     { color: '#6366f1', dash: '4,2' },
};

const RISK_COLOR: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE:        { label: 'Active',        color: '#10b981' },
  DUE_DILIGENCE: { label: 'Due Diligence', color: '#8b5cf6' },
  PENDING:       { label: 'Pending',       color: '#f59e0b' },
};

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

export function NetworkCanvas({ role }: Props) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showRisk, setShowRisk] = useState(true);
  const [showFinance, setShowFinance] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const didMoveRef = useRef(false);

  // Attach non-passive wheel listener so preventDefault works
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? -0.12 : 0.12;
      const curZoom = zoomRef.current;
      const newZoom = Math.min(Math.max(curZoom + delta, 0.25), 3);
      const scale = newZoom / curZoom;
      const { x: px, y: py } = panRef.current;
      setPan({ x: mx - scale * (mx - px), y: my - scale * (my - py) });
      setZoom(newZoom);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    didMoveRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      didMoveRef.current = true;
      setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy });
    }
  };

  const handleMouseUp = () => { dragStartRef.current = null; };

  const visibleNodes = NODES.filter(n => {
    if (filterType === 'all') return true;
    if (n.type === filterType) return true;
    // Keep channel nodes visible alongside their org peers
    if (n.type === 'channel' && filterType === 'org') return true;
    return false;
  });

  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

  const visibleEdges = EDGES.filter(e => {
    if (!showFinance && (e.type === 'finance' || e.type === 'mudarabah')) return false;
    return visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to);
  });

  function getCenter(id: string) {
    const n = NODES.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  }

  function handleNodeClick(node: GraphNode) {
    if (didMoveRef.current) return;
    setSelectedNode(sel => sel?.id === node.id ? null : node);
  }

  function renderLogo(cx: number, cy: number, initials: string, color: string, r: number) {
    return (
      <>
        <circle cx={cx} cy={cy} r={r} fill={color} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill="white" fontSize={r * 0.65} fontWeight="700" style={{ userSelect: 'none' }}>
          {initials}
        </text>
      </>
    );
  }

  function renderNode(node: GraphNode) {
    const style = NODE_STYLES[node.type];
    const isSel = selectedNode?.id === node.id;
    const riskColor = RISK_COLOR[node.risk];
    const selGlow = isSel ? `drop-shadow(0 0 10px ${style.stroke}80)` : undefined;

    // ── Channel (small hexagon) ────────────────────────────────────────
    if (node.type === 'channel') {
      const hr = 15;
      return (
        <g key={node.id} onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }}>
          <polygon
            points={hexPoints(node.x, node.y, hr)}
            fill={style.fill}
            stroke={isSel ? '#4338ca' : style.stroke}
            strokeWidth={isSel ? 2 : 1.5}
            filter={selGlow}
          />
          <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central"
            fill={style.textColor} fontSize="7" fontWeight="700" style={{ userSelect: 'none' }}>
            HLF
          </text>
          <text x={node.x} y={node.y + hr + 9} textAnchor="middle" fill="#94a3b8" fontSize="7" style={{ userSelect: 'none' }}>
            {node.sub}
          </text>
        </g>
      );
    }

    // ── Opportunity (diamond) ──────────────────────────────────────────
    if (node.type === 'opportunity') {
      const sz = 38;
      return (
        <g key={node.id} onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }}>
          <polygon
            points={`${node.x},${node.y - sz} ${node.x + sz},${node.y} ${node.x},${node.y + sz} ${node.x - sz},${node.y}`}
            fill={style.fill} stroke={isSel ? '#92400e' : style.stroke}
            strokeWidth={isSel ? 2.5 : 1.5} filter={selGlow}
          />
          {showRisk && <circle cx={node.x + sz - 8} cy={node.y - sz + 8} r={5} fill={riskColor} stroke="white" strokeWidth={1} />}
          {renderLogo(node.x, node.y - 6, node.initials ?? 'OP', node.logoColor ?? style.stroke, 14)}
          <text x={node.x} y={node.y + 14} textAnchor="middle" fill={style.textColor} fontSize="8" fontWeight="600" style={{ userSelect: 'none' }}>
            {node.label}
          </text>
          <text x={node.x} y={node.y + sz + 12} textAnchor="middle" fill="#94a3b8" fontSize="7" style={{ userSelect: 'none' }}>
            {node.sub}
          </text>
        </g>
      );
    }

    // ── Contract (rounded rect) ────────────────────────────────────────
    if (node.type === 'contract') {
      const w = 84, h = 44;
      return (
        <g key={node.id} onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }}>
          <rect x={node.x - w / 2} y={node.y - h / 2} width={w} height={h} rx={8}
            fill={style.fill} stroke={isSel ? '#7e22ce' : style.stroke}
            strokeWidth={isSel ? 2.5 : 1.5} filter={selGlow}
          />
          {showRisk && <circle cx={node.x + w / 2 - 7} cy={node.y - h / 2 + 7} r={5} fill={riskColor} stroke="white" strokeWidth={1} />}
          {renderLogo(node.x, node.y - 4, node.initials ?? 'CT', node.logoColor ?? style.stroke, 12)}
          <text x={node.x} y={node.y + 12} textAnchor="middle" fill={style.textColor} fontSize="8" fontWeight="600" style={{ userSelect: 'none' }}>
            {node.label}
          </text>
          <text x={node.x} y={node.y + h / 2 + 12} textAnchor="middle" fill="#94a3b8" fontSize="7" style={{ userSelect: 'none' }}>
            {node.sub}
          </text>
        </g>
      );
    }

    // ── Circle nodes (org / buyer / financier) ─────────────────────────
    const r = 44;
    const logoR = 22;
    return (
      <g key={node.id} onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }}>
        {/* Outer ring */}
        <circle cx={node.x} cy={node.y} r={r}
          fill={style.fill}
          stroke={isSel ? style.stroke : style.stroke}
          strokeWidth={isSel ? 2.5 : 1.5}
          filter={selGlow}
        />
        {/* Company logo badge */}
        {renderLogo(node.x, node.y - 8, node.initials ?? '??', node.logoColor ?? style.stroke, logoR)}
        {/* Company name */}
        <text x={node.x} y={node.y + 20} textAnchor="middle" fill={style.textColor} fontSize="8" fontWeight="600" style={{ userSelect: 'none' }}>
          {node.label.length > 18 ? node.label.slice(0, 17) + '…' : node.label}
        </text>
        {/* Sub-label */}
        <text x={node.x} y={node.y + 30} textAnchor="middle" fill="#94a3b8" fontSize="7" style={{ userSelect: 'none' }}>
          {node.sub}
        </text>
        {/* Risk dot */}
        {showRisk && (
          <circle cx={node.x + r * 0.72} cy={node.y - r * 0.72} r={7}
            fill={riskColor} stroke="white" strokeWidth={1.5}
          />
        )}
        {/* Status dot at bottom */}
        <circle cx={node.x} cy={node.y + r - 4} r={4}
          fill={STATUS_LABELS[node.status]?.color ?? '#94a3b8'}
          stroke="white" strokeWidth={1}
        />
      </g>
    );
  }

  function renderEdge(edge: GraphEdge, i: number) {
    const from = getCenter(edge.from);
    const to = getCenter(edge.to);
    const style = EDGE_STYLES[edge.type];
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2 - 4;
    return (
      <g key={`edge-${i}`}>
        <line
          x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          stroke={style.color} strokeWidth={edge.type === 'channel' ? 1 : 1.5}
          strokeDasharray={style.dash}
          opacity={edge.type === 'channel' ? 0.5 : 0.7}
          markerEnd={edge.type !== 'channel' ? `url(#arrow-${edge.type})` : undefined}
        />
        {edge.label && (
          <text x={mx} y={my} textAnchor="middle" fill={style.color} fontSize="8" opacity={0.9}
            style={{ userSelect: 'none' }}>
            {edge.label}
          </text>
        )}
      </g>
    );
  }

  const FILTER_TYPES = ['all', 'org', 'buyer', 'financier', 'channel', 'opportunity', 'contract'];

  return (
    <div className="flex-1 flex" style={{ background: '#f1f5f9' }}>
      {/* Controls sidebar */}
      <div className="w-56 shrink-0 flex flex-col gap-3 p-4 overflow-y-auto"
        style={{ background: 'white', borderRight: '1px solid #e2e8f0' }}>
        <div>
          <h3 style={{ color: '#0f172a', marginBottom: 2 }}>Network Canvas</h3>
          <p style={{ color: '#94a3b8', fontSize: 11 }}>Supply chain & financing relationships</p>
        </div>

        <div>
          <p style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Filter nodes</p>
          {FILTER_TYPES.map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg mb-0.5 transition-all hover:opacity-80 text-left"
              style={{ background: filterType === t ? '#eef2ff' : 'transparent', color: filterType === t ? '#4338ca' : '#64748b', fontSize: 12 }}>
              <div className="w-2 h-2 rounded-full shrink-0"
                style={{ background: filterType === t ? '#6366f1' : '#e2e8f0' }} />
              {t === 'all' ? 'All nodes' : t === 'channel' ? 'HLF Channels' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
          <p style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>Overlays</p>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input type="checkbox" checked={showRisk} onChange={e => setShowRisk(e.target.checked)} />
            <span style={{ color: '#334155', fontSize: 12 }}>Risk indicators</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showFinance} onChange={e => setShowFinance(e.target.checked)} />
            <span style={{ color: '#334155', fontSize: 12 }}>Finance links</span>
          </label>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
          <p style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>Legend</p>
          {[
            { color: '#6366f1', label: 'HLF Channel', dash: true },
            { color: '#3b82f6', label: 'Procurement', dash: false },
            { color: '#f59e0b', label: 'Delivery', dash: true },
            { color: '#059669', label: 'Finance', dash: false },
            { color: '#8b5cf6', label: 'Mudarabah', dash: true },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <svg width="24" height="8">
                <line x1="0" y1="4" x2="24" y2="4" stroke={l.color} strokeWidth="1.5"
                  strokeDasharray={l.dash ? '3,2' : undefined} />
              </svg>
              <span style={{ color: '#64748b', fontSize: 11 }}>{l.label}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
          <p style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>Risk level</p>
          {[{ color: '#10b981', label: 'Low' }, { color: '#f59e0b', label: 'Medium' }, { color: '#ef4444', label: 'High' }].map((r, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: r.color }} />
              <span style={{ color: '#64748b', fontSize: 11 }}>{r.label} risk</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
          <div className="flex gap-1">
            <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))}
              className="flex-1 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{ background: '#f1f5f9', color: '#475569', fontSize: 12 }}>
              <ZoomIn size={14} className="mx-auto" />
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.25))}
              className="flex-1 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{ background: '#f1f5f9', color: '#475569', fontSize: 12 }}>
              <ZoomOut size={14} className="mx-auto" />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="flex-1 py-2 rounded-lg hover:opacity-80 transition-all"
              style={{ background: '#f1f5f9', color: '#475569', fontSize: 12 }}>
              <Maximize2 size={14} className="mx-auto" />
            </button>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 10, textAlign: 'center', marginTop: 6 }}>
            Scroll to zoom · Drag to pan
          </p>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: dragStartRef.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          style={{
            background: '#f8fafc',
            backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <defs>
            {['procurement', 'finance', 'mudarabah', 'delivery'].map(type => (
              <marker key={type} id={`arrow-${type}`} viewBox="0 0 10 10"
                refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_STYLES[type].color} />
              </marker>
            ))}
          </defs>
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {visibleEdges.map((edge, i) => renderEdge(edge, i))}
            {visibleNodes.map(node => renderNode(node))}
          </g>
        </svg>

        {/* Node detail panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-64 rounded-2xl overflow-hidden shadow-lg"
            style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="px-4 py-3 flex items-start justify-between gap-2"
              style={{ borderBottom: '1px solid #f1f5f9', background: NODE_STYLES[selectedNode.type].fill }}>
              <div className="flex items-center gap-3">
                {selectedNode.initials && (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: selectedNode.logoColor ?? NODE_STYLES[selectedNode.type].stroke }}>
                    <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{selectedNode.initials}</span>
                  </div>
                )}
                <div>
                  <p style={{ color: NODE_STYLES[selectedNode.type].textColor, fontSize: 13, fontWeight: 600 }}>
                    {selectedNode.label}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: 11 }}>
                    {selectedNode.type === 'channel' ? 'HLF Channel' : selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                    {selectedNode.sub ? ` · ${selectedNode.sub}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedNode(null)} style={{ color: '#94a3b8', marginTop: 2 }}>✕</button>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span style={{ color: '#64748b', fontSize: 12 }}>Status</span>
                <span style={{ color: STATUS_LABELS[selectedNode.status]?.color ?? '#64748b', fontSize: 12, fontWeight: 500 }}>
                  {STATUS_LABELS[selectedNode.status]?.label ?? selectedNode.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: '#64748b', fontSize: 12 }}>Risk level</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: RISK_COLOR[selectedNode.risk] }} />
                  <span style={{ color: RISK_COLOR[selectedNode.risk], fontSize: 12, fontWeight: 500 }}>
                    {selectedNode.risk.charAt(0).toUpperCase() + selectedNode.risk.slice(1)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: '#64748b', fontSize: 12 }}>Connections</span>
                <span style={{ color: '#334155', fontSize: 12, fontWeight: 500 }}>
                  {EDGES.filter(e => e.from === selectedNode.id || e.to === selectedNode.id).length} edges
                </span>
              </div>
              {selectedNode.type === 'channel' && (
                <div className="mt-2 p-2 rounded-lg" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                  <p style={{ color: '#4338ca', fontSize: 11, fontWeight: 500 }}>Hyperledger Fabric Channel</p>
                  <p style={{ color: '#6366f1', fontSize: 10, marginTop: 2 }}>
                    All inter-org data flows are mediated through this channel. No direct peer-to-peer org connection exists.
                  </p>
                </div>
              )}
              {role.id === 'financier-user' && selectedNode.type === 'opportunity' && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Finance exposure</p>
                  <p style={{ color: '#0f172a', fontSize: 16, fontWeight: 700 }}>MYR 125,000</p>
                  <p style={{ color: '#94a3b8', fontSize: 11 }}>Active application</p>
                </div>
              )}
              <div className="p-2 rounded-lg mt-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="flex items-center gap-1.5">
                  <Info size={11} color="#94a3b8" />
                  <span style={{ color: '#94a3b8', fontSize: 10 }}>Role: {role.label}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zoom + hint badge */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>{Math.round(zoom * 100)}%</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <span style={{ color: '#94a3b8', fontSize: 11 }}>
              {NODES.filter(n => n.type === 'channel').length} HLF channels · {NODES.filter(n => n.type === 'org').length} orgs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
