"""Keep frozen research and completed holdings intact across all save paths."""
import copy
from fastapi import HTTPException
from backend.workspace_schema import Company

FROZEN_COLLECTIONS = ('models','memos','decisions','observations','alert_reviews','viewpoints','operating_models')


def preserve_frozen_history(previous, candidate):
    normalized = Company.model_validate(previous).model_dump(mode='json')
    result = dict(candidate)
    for key in FROZEN_COLLECTIONS:
        original = previous.get(key, [])
        proposed = candidate.get(key, [])
        if not isinstance(original, list) or not isinstance(proposed, list) or proposed[:len(original)] != normalized[key]:
            raise HTTPException(403, 'Frozen research cannot be changed or removed; append a new version.')
        result[key] = copy.deepcopy(original) + proposed[len(original):]
    original = previous.get('opportunities', [])
    proposed = candidate.get('opportunities', [])
    if not isinstance(original, list) or not isinstance(proposed, list):
        raise HTTPException(403, 'Opportunities must remain an array.')
    retained = copy.deepcopy(proposed)
    for raw, typed in zip(original, normalized['opportunities']):
        if typed['stage'] != 'Closed':
            continue
        matches = [index for index, item in enumerate(proposed)
                   if isinstance(item, dict) and item.get('id') == typed['id']]
        if len(matches) != 1 or proposed[matches[0]] != typed:
            raise HTTPException(403, 'A completed holding cannot be changed or removed; record a new opportunity.')
        retained[matches[0]] = copy.deepcopy(raw)
    result['opportunities'] = retained
    return result
