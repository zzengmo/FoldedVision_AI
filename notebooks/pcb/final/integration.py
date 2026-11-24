"""Combine independent PCB, lens and ring outputs by physical product ID."""
def predict_pcb(image):
    from inspect_pcb import predict_pcb as predict
    return predict(image)


def combine_team_results(results):
    """Combine independent native framework outputs without averaging confidence."""
    parts = {}
    for result in results:
        name=result.get('part_type','').upper()
        if name not in ('LENS','RING','PCB') or name in parts:
            raise ValueError('Unknown or duplicate part_type')
        if result.get('status') not in ('OK','NG','REVIEW'):
            raise ValueError('Expected OK / NG / REVIEW')
        parts[name]=result
    missing=sorted({'LENS','RING','PCB'}-set(parts))
    status='REVIEW' if missing else 'NG' if any(r['status']=='NG' for r in parts.values()) else 'REVIEW' if any(r['status']=='REVIEW' for r in parts.values()) else 'OK'
    return {'status':status,'missing_parts':missing,'parts':parts}


def combine_components(results, expected=("lens", "ring", "pcb")):
    indexed = {}
    product_ids = {result.get("product_id") for result in results}
    if len(product_ids) != 1 or None in product_ids or "" in product_ids:
        raise ValueError("세 결과에 동일한 비어 있지 않은 product_id가 필요합니다.")
    for result in results:
        component = result["component"]
        if component not in expected or component in indexed:
            raise ValueError("알 수 없거나 중복된 부품 결과입니다.")
        indexed[component] = result
    missing = sorted(set(expected) - set(indexed))
    invalid = [name for name, result in indexed.items()
               if result.get("status") not in ("review", "no_defect_detected")]
    status = "incomplete" if missing or invalid else "no_defect_detected"
    if any(result.get("status") == "review" for result in indexed.values()):
        status = "review" if not missing and not invalid else "incomplete"
    return {"schema_version": "1.0", "product_id": next(iter(product_ids)),
            "status": status, "missing_components": missing,
            "error_components": invalid, "components": indexed}
