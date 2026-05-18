{{- define "simple-books.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "simple-books.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "simple-books.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "simple-books.labels" -}}
helm.sh/chart: {{ include "simple-books.chart" . }}
{{ include "simple-books.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "simple-books.selectorLabels" -}}
app.kubernetes.io/name: {{ include "simple-books.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "simple-books.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "simple-books.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "simple-books.image" -}}
{{- $tag := default .Chart.AppVersion .Values.image.tag -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end -}}

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
