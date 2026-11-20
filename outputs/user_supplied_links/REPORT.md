# 사용자 제공 링크 다운로드·학습 결과

사용자의 후속 요청에 따라 다운로드한 베어링 자료로 실제 재학습을 완료했습니다.
같은 베어링 최종 평가 638장 기준 CNN 9.87% → 개선 CNN 57.21%(365장 정답), Macro F1 0.5556입니다.
내부 검증 94.81%를 최종 정확도로 보고하지 않았습니다. 95% 목표는 달성하지 못했습니다.
[전체 학습 결과](../bearing_installation/REPORT.md), [평가 지표](../bearing_installation/metrics.json).

## 다운로드와 출처

- 사용자 제공 [Google Drive Data.zip](https://drive.google.com/file/d/1x1fWg54HHkBc4zABBs3n2Szl6izrwr3n/view).
- 원제공자 [Bearing-Dataset](https://github.com/alireza768/Bearing-Dataset).
- 원본: data/archives/user_oring/Data.zip (1,383,934,519 bytes).
- SHA-256: 1e785532382b487eb2838aa9bfa860c0b07e80a72ebe9acf46abd938d0af59d9.
- 추출: data/external/user_drive_bearing/Data/.
- 총 1,573장 / 원본 Train 933장 / 원본 Validation 640장 / 폴더 정답 1~16.
- 중복·번호 블록 겹침 정리 후 학습 773장, 내부 검증 154장, 최종 평가 638장.
- 파일별 목록·다운로드 기록: data/external/source_metadata/user_ring_links/.

## 실제 수행한 학습

TensorFlow/Keras로 기준 GAP CNN, Flatten CNN, 증강 CNN, 검증 정확도 저장 증강 CNN의 4개 후보를 학습했습니다.
각각 70/22/33/61 epoch를 실제 실행했고, 검증 Macro F1로 최종 후보를 정한 뒤 원본 Validation에서 평가했습니다.
모델은 models/bearing_installation/bearing_cnn_final.keras에 저장했습니다.
학습 코드는 두 노트북의 마지막 베어링 절에 있습니다.

자료는 엔진 베어링 설치 조합 16종입니다. 클래스 번호를 Ring 결함이나 정상/불량으로 바꾸지 않았습니다.
기존 Ring 정확도 80.95%와 직접 비교할 수 없으며 기존 모델과 통합 출력은 보존했습니다.
내부 검증과 최종 평가의 큰 차이를 확인했으므로 새 촬영 조건으로 일반화했다고 주장하지 않습니다.

## Roboflow 상태

[제공된 O-Ring v1](https://universe.roboflow.com/el-ewg0p/o-ring-defect-detection-doyk7/dataset/1)은 다운로드 HTTP 403으로 미확보 상태이며 이번 학습에 사용하지 않았습니다.
