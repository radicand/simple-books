{{/*
  DATABASE_URL for the app container.
  Priority: database.externalUrl > bundled PostgreSQL subchart > SQLite path in values.env
*/}}
{{- define "simple-books.databaseUrl" -}}
{{- if .Values.database.externalUrl -}}
{{- .Values.database.externalUrl -}}
{{- else if .Values.postgresql.enabled -}}
{{- $user := .Values.postgresql.auth.username | urlquery -}}
{{- $pass := .Values.postgresql.auth.password | urlquery -}}
{{- $db := .Values.postgresql.auth.database | urlquery -}}
{{- $host := printf "%s-postgresql" .Release.Name -}}
postgresql://{{ $user }}:{{ $pass }}@{{ $host }}:5432/{{ $db }}
{{- else -}}
{{- .Values.env.DATABASE_URL | default "/app/data/simple-books.db" -}}
{{- end -}}
{{- end -}}
