import React, { lazy, Suspense, useEffect, useReducer, useRef, useState } from 'react';
import { Activity, Box, Camera, Check, Focus, Layers3, Pause, Play, RotateCcw, ScanLine, Split } from 'lucide-react';
import { FACTORY_JOBS, ROUTES } from './projectData.js';
import { DURATIONS, initialTimeline, timelineReducer } from './factoryTimeline.mjs';
const FactoryScene = lazy(() => import('./FactoryScene.jsx'));
const phases = { ready: '부품 투입 대기', feeding: '검사 위치로 이송', scanning: '광학 촬영', decision: '저장된 결과 확인', routing: '분류 트레이로 이동', feedback: '검사 사례 완료' };
const phaseStage = { ready: 0, feeding: 0, scanning: 1, decision: 2, routing: 3, feedback: 3 };
const stages = [['부품 투입', Box], ['광학 촬영', Camera], ['결과 확인', ScanLine], ['분류 이송', Split]];
const views = [['line', '전체'], ['camera', '촬영부'], ['sort', '분류부']];
const asset = (name) => `${import.meta.env.BASE_URL}evidence/${name}`;

export default function FactoryConsole({ onEvidence, onOpen }) {
  const section = useRef(null);
  const [state, dispatch] = useReducer(timelineReducer, null, () => initialTimeline(window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  const { jobIndex, phase, route, playing, mode, speed, records, elapsed } = state;
  const [visible, setVisible] = useState(false);
  const [viewOverride, setViewOverride] = useState(null);
  const [feedOverride, setFeedOverride] = useState(null);
  const job = FACTORY_JOBS[jobIndex];
  const hasResult = ['decision', 'routing', 'feedback'].includes(phase);
  const activeView = viewOverride || (['scanning', 'decision'].includes(phase) ? 'camera' : ['routing', 'feedback'].includes(phase) ? 'sort' : 'line');
  const feed = feedOverride || (hasResult ? 'result' : 'input');
  const visibleFrame = hasResult || phase === 'scanning';
  const progress = elapsed / DURATIONS[phase];
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .08 });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(); const delta = Math.min(250, now - last); last = now;
      if (!document.hidden) dispatch({ type: 'tick', delta, jobs: FACTORY_JOBS });
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, visible]);
  useEffect(() => { setViewOverride(null); setFeedOverride(null); }, [phase, jobIndex]);
  function selectJob(index) { dispatch({ type: 'select', index }); setViewOverride(null); setFeedOverride(null); }
  return (
    <section ref={section} className="shell factory-console" id="factory" aria-labelledby="factory-title">
      <div className="console-heading">
        <div><span className="section-label"><Layers3 size={16} /> INTERACTIVE PROCESS</span><h2 id="factory-title">검사의 흐름을, 한눈에.</h2></div>
        <p>투입부터 촬영, 결과 확인, 분류까지.<br />네 가지 평가 사례를 자동으로 이어서 시연합니다.</p>
      </div>
      <div className="console-body">
        <div className="console-toolbar">
          <div className="console-jobs" aria-label="검사할 평가 사례">{FACTORY_JOBS.map((item, i) => <button type="button" key={item.id} aria-pressed={i === jobIndex} onClick={() => selectJob(i)}>{item.name}</button>)}</div>
          <div className="console-status" role="status">{!playing ? '일시정지' : phases[phase]}</div>
        </div>
        <div className="console-grid">
          <div className="console-stage">
            <div className="console-canvas">
              <Suspense fallback={<div className="scene-loading">3D 검사 라인을 준비합니다</div>}><FactoryScene kind={job.kind} phase={phase} route={route} view={activeView} progress={progress} playing={playing && visible} /></Suspense>
              <div className="scene-caption"><span>FOLDEDVISION / INSPECTION CELL</span><strong>{job.kind.toUpperCase()}<small>외주 입고 · 제조 전 검사</small></strong></div>
              <div className="console-views" aria-label="3D 카메라 시점">{views.map(([key, label]) => <button type="button" key={key} aria-pressed={activeView === key} onClick={() => setViewOverride(key)}>{label}</button>)}</div>
              <span className="console-orbit">드래그 회전 · 스크롤 확대</span>
              <div className="console-route-key">{Object.entries(ROUTES).map(([key, info]) => <span key={key} className={'key-' + key}><i />{info.label}</span>)}</div>
            </div>
            <ol className="console-progress" aria-label="공정 진행 단계">{stages.map(([label, Icon], i) => <li key={label} className={i === phaseStage[phase] ? 'current' : i < phaseStage[phase] ? 'done' : ''} aria-current={i === phaseStage[phase] ? 'step' : undefined}><Icon size={17} />{label}{i === phaseStage[phase] && <i className="stage-fill" style={{ width: `${Math.round(progress * 100)}%` }} />}</li>)}</ol>
          </div>
          <aside className="console-camera" aria-label="사례 검사 결과">
            <div className="console-camera-head"><strong><Focus size={18} /> VISION VIEW</strong><span>저장된 평가 사례</span></div>
            <div className="console-frame">{visibleFrame ? <button type="button" className="console-image" onClick={() => onOpen({ src: asset(feed === 'result' ? job.result : job.input), title: feed === 'result' ? job.resultLabel : job.inputLabel })} aria-label="평가 사진 확대"><img src={asset(feed === 'result' ? job.result : job.input)} alt={feed === 'result' ? job.resultLabel : job.inputLabel} /></button> : <div className="console-standby"><ScanLine size={36} /><span>부품이 검사 위치로 이동합니다</span></div>}</div>
            <div className="console-image-actions" aria-label="검사 사진 보기"><button type="button" aria-pressed={feed === 'input'} disabled={!visibleFrame} onClick={() => setFeedOverride('input')}>{job.id === 'pcb-box' ? '정답 박스' : '평가 사진'}</button><button type="button" aria-pressed={feed === 'result'} disabled={!hasResult} onClick={() => setFeedOverride('result')}>모델 결과</button></div>
            <div className="console-reading"><div><span>{hasResult ? 'MODEL OUTPUT' : 'INSPECTION'}</span><strong>{hasResult ? job.finding : job.station}</strong><p>{hasResult ? job.measure : '촬영 단계에서 평가 사진을 불러옵니다.'}</p></div>{hasResult && <b>{job.value}</b>}</div>
            {hasResult && <div className="console-finding" data-route={job.route}><strong>{mode === 'auto' ? '시나리오 경로' : '권장 경로'} <b>{ROUTES[job.route].label}</b></strong><p>{job.truth} {job.reason}</p><button type="button" className="console-link" onClick={() => { if (playing) dispatch({ type: 'toggle' }); onEvidence(job.kind); }}>평가 근거 자세히 보기</button></div>}
            <p className="console-source">{job.source}</p>
          </aside>
        </div>
        <div className="console-controls">
          <div className="playback-controls"><button type="button" className="button primary" onClick={() => dispatch({ type: 'toggle' })}>{playing ? <Pause size={17} /> : <Play size={17} />}{playing ? '일시정지' : '재생'}</button><button type="button" className="icon-button" onClick={() => dispatch({ type: 'reset' })} aria-label="공정 처음으로"><RotateCcw size={18} /></button><div className="segmented" aria-label="재생 속도">{[1, 2].map(value => <button type="button" key={value} aria-pressed={speed === value} onClick={() => dispatch({ type: 'speed', speed: value })}>{value}×</button>)}</div></div>
          <div className="segmented" aria-label="시연 모드">{[['auto', '자동 시연'], ['manual', '직접 분류']].map(([key, label]) => <button type="button" key={key} aria-pressed={mode === key} onClick={() => dispatch({ type: 'mode', mode: key })}>{label}</button>)}</div>
        </div>
        {mode === 'manual' && <div className="manual-controls"><p>{phase === 'decision' ? '모델 결과와 정답을 비교하고 이동 경로를 선택하세요.' : phase === 'feedback' ? `선택 ${ROUTES[route].label} · 권장 ${ROUTES[job.route].label}` : '사례를 선택하고 검사를 시작하세요.'}</p><div className="console-actions">{phase === 'ready' && <button type="button" className="button primary" onClick={() => dispatch({ type: 'start' })}><Play size={16} />검사 시작</button>}{phase === 'decision' && Object.entries(ROUTES).map(([key, info]) => <button type="button" className={'button route-' + key} key={key} onClick={() => dispatch({ type: 'route', route: key })}>{info.label}</button>)}{phase === 'feedback' && <button type="button" className="button secondary" onClick={() => selectJob((jobIndex + 1) % FACTORY_JOBS.length)}><Check size={16} />다음 사례</button>}</div></div>}
        <div className="console-log"><strong><Activity size={16} />최근 이송</strong>{records.length ? <ol>{records.map(entry => <li key={entry.id}><span>{entry.name}</span><b className={'key-' + entry.route}>{ROUTES[entry.route].label}</b></li>)}</ol> : <p>첫 번째 사례가 완료되면 이송 기록이 표시됩니다.</p>}</div>
      </div>
      <p className="simulation-note">3D 장비는 공정 이해를 위한 시뮬레이션입니다. 저장된 평가 결과와 정답에 따라 경로를 재생하며, 새로운 사진을 실시간으로 추론하지 않습니다.</p>
    </section>
  );
}
