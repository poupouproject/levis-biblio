#!/usr/bin/env bash
# Relance « Prêt à publier » pour la plus ancienne pull request en file:
# ouverte, avec « ready », sans le verrou, hors brouillon. Appelé quand le
# verrou se libère (publication terminée, échec, fermeture).
# SAUF: une PR à écarter (celle qui vient de perdre « ready »: la liste des
# labels lue juste après peut ne pas encore en tenir compte).
set -euo pipefail

next="$(gh pr list --repo "$GITHUB_REPOSITORY" --state open --base main --label "${READY:-ready}" \
  --json number,isDraft,labels \
  --jq "map(select(.isDraft | not) | select(.labels | map(.name) | index(\"${LOCK:-publication-en-cours}\") | not)) | map(select(.number != ${SAUF:-0})) | sort_by(.number) | .[0].number // empty")"

if [ -n "$next" ]; then
  echo "PR suivante en file: #$next"
  # Échoue tant que pret-a-publier.yml n'est pas sur main (workflow_dispatch):
  # sans conséquence pour la PR qui libère le verrou.
  gh workflow run pret-a-publier.yml --repo "$GITHUB_REPOSITORY" -f pr="$next" ||
    echo "::warning::Impossible de relancer « Prêt à publier » pour la PR #$next"
else
  echo "Aucune PR en file."
fi
