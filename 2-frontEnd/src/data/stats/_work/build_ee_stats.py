# -*- coding: utf-8 -*-
import json
import os

REPO_ROOT = r'C:\proj2_\study'
WORK_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'stats', '_work')
OUT_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'stats', 'electrical-cert', 'electrical-engineer')

SUBJECTS = ['electromagnetics', 'power-engineering', 'electrical-machinery', 'circuit-control', 'electrical-facilities-standards']
ROUNDS = ['2019-04', '2020-06', '2021-05', '2021-08', '2022-04']

os.makedirs(OUT_DIR, exist_ok=True)

per_subject = {}
for s in SUBJECTS:
    with open(os.path.join(WORK_DIR, s + '-counts.json'), encoding='utf-8') as f:
        per_subject[s] = json.load(f)

for round_id in ROUNDS:
    merged_counts = {}
    total = 0
    for s in SUBJECTS:
        round_counts = per_subject[s].get(round_id, {})
        subj_sum = sum(round_counts.values())
        if subj_sum != 20:
            raise SystemExit(f'{round_id}/{s}: sums to {subj_sum}, expected 20')
        for topic_id, n in round_counts.items():
            merged_counts[topic_id] = merged_counts.get(topic_id, 0) + n
            total += n
    if total != 100:
        raise SystemExit(f'{round_id}: total {total}, expected 100')
    out_path = os.path.join(OUT_DIR, round_id + '.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({'counts': merged_counts}, f, ensure_ascii=False, indent=2)
    print(f'{round_id}: {len(merged_counts)} topics, total {total} -> {out_path}')
