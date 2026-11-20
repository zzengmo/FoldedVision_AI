# 다운로드한 베어링 자료 실제 학습 결과 (full)

## 결과
실제 베어링 설치 상태 16종 학습과 평가를 수행했다.
기준 CNN 정확도 9.8746% → 검증 선정 모델 정확도 57.2100%.
차이: +47.34%p. 최종 Macro F1 0.5556.
최종 정답 365/638. 베어링 분류 95% 목표: 미달.
최종 모델: bearing_cnn_spatial_aug_accuracy. 모든 계층을 TensorFlow/Keras로 직접 학습했다.

## 데이터와 분할
다운로드 원본 1573장. 원본 Train 933장, 원본 Validation 640장.
동일 바이트 중복 초과 3장.
학습 773장 / 내부 검증 154장 / 최종 홀드아웃 638장.
원본 Validation을 최종 평가로 재지정했다.
동일 SHA 및 같은 클래스 파일명 번호 5장 블록이 분할 사이에 겹치지 않게 했다.
파일 번호 블록은 누수 완화를 위한 가정이며 실제 부품/촬영 세션 ID가 아니다.

## 출처
사용자 제공: https://drive.google.com/file/d/1x1fWg54HHkBc4zABBs3n2Szl6izrwr3n/view
원제공자: https://github.com/alireza768/Bearing-Dataset
원본 ZIP: data/archives/user_oring/Data.zip
정답은 폴더 1~16의 설치 조합 ID다. 정상/불량 또는 O-Ring 결함 라벨로 바꾸지 않았다.

## 수업 기반 개선
기준 CNN의 GAP와 개선 CNN의 Flatten을 동일 분할에서 비교했다.
설치 위치를 보존하고, 작은 이동/회전/대비 증강 후보를 비교했다. 좌우 반전은 하지 않았다.
선정은 검증 Macro F1 → 검증 정확도 → 적은 파라미터 순서로 했다.
홀드아웃 점수를 보고 모델을 다시 고르지 않았다.

## 해석 범위
이 점수는 베어링 설치 상태 16종 분류다. 기존 VISION Ring 3종의 80.95%와 직접 비교할 수 없다.
동일 엔진 장면의 사진이므로 새 엔진·새 공장 성능을 입증하지 않는다.
베어링 설치 ID와 정상/불량 대응표가 없어 정상/불량 Recall이나 불량 감소율은 계산하지 않았다.
기존 Ring 모델·통합 출력은 유지했다.

## 산출물
모델: models/bearing_installation/bearing_cnn_final.keras
outputs/bearing_installation의 metrics.json, predictions.csv, model_config.json, class_report.csv.
figures 폴더에 샘플·학습 곡선·혼동행렬·비교 그래프를 저장했다.
predict_bearing_installation(image)와 로컬 Gradio 시연을 포함했다.
검증 기록: validation_checks.json, ui_validation.json, notebook_execution.json.

## 실행 검증과 학습 이력 기록

노트북 full 실행, 4후보 quick 실행, 분할 독립성, 638장 CSV의 정확도·Macro F1 재계산,
기존 Ring 가중치 보존, 학습 데이터 없이 모델·설정 파일만으로 한 예측과 Gradio API 호출을 확인했다.
내부 검증 94.81%와 최종 평가 57.21%를 구분하며, 내부 검증 점수를 최종 성능으로 제시하지 않는다.

현재 제공된 full 실험의 첫 기준/공간 CNN은 학습과 체크포인트 저장 뒤 이력 JSON의 NumPy float 직렬화 오류가 있었다.
실제 학습 stdout에서 표시된 이력을 복원했으며 그 값은 출력 정밀도로 반올림되어 있다.
체크포인트 가중치는 변경하지 않았고, 확인할 수 없는 학습 시간은 null로 남겼다.
이후 JSON 저장은 Python float 변환으로 수정했고 증강 두 후보는 정상 저장했다.
각 모델 JSON의 history_provenance와 validation_checks.json에 근거를 남겼다.
