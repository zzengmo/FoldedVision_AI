# Ring 최종 결과

## 유지한 최종 모델

- 모델: `models/ring_cnn_final.keras` — 기준 RGB CNN (`baseline_rgb`).
- 최종 평가 정확도 **80.95% (34/42)**, Macro F1 **0.5678**.
- 학습 33장 / 검증 12장 / 공식 val을 재지정한 최종 평가 42장.
- 전체 Ring 이미지 551장, 유형 정답 87장, 정답 없는 inference 464장.
- 검증 Macro F1로 선정했으며 개선 후보는 기준 모델보다 좋지 않아 채택하지 않았습니다.

## 해석 범위

Ring 모델은 오염·긁힘·표면 미가공의 결함 유형 분류입니다.
검증된 정상 라벨이 없어 정상/불량 판정·불량 Recall·실제 불량 감소율을 보고하지 않습니다.
반환 상태 REVIEW는 수동 검토 대상이라는 뜻입니다. Softmax 유형 점수는 불량 확률이 아닙니다.
U-Net은 검증 기준 미달로 시연에서 비활성화했고, Grad-CAM은 분류 근거 열지도입니다.
표면 미가공의 최종 평가 Recall은 0이며 적은 데이터와 재사용 평가 세트의 한계가 있습니다.
95% 목표는 달성하지 못했습니다.

## 추가로 학습한 베어링 자료

이 자료는 Ring과 다른 엔진 베어링 설치 상태 16종입니다.
내부 검증 **94.81%**, 최종 평가 **57.21% (365/638)**, Macro F1 **0.5556**입니다.
Ring 성능과 합쳐서 보고하지 않습니다. [베어링 상세 보고서](bearing_installation/REPORT.md)를 참고하세요.

## 코드와 통합 파일

- [베이스라인 코드](../01_Ring_CNN_Baseline.ipynb), [최종 코드](../02_Ring_DeepLearning_Final.ipynb).
- [팀 통합 지표](integration/ring_metrics.json), [입력·클래스·모델 설정](integration/ring_model_config.json), [42장 실제 예측](integration/ring_predictions.csv).
- `figures/`에는 데이터·학습 곡선·혼동행렬·설명용 그림, `metrics/`에는 분할과 수치가 있습니다.
- [데이터 출처](../DATA_SOURCES.md), [수업과 구현 연결](../COURSE_ALIGNMENT.md).

## 이전 실험과 정리 검증

미채택 Ring 추가 실험의 실제 결과는 1차 57.14%, 교차검증 후 재학습 80.95%였습니다.
최종 모델을 개선하지 못한 코드·가중치·결과는 원본 PC의 `archive/2026-11-19_before_cleanup.zip` 안에 보관했습니다.
현재 최종 노트북에서는 해당 PART 10~12를 분리했습니다.

데이터·현재 모델·최종 지표는 변경하지 않았습니다.
[보존 해시 검증](cleanup_records/preservation_validation.json), [실제 모델 추론 검사](cleanup_records/inference_validation.json),
[정리 결과](cleanup_records/cleanup_result.json)에서 확인할 수 있습니다.
작업 기억은 [AGENTS.md](../AGENTS.md)에 남겼습니다.
