export const COMPONENTS = {
  ring: {
    name: 'Ring',
    label: '표면 결함 유형 분류',
    metric: '80.95%',
    metricLabel: '최종 평가 정확도 · 34 / 42장',
    color: '#7bafff',
    summary: 'RGB CNN이 오염·긁힘·표면 미가공 유형을 구분합니다. Grad-CAM으로 분류에 참고한 영역을 확인할 수 있습니다.',
    limit: '표면 미가공 평가 사진 4장을 모두 긁힘으로 분류했습니다. 정상/불량 판정은 수동 검토 상태로 표시합니다.',
    scores: [{ label: '정확도', value: '80.95%' }, { label: 'Macro F1', value: '0.5678' }, { label: '표면 미가공', value: '0 / 4장' }],
    plot: { title: '최종 평가 · 유형별 정답 수', unit: '장', items: [
      { label: '오염', value: 12, max: 15 }, { label: '긁힘', value: 22, max: 23 }, { label: '표면 미가공', value: 0, max: 4 },
    ] },
    steps: [
      ['라벨이 있는 87장', '전체 551장 중 유형 정답이 있는 87장을 사용했습니다. 공식 검증 42장은 최종 평가용으로 남겼습니다.', '학습 33 · 검증 12 · 평가 42', 0],
      ['같은 사진, 세 가지 전처리', 'RGB·CLAHE·Gaussian Blur를 비교하고 전체 프레임을 256 × 256으로 줄여 입력했습니다.', 'OpenCV · RGB · 0–1 정규화', 1],
      ['Conv 32 · 64 · 128', '합성곱 세 층으로 특징을 학습하고, 두 번 풀링한 뒤 GAP와 Dense로 유형 세 가지를 분류했습니다.', 'TensorFlow/Keras CNN · Softmax 3종', 2],
      ['검증으로 선정한 기본 CNN', '검증 Macro F1이 가장 높았던 기본 RGB CNN을 선택했습니다. 최종 평가의 혼동행렬에 유형별 성능을 남겼습니다.', '34/42장 · Macro F1 0.5678', 3],
    ],
  },
  lens: {
    name: 'Lens',
    label: '구역 검사 및 결함 위치 실험',
    metric: '0.419',
    metricLabel: '최종 CNN · 구역 AP',
    color: '#88dced',
    summary: '렌즈를 256 픽셀 구역으로 나눠 CNN으로 점수를 매기고, U-Net으로 결함 위치를 표시하는 실험을 했습니다.',
    limit: '정상 구역 오검출률은 65.4%입니다. 최종 평가의 전체 렌즈 사진 52장은 모두 불량이라 정상 렌즈 판정 성능은 미측정입니다.',
    scores: [{ label: '불량 구역 Recall', value: '92.1%' }, { label: '정상 구역 오검출', value: '65.4%' }, { label: 'U-Net 평균 Dice', value: '0.284' }],
    plot: { title: '최종 평가 · 구역 AP 비교', unit: 'AP', items: [
      { label: '기준 CNN', value: .272, max: 1 }, { label: '개선 CNN', value: .419, max: 1 },
    ] },
    steps: [
      ['같은 렌즈를 묶어 분할', '사진 222장을 점검하고 같은 렌즈에서 나온 조각을 확인했습니다. 최종 평가에서 학습 렌즈와 겹친 11장을 제외했습니다.', '학습 50 · 검증 16 · 평가 52', 0],
      ['작은 결함을 남기는 256 구역', '촬영 크기별 작업 배율을 정한 다음 사진을 256 구역으로 나눴습니다. 폴리곤 마스크를 이용해 구역 정답을 만들었습니다.', '렌즈 영역 · 256 × 256 패치', 1],
      ['CNN 점수와 U-Net 위치', 'CNN에서 기본 RGB와 개선 입력 조합을 비교했습니다. U-Net은 BCE와 BCE+Dice를 비교해 위치 후보를 표시했습니다.', 'RGB + 클래스 가중치 · BCE+Dice', 2],
      ['구역 AP 개선, 사진 판정 검증은 남음', '동일한 최종 구역 3,410개의 AP가 0.272에서 0.419로 올랐습니다. U-Net 위치 표시의 평균 Dice는 0.284였습니다.', '동일 test · 52장 / 3,410구역', 3],
    ],
  },
  pcb: {
    name: 'PCB',
    label: 'YOLO 결함 검출 및 PCB4 적응',
    metric: '93.02%',
    metricLabel: 'PCB4 최종 평가 40장 · 이미지 F1',
    color: '#c9fa67',
    summary: '기존 PCB YOLO 가중치에서 PCB4를 추가 학습해, 사진 판정과 박스 기반 위치 검출을 비교했습니다.',
    limit: 'PCB4 정상 20장 중 3장을 NG로 표시했습니다. 원본 PCB test의 검출 mAP50–95는 63.87%에서 61.75%로 하락했습니다.',
    scores: [{ label: 'PCB4 사진 판정', value: '37 / 40장' }, { label: 'PCB4 불량 검출', value: '20 / 20장' }, { label: 'PCB4 박스 mAP50–95', value: '58.90%' }],
    plot: { title: '동일 PCB4 최종 평가 · 이미지 F1', unit: '%', items: [
      { label: '기존 YOLO', value: 71.11, max: 100 }, { label: 'PCB4 추가 학습', value: 93.02, max: 100 },
    ] },
    steps: [
      ['PCB4 정상 100장, 불량 100장', 'PCB4 200장의 종류별 분포와 142개 정답 박스를 확인하고 원본 PCB와 동일 파일 중복을 검사했습니다.', 'PCB4 학습 120 · 검증 40 · 평가 40', 0],
      ['실제 위치 라벨로 학습 입력 구성', 'LabelMe 사각형을 YOLO 형식으로 변환했습니다. 원본 PCB 9종과 PCB4 5종의 라벨을 각각 유지했습니다.', '원본 9종 + PCB4 5종', 1],
      ['기존 YOLO로 시작한 추가 학습', '기존 가중치를 사용해 원본 PCB와 PCB4를 함께 추가 학습했습니다. 원본 검증 mAP와 PCB4 검증 F1으로 후보를 선정했습니다.', '기존 가중치 · 14개 클래스', 2],
      ['같은 PCB4 평가에서 오검출 감소', '정상 오검출이 9장에서 3장으로 줄었습니다. 사진 분류 F1과 박스 검출 mAP는 따로 기록했습니다.', '이미지 F1 71.11% → 93.02%', 3],
    ],
  },
  bearing: {
    name: 'Bearing',
    label: '엔진 베어링 설치 조합 · 추가 실험',
    metric: '57.21%',
    metricLabel: '베어링 16종 · 최종 평가 638장',
    color: '#f3bf8c',
    summary: '다운로드한 엔진 베어링 사진으로 설치 상태 조합 16종을 분류했습니다. 숫자 폴더 1–16을 설치 조합 ID로 사용했습니다.',
    limit: '내부 검증 94.81%와 최종 평가 57.21% 사이에 차이가 있었습니다. 같은 엔진 촬영 자료에서 확인한 결과입니다.',
    scores: [{ label: '내부 검증', value: '94.81%' }, { label: '최종 평가', value: '365 / 638장' }, { label: '최종 Macro F1', value: '0.5556' }],
    plot: { title: '최종 평가 · 베어링 설치 조합 정확도', unit: '%', items: [
      { label: '기준 CNN', value: 9.87, max: 100 }, { label: '선정 모델', value: 57.21, max: 100 },
    ] },
    steps: [
      ['엔진 베어링 설치 상태 16종', '원본 1,573장에서 동일 파일과 일련 번호 블록을 확인하고 분할 사이의 겹침을 정리했습니다.', '학습 773 · 검증 154 · 평가 638', 0],
      ['RGB 192 × 192', '입력 크기를 통일하고, 학습 증강에 작은 이동·회전·대비 변화를 적용했습니다.', '192 × 192 · 모델 내부 정규화', 0],
      ['공간 특징과 증강 비교', '기준 CNN과 공간 특징·증강 후보를 검증 Macro F1로 비교했습니다.', '4개 후보 · 최대 70 epoch', 1],
      ['최종 평가 365장 정답', '기준 CNN보다 47.34%p 개선됐습니다. 95% 목표는 최종 평가에서 미달했습니다.', '57.21% · Macro F1 0.5556', 2],
    ],
  },
};

export const PIPELINE = ['데이터 탐색', '전처리', '모델링', '최종 평가'];

export const FACTORY_JOBS = [
  {
    id: 'pcb-box', kind: 'pcb', name: 'PCB · 검출', station: '납땜 과다 박스',
    input: 'pcb-baseline-ground-truth.webp', result: 'pcb-baseline-prediction.webp',
    inputLabel: '정답 박스 · 녹색', resultLabel: 'YOLO 검출 박스 · 빨강',
    finding: '납땜 과다 후보', value: '71.6%', measure: '이 사진의 가장 높은 박스 점수',
    truth: '정답에 납땜 과다 박스가 있습니다.', route: 'reject',
    reason: '결함 박스가 정답 위치와 대응합니다. 체험에서는 확인된 불량을 분리합니다.',
    source: '팀 PCB_YOLO · 원본 PCB 검증 사례',
  },
  {
    id: 'lens-fp', kind: 'lens', name: 'Lens · 오검출', station: '정상 구역 오검출',
    input: 'quality/lens-error.webp', result: 'quality/lens-error.webp',
    inputLabel: '평가에서 잘라낸 256×256 구역', resultLabel: '같은 구역의 분류 결과',
    finding: '불량 구역 후보', value: '0.145', measure: '구역 점수 · 판정 기준 0.037',
    truth: '마스크에 결함이 없는 정상 구역입니다.', route: 'review',
    reason: '구역 모델의 오검출 사례입니다. 렌즈 전체의 통과 여부는 작업자가 다시 확인합니다.',
    source: 'VISION Lens · val/000066.jpg · 구역 좌표 (384, 0)',
  },
  {
    id: 'ring-type', kind: 'ring', name: 'Ring · 오분류', station: '오염을 표면 미가공으로 예측',
    input: 'quality/ring-error.webp', result: 'quality/ring-error.webp',
    inputLabel: '평가 사진 · Ring', resultLabel: '사진 전체에 대한 유형 점수',
    finding: '표면 미가공 후보', value: '96.6%', measure: '예측 유형 점수 · Ring 3유형 분류',
    truth: '정답 유형은 오염입니다.', route: 'review',
    reason: '높은 점수에서도 유형을 틀릴 수 있습니다. Ring 모델은 정상 판정 없이 유형을 제시하므로 재검합니다.',
    source: 'VISION Ring · 테스트 val:11',
  },
  {
    id: 'pcb-normal', kind: 'pcb', name: 'PCB2 · 정상', station: '정상 기판 확인',
    input: 'quality/pcb-normal.webp', result: 'quality/pcb-normal.webp',
    inputLabel: '공식 테스트에서 가져온 PCB2', resultLabel: '사진 전체 분류 결과',
    finding: '정상 예측', value: '0.000008', measure: '불량 점수 · 판정 기준 0.038',
    truth: '공식 VisA 테스트에서 정상 라벨입니다.', route: 'pass',
    reason: '시험 라벨과 예측이 일치합니다. 체험에서는 정상 확인 뒤 통과시킵니다.',
    source: 'Amazon VisA · pcb2/Data/Images/Normal/0001.JPG',
  },
];

export const ROUTES = {
  pass: { label: '통과', hint: '작업자 확인 정상' },
  review: { label: '재검', hint: '판정 보류' },
  reject: { label: '분리', hint: '작업자 확인 불량' },
};
