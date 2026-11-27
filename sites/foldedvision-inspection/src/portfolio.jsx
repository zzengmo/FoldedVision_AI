import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, Box, ChartNoAxesColumnIncreasing, Check, ChevronsRight, Circle,
  CircuitBoard, Focus, Image as ImageIcon, Layers3, Maximize2, ScanLine, X,
} from 'lucide-react';
import { COMPONENTS, PIPELINE } from './projectData.js';
import FactoryConsole from './FactoryConsole.jsx';
import evidence from './evidence.json';
import quality from './qualityResults.json';
import './styles.css';
import './console.css';

const COMPONENT_ICONS = { ring: Circle, lens: Focus, pcb: CircuitBoard, bearing: Box };
function Mark() {
  return <span className="brand-mark" aria-hidden="true"><ScanLine size={21} strokeWidth={2.3} /></span>;
}

function Header({ showUpgrade }) {
  return (
    <header className="header">
      <div className="shell header-inner">
        <a className="brand" href="#top" aria-label="FoldedVision AI 처음으로">
          <Mark />
          <span>FoldedVision <b>AI</b></span>
        </a>
        <nav aria-label="주 메뉴">
          <a href="#evidence">검사 사례</a>
          <a href="#metrics">성능 비교</a>
          {showUpgrade && <a href="#upgrade">추가 학습</a>}
          <a href="#process">개발 과정</a>
        </nav>
        <a className="button header-cta" href="#factory"><Box size={17} /> 3D 공정 체험</a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero-wrap" id="top">
      <div className="shell hero-intro">
        <div className="hero-copy">
          <span className="eyebrow"><span /> DEEP LEARNING × MACHINE VISION</span>
          <h1>제조에 들어가기 전,<br /><em>작은 결함까지.</em></h1>
          <p>외주 부품과 제조 공정 사이에 더하는 시선.<br />Lens · Ring · PCB의 외관을 분석하고,<br className="desktop-break" /> 실제 평가 결과로 검사의 가능성을 확인합니다.</p>
          <div className="hero-actions">
            <a className="button primary" href="#factory"><Box size={18} /> 3D 자동 시연 보기</a>
            <a className="button secondary" href="#overview"><ChartNoAxesColumnIncreasing size={18} /> 실험 결과 살펴보기</a>
          </div>
          <div className="hero-footnote"><span>TensorFlow / Keras</span><span>CNN · U-Net · YOLO</span></div>
        </div>
        <figure className="hero-visual"><div className="hero-orbit" /><img src={import.meta.env.BASE_URL + 'visuals/inspection-parts.png'} alt="렌즈, 링과 회로 기판의 AI 생성 콘셉트 이미지" fetchPriority="high" /><figcaption>Lens · Ring · PCB <span>AI 생성 콘셉트</span></figcaption></figure>
      </div>
      <div className="shell supply-flow"><span>외주 부품 입고</span><i /><strong><ScanLine size={19} />제조 전 외관 검사</strong><i /><span>제조 공정 투입</span><p>결함을 앞에서 확인하는 검사 흐름을 제안합니다.</p></div>
    </section>
  );
}

function InspectionOverview({ onPart }) {
  const examples = [
    { id: 'lens', image: 'lens-error', unit: '구역 AP', scope: 'VISION Lens · 3,410구역', a: quality.lens.legacy.ap, b: quality.lens.test.ap },
    { id: 'ring', image: 'ring-hit', unit: '결함 유형 정확도', scope: 'VISION Ring · 42장', a: quality.ring.legacy.accuracy, b: quality.ring.test.accuracy, percent: true },
    { id: 'pcb', image: 'pcb-error', unit: '사진 AP', scope: 'VisA PCB1–3 · 1,324장', a: quality.pcb.global_test.ap, b: quality.pcb.test.ap },
  ];
  return (
    <section className="shell page-section overview" id="overview">
      <SectionHeading icon={ChartNoAxesColumnIncreasing} label="평가 비교" title="같은 시험에서 무엇이 바뀌었나"
        description="각 부품은 자신과 같은 평가 조건에서 비교합니다. 사진을 고르면 해당 부품의 증거를 볼 수 있습니다." />
      <div className="overview-grid">
        {examples.map(({ id, image, unit, scope, a, b, percent }) => {
          const format = (value) => percent ? (value * 100).toFixed(2) + '%' : value.toFixed(3);
          return (
            <a key={id} href="#upgrade" onClick={() => onPart(id)} className="overview-card" style={{ '--part-accent': COMPONENTS[id].color }}>
              <img src={import.meta.env.BASE_URL + 'evidence/quality/' + image + '.webp'} alt={COMPONENTS[id].name + ' 실제 평가 사진'} loading="lazy" />
              <div className="overview-card-body">
                <span className="overview-scope">{scope}</span>
                <h3>{COMPONENTS[id].name} <small>{unit}</small></h3>
                <div className="overview-bar"><span>기존</span><i style={{ '--bar': a * 100 + '%' }} /><b>{format(a)}</b></div>
                <div className="overview-bar latest"><span>추가</span><i style={{ '--bar': b * 100 + '%' }} /><b>{format(b)}</b></div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeading({ icon: Icon, label, title, description }) {
  return (
    <div className="section-heading">
      <span className="section-label"><Icon size={16} /> {label}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

function ComponentTabs({ selected, onSelect }) {
  return (
    <div className="component-tabs" aria-label="부품 선택">
      {Object.entries(COMPONENTS).map(([key, item]) => {
        const Icon = COMPONENT_ICONS[key];
        return (
          <button key={key} type="button" onClick={() => onSelect(key)} aria-pressed={selected === key}
            className={selected === key ? 'selected' : ''} style={{ '--part-accent': item.color }}>
            <Icon size={18} /> {item.name}
            {key === 'bearing' && <span className="tab-subtitle">추가 실험</span>}
          </button>
        );
      })}
    </div>
  );
}

function Lightbox({ opened, close }) {
  const modal = useRef(null);
  useEffect(() => {
    if (opened && !modal.current.open) modal.current.showModal();
    if (!opened && modal.current.open) modal.current.close();
  }, [opened]);

  return (
    <dialog className="lightbox" ref={modal} aria-label="평가 이미지 확대" onClose={close}
      onClick={(event) => { if (event.target === modal.current) close(); }}>
      {opened && (
        <div className="lightbox-inner">
          <div className="lightbox-header"><strong>{opened.title}</strong><button type="button" onClick={close} aria-label="닫기"><X size={23} /></button></div>
          <img src={opened.src} alt={opened.title} />
        </div>
      )}
    </dialog>
  );
}

function EvidenceImage({ src, title, onOpen }) {
  return (
    <figure className="evidence-image">
      <button className="image-button" type="button" onClick={() => onOpen({ src, title })} aria-label={title + ' 확대'}>
        <img src={src} alt={title} loading="lazy" />
        <span className="enlarge"><Maximize2 size={16} /></span>
      </button>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

function Cases({ part, item, onOpen }) {
  const records = evidence[part].cases;
  const [caseIndex, setCaseIndex] = useState(0);
  const current = records[caseIndex];

  if (!current) {
    return (
      <div className="case-card bearing-case">
        <div><span className="overline">별도 실험</span><h3>설치 상태 분류</h3><p>{item.summary}</p><p>{item.limit}</p></div>
        <EvidenceImage {...evidence.bearing.processImages[2]} onOpen={onOpen} />
      </div>
    );
  }

  return (
    <>
      <div className="case-tabs" aria-label="검사 사례 선택">
        {records.map((record, index) => (
          <button key={record.id} type="button" aria-pressed={index === caseIndex} onClick={() => setCaseIndex(index)}>
            <span className={'case-indicator ' + record.outcome}>{record.outcome === 'success' ? <Check size={15} /> : <X size={15} />}</span>
            {record.title}
          </button>
        ))}
      </div>
      <div className="case-card">
        <div className={'case-media ' + (current.original && current.overlay ? 'media-pair' : 'media-single')}>
          {current.original && <EvidenceImage src={current.original} title={current.originalLabel || '원본 평가 이미지'} onOpen={onOpen} />}
          {current.overlay && <EvidenceImage src={current.overlay} title={current.overlayLabel} onOpen={onOpen} />}
        </div>
        <div className="case-details">
          <span className={'outcome-tag ' + current.outcome}>{current.outcome === 'success' ? '성공 사례' : '실패 사례'}</span>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
          <dl>
            <div><dt>참조 정답</dt><dd>{current.truth}</dd></div>
            <div><dt>실제 모델 결과</dt><dd>{current.result}</dd></div>
          </dl>
          <small>{current.source}</small>
        </div>
      </div>
    </>
  );
}

function Results({ item }) {
  const { plot } = item;
  return (
    <section className="page-section metrics-section" id="metrics">
      <SectionHeading icon={ChartNoAxesColumnIncreasing} label="모델 비교" title={item.name + ' 평가 결과'}
        description={item.summary} />
      <div className="result-grid">
        <div className="chart-panel">
          <h3>{plot.title}</h3>
          {plot.items.map(({ label, value, max }) => (
            <div className="bar-row" key={label}>
              <span>{label}</span>
              <div className="bar-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
                <i style={{ width: 100 * value / max + '%' }} />
              </div>
              <strong>{plot.unit === '장' ? value + ' / ' + max : value + (plot.unit === '%' ? '%' : '')}</strong>
            </div>
          ))}
        </div>
        <div className="metric-details">
          <dl>
            {item.scores.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <p>{item.limit}</p>
        </div>
      </div>
    </section>
  );
}

const qualityPercent = (value) => (100 * value).toFixed(1) + '%';
const qualityScore = (value) => value.toFixed(3);
const ringLabels = { t_contamination: '오염', t_scratch: '스크래치', unfinished_surface: '표면 미가공' };

const QUALITY_VIEWS = {
    ring: (run) => ({
      title: 'Ring 결함 유형 재학습',
      scope: `기존 Ring 테스트 ${run.test.n}장 · 오염, 스크래치, 표면 미가공`,
      chart: [['기존 정확도', run.legacy.accuracy], ['추가 학습 정확도', run.test.accuracy]],
      display: qualityPercent,
      facts: [
        ['정답 수', `${run.legacy.correct}장 → ${run.test.correct}장`],
        ['Macro F1', `${qualityScore(run.legacy.macro_f1)} → ${qualityScore(run.test.macro_f1)}`],
        ['MSDD 별도 평가', `${quality.msdd.test.n}장 · 균형 정확도 ${qualityPercent(quality.msdd.test.balanced_accuracy)}`],
      ],
      note: '같은 테스트 사진에서 전체와 부분 이미지를 함께 보는 CNN을 평가했습니다. VISION Ring의 정상 라벨이 없어 결과는 세 결함 유형의 분류 성능입니다.',
      source: ['VISION Ring', 'https://huggingface.co/datasets/VISION-Workshop/VISION-Datasets'],
    }),
    lens: (run) => ({
      title: 'Lens 구역 분류 재학습',
      scope: `기존 Lens 테스트 ${run.test.n.toLocaleString('ko-KR')}구역`,
      chart: [['기존 구역 AP', run.legacy.ap], ['추가 학습 구역 AP', run.test.ap]],
      display: qualityScore,
      facts: [
        ['불량 구역 재현율', qualityPercent(run.test.recall)],
        ['정상 구역 오검출률', `${qualityPercent(run.legacy.fpr)} → ${qualityPercent(run.test.fpr)}`],
        ['정상 렌즈 사진', '테스트 정답 0장'],
      ],
      note: '학습용 정상 구역을 늘리고 CNN 특징으로 구역을 분류했습니다. 오검출률은 렌즈 사진 속 정상 구역을 기준으로 계산했습니다.',
      source: ['VISION Lens', 'https://huggingface.co/datasets/VISION-Workshop/VISION-Datasets'],
    }),
    pcb: (run) => ({
      title: 'VisA PCB1–3 CNN 검사',
      scope: `공식 PCB1–3 테스트 ${run.test.n.toLocaleString('ko-KR')}장 · 사진 단위 정상/불량`,
      chart: Object.entries(run.test_by_board).map(([board, result]) => [board.toUpperCase() + ' F1', result.f1]),
      display: qualityScore,
      facts: [
        ['전체 AP', run.global_test ? `${qualityScore(run.global_test.ap)} → ${qualityScore(run.test.ap)}` : qualityScore(run.test.ap)],
        ['불량 사진 재현율', `${qualityPercent(run.test.recall)} (${run.test.tp}/${run.test.tp + run.test.fn})`],
        ['정상 사진 오검출률', `${qualityPercent(run.test.fpr)} (${run.test.fp}/${run.test.fp + run.test.tn})`],
      ],
      note: '사진 전체를 분류한 새 실험입니다. 팀 PCB4 YOLO의 결함 위치 검출 결과는 위 성능 비교에 있습니다.',
      source: ['Amazon VisA', 'https://registry.opendata.aws/visa/'],
    }),
};

function QualityResults({ part, onOpen }) {
  const style = QUALITY_VIEWS[part];
  if (!style) return null;
  const view = style(quality[part]);
  const label = (value) => part === 'ring' ? ringLabels[value] : value ? '불량' : '정상';
  return (
    <section className="page-section quality-section" id="upgrade">
      <SectionHeading icon={Activity} label={quality.date.replaceAll('-', '.') + ' 추가 학습'} title={view.title} description={view.scope} />
      <div className="result-grid quality-metrics">
        <div className="chart-panel" aria-label="추가 학습 지표 비교">
          {view.chart.map(([name, value]) => (
            <div className="bar-row" key={name}>
              <span>{name}</span>
              <div className="bar-track" role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={1} aria-valuenow={value}>
                <i style={{ width: 100 * value + '%' }} />
              </div>
              <strong>{view.display(value)}</strong>
            </div>
          ))}
        </div>
        <div className="metric-details">
          <dl>{view.facts.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
          <p>{view.note}</p>
        </div>
      </div>
      <div className="quality-cases">
        {quality.cases[part].map(({ role, truth, prediction, score, sample, src }) => (
          <article className="quality-case" key={role}>
            <EvidenceImage src={src} title={role === 'hit' ? '정답 일치' : '오분류'} onOpen={onOpen} />
            <div>
              <h3>{role === 'hit' ? '결함을 찾은 사례' : '틀린 사례'}</h3>
              <dl>
                <div><dt>정답</dt><dd>{label(truth)}</dd></div>
                <div><dt>예측</dt><dd>{label(prediction)}</dd></div>
                <div><dt>{part === 'ring' ? '예측 유형 점수' : '불량 점수'}</dt><dd>{qualityPercent(score)}</dd></div>
              </dl>
              <small>{sample}</small>
            </div>
          </article>
        ))}
      </div>
      <p className="quality-source">평가 사진 출처 <a href={view.source[1]}>{view.source[0]}</a></p>
    </section>
  );
}

function Process({ part, item, onOpen }) {
  const [step, setStep] = useState(0);
  const [title, summary, detail, figureIndex] = item.steps[step];
  const figure = evidence[part].processImages[figureIndex];
  return (
    <section className="page-section process-section" id="process">
      <SectionHeading icon={Layers3} label="개발 과정" title={item.name + ' 모델을 만든 과정'}
        description="데이터를 확인하고 모델을 평가하기까지의 실제 작업을 단계별로 확인하세요." />
      <div className="process-tabs" aria-label="개발 단계 선택">
        {PIPELINE.map((stage, index) => (
          <button type="button" key={stage} aria-pressed={index === step} onClick={() => setStep(index)}>
            {stage}
            {index < PIPELINE.length - 1 && <ChevronsRight size={16} aria-hidden="true" />}
          </button>
        ))}
      </div>
      <div className="process-card">
        <div className="process-image"><EvidenceImage {...figure} onOpen={onOpen} /></div>
        <div className="process-details">
          <span className="overline">{PIPELINE[step]}</span>
          <h3>{title}</h3>
          <p>{summary}</p>
          <span className="process-fact"><Activity size={17} /> {detail}</span>
          <div className="step-actions">
            <button type="button" className="button secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>이전 단계</button>
            <button type="button" className="button secondary" onClick={() => setStep(step + 1)} disabled={step === PIPELINE.length - 1}>다음 단계</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [part, setPart] = useState('ring');
  const [opened, setOpened] = useState(null);
  const item = COMPONENTS[part];

  return (
    <>
      <a className="skip-link" href="#evidence">검사 사례로 건너뛰기</a>
      <Header showUpgrade={part !== 'bearing'} />
      <main>
        <Hero />
        <FactoryConsole onOpen={setOpened} onEvidence={(kind) => {
          setPart(kind);
          document.getElementById('evidence').scrollIntoView({ behavior: 'smooth' });
        }} />
        <section className="shell project-story" aria-labelledby="story-title"><figure><img src={import.meta.env.BASE_URL + 'visuals/clean-inspection.png'} alt="제조 투입 전 광학 검사 장면의 AI 생성 콘셉트" loading="lazy" /><figcaption>공정 제안 이해를 위한 AI 생성 이미지</figcaption></figure><div><span className="section-label">WHY FOLDEDVISION</span><h2 id="story-title">검사할 시점을<br />앞으로 옮기면 어떨까?</h2><p>자화전자의 품질 프로세스에서 출발한 질문입니다. 외주로 입고되는 폴디드 액추에이터 부품을 제조에 투입하기 전에 검사하는 흐름을 생각했습니다.</p><p>이 프로젝트는 Lens · Ring · PCB 공개 데이터로 부품별 딥러닝 검사를 실험하고, 그 결과를 하나의 가상 공정에서 설명합니다.</p><a className="text-link" href="#evidence">부품별 검사 사례 살펴보기</a></div></section>
        <InspectionOverview onPart={setPart} />
        <div className="shell workbench" style={{ '--part-accent': item.color }}>
          <section className="page-section evidence-section" id="evidence">
            <SectionHeading icon={ImageIcon} label="실제 평가 사례" title="어디를 봤고, 무엇을 놓쳤나"
              description="부품을 선택해 실제 정답과 모델의 결과를 비교하세요." />
            <ComponentTabs selected={part} onSelect={setPart} />
            <div className="selected-component"><span>{item.name}</span><p>{item.label}</p></div>
            <Cases key={part} part={part} item={item} onOpen={setOpened} />
          </section>
          <Results item={item} />
          <QualityResults part={part} onOpen={setOpened} />
          <Process key={part} part={part} item={item} onOpen={setOpened} />
        </div>
      </main>
      <footer className="footer">
        <div className="shell footer-inner">
          <a href="#top" className="brand"><Mark /><span>FoldedVision <b>AI</b></span></a>
          <p>Ring · Lens · PCB 외관 검사 프로젝트</p>
          <a href="#factory">3D 공정 다시 체험</a>
        </div>
      </footer>
      <Lightbox opened={opened} close={() => setOpened(null)} />
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
