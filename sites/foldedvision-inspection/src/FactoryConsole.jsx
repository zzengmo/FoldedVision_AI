import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, Box, Camera, Check, CircleDot, Focus, Layers3, Play, RotateCcw, ScanLine, Split } from 'lucide-react';
import { FACTORY_JOBS, ROUTES } from './projectData.js';

const FactoryScene = lazy(() => import('./FactoryScene.jsx'));
const phases = {
  ready: '투입 대기', feeding: '컨베이어 이송', scanning: '카메라 촬영',
  decision: '결과 확인', routing: '분류 동작', feedback: '경로 확인',
};
const phaseStage = { ready: 0, feeding: 0, scanning: 1, decision: 2, routing: 3, feedback: 3 };
const stages = [['투입', Box], ['촬영', Camera], ['AI 결과', ScanLine], ['경로 확인', Split]];
const transitions = { feeding: [950, 'scanning'], scanning: [760, 'decision'], routing: [1650, 'feedback'] };
const views = [['line', '라인 전체'], ['camera', '촬영부'], ['sort', '분류부']];
const asset = (name) => `${import.meta.env.BASE_URL}evidence/${name}`;

export default function FactoryConsole({ onEvidence, onOpen }) {
  const [jobIndex, setJob] = useState(0);
  const [phase, setPhase] = useState('ready');
  const [route, setRoute] = useState(null);
  const [view, setView] = useState('line');
  const [feed, setFeed] = useState('input');
  const [records, setRecords] = useState([]);
  const job = FACTORY_JOBS[jobIndex];
  const live = ['feeding', 'scanning', 'routing'].includes(phase);
  const hasResult = ['decision', 'routing', 'feedback'].includes(phase);
  const hasFeedback = phase === 'feedback';

  useEffect(() => {
    if (!transitions[phase]) return undefined;
    const [duration, next] = transitions[phase];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      setPhase(next);
      if (next === 'decision') setFeed('result');
    }, reduced ? 100 : duration);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function selectJob(index) {
    setJob(index);
    setRoute(null);
    setPhase('ready');
    setFeed('input');
    setView('line');
  }

  function selectRoute(choice) {
    if (phase !== 'decision') return;
    setRoute(choice);
    setPhase('routing');
    setView('sort');
    setRecords((items) => [{ name: job.name, route: choice, recommended: job.route }, ...items].slice(0, 4));
  }

  const frame = feed === 'result' ? job.result : job.input;
  const frameTitle = feed === 'result' ? job.resultLabel : job.inputLabel;
  const visibleFrame = hasResult || phase === 'scanning';

  return (
    <section className="shell factory-console" id="factory" aria-labelledby="factory-title">
      <div className="console-heading">
        <div><span className="section-label"><Layers3 size={16} /> 검사 공정</span><h2 id="factory-title">3D 외관 검사 셀</h2></div>
        <p>실제 평가 사례로 촬영 결과를 확인하고, 부품을 보낼 경로를 고르세요.</p>
      </div>
      <div className="console-body">
        <div className="console-toolbar">
          <div className="console-jobs" aria-label="검사할 평가 사례">
            {FACTORY_JOBS.map((item, i) => (
              <button type="button" key={item.id} aria-pressed={i === jobIndex} onClick={() => selectJob(i)}>{item.name}</button>
            ))}
          </div>
          <div className="console-status" aria-live="polite"><CircleDot size={15} className={live ? 'pulsing' : ''} /> {phases[phase]}</div>
        </div>
        <div className="console-grid">
          <div className="console-stage">
            <div className="console-canvas">
              <Suspense fallback={<div className="scene-loading">3D 라인 준비 중</div>}>
                <FactoryScene kind={job.kind} phase={phase} route={route} view={view} />
              </Suspense>
              <div className="console-views" aria-label="3D 카메라 시점">
                {views.map(([key, label]) => (
                  <button type="button" key={key} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>
                ))}
              </div>
              <span className="console-orbit">드래그 회전 · 스크롤 확대</span>
              <div className="console-route-key" aria-label="분류 트레이">
                {Object.entries(ROUTES).map(([key, info]) => <span key={key} className={'key-' + key}><i />{info.label}</span>)}
              </div>
            </div>
            <ol className="console-progress" aria-label="공정 진행 단계">
              {stages.map(([label, Icon], i) => (
                <li key={label} className={i === phaseStage[phase] ? 'current' : i < phaseStage[phase] ? 'done' : ''} aria-current={i === phaseStage[phase] ? 'step' : undefined}>
                  <Icon size={17} aria-hidden="true" /> {label}
                </li>
              ))}
            </ol>
          </div>
          <div className="console-camera">
            <div className="console-camera-head">
              <strong><Focus size={19} /> 검사 화면</strong>
              <span title={job.source}>저장된 평가 사례</span>
            </div>
            <div className="console-frame">
              {visibleFrame
                ? <button type="button" className="console-image" onClick={() => onOpen({ src: asset(frame), title: frameTitle })} aria-label={frameTitle + ' 확대'}><img src={asset(frame)} alt={frameTitle} /></button>
                : <div className="console-standby"><ScanLine size={38} /><span>촬영 대기</span></div>}
            </div>
            <div className="console-image-actions" aria-label="검사 사진 보기">
              <button type="button" aria-pressed={feed === 'input'} onClick={() => setFeed('input')} disabled={!visibleFrame}>{job.id === 'pcb-box' ? '정답 박스' : '촬영 사진'}</button>
              <button type="button" aria-pressed={feed === 'result'} onClick={() => setFeed('result')} disabled={!hasResult}>모델 결과</button>
            </div>
            {hasResult && <div className="console-reading">
              <div><strong>{job.finding}</strong><p>{job.measure}</p></div>
              <span>{job.value}</span>
            </div>}
            {hasFeedback && <div className="console-finding" data-route={job.route}>
              <strong>권장 경로 {ROUTES[job.route].label}</strong>
              <p>{job.truth} {job.reason}</p>
              <button type="button" className="console-link" onClick={() => onEvidence(job.kind)}>부품 평가 기록 보기</button>
            </div>}
          </div>
        </div>
        <div className="console-controls">
          <div aria-live="polite">
            <strong>{job.station}</strong>
            <p>{hasFeedback ? `선택 경로 ${ROUTES[route].label} · 권장 경로 ${ROUTES[job.route].label}` : hasResult ? '모델 신호와 사진을 확인하고 트레이를 선택하세요.' : '컨베이어에서 촬영을 시작합니다.'}</p>
          </div>
          <div className="console-actions">
            {phase === 'ready' && <button type="button" className="button primary" onClick={() => setPhase('feeding')}><Play size={16} /> 검사 시작</button>}
            {phase === 'decision' && Object.entries(ROUTES).map(([key, info]) => (
              <button type="button" key={key} className={`button route-${key}`} title={info.hint} onClick={() => selectRoute(key)}>{info.label}</button>
            ))}
            {hasFeedback && <>
              <button type="button" className="button secondary" onClick={() => selectJob(jobIndex)}><RotateCcw size={16} /> 다시 검사</button>
              <button type="button" className="button primary" onClick={() => selectJob((jobIndex + 1) % FACTORY_JOBS.length)}><Check size={16} /> 다음 사례</button>
            </>}
          </div>
        </div>
        <div className="console-log">
          <strong><Activity size={17} /> 경로 기록</strong>
          {records.length ? <ol aria-label="최근 경로 선택">{records.map((entry, i) => (
            <li key={`${entry.name}-${i}`}><span>{entry.name}</span><span>{ROUTES[entry.route].label} 선택</span><span>권장 {ROUTES[entry.recommended].label}</span></li>
          ))}</ol> : <p>경로를 선택하면 최근 기록이 표시됩니다.</p>}
        </div>
      </div>
    </section>
  );
}
