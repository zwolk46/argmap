# Determinism & persistence audit findings

- B1-OK: frame_version nodes+edges byte-equivalent across reload (5 nodes).
- B2-OK: cross-tab edit propagated via BroadcastChannel within ~7.5s.
- B2-NOTE: frame-version-drift-indicator visible on page2 = false (expected false in frame-building view).
- B3-FINDING (A): LWW overwrite — tab-A preserved=true ('B3-A edit on tab1 1778939330283'), tab-B preserved=false (''). Whole-row autosave on one tab can clobber the peer's edit if BroadcastChannel sync didn't land first.
- B4-FINDING (A): pre-debounce edit LOST on tab close. Expected 'B4 edit before close 1778939337878', got '(no statement)'.
- B5-OK: restored frame_version nodes+edges byte-equivalent to milestone snapshot.
