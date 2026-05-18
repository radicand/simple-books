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
  True when DATABASE_URL is supplied outside values.env (Postgres modes).
*/}}
{{- define "simple-books.databaseConfigured" -}}
{{- or .Values.database.existingSecretName .Values.database.externalUrl .Values.postgresql.enabled -}}
{{- end -}}

{{/*
  Bitnami PostgreSQL Secret name (chart-created or auth.existingSecret).
*/}}
{{- define "simple-books.postgresql.secretName" -}}
{{- if .Values.postgresql.auth.existingSecret -}}
{{- .Values.postgresql.auth.existingSecret -}}
{{- else if .Values.postgresql.fullnameOverride -}}
{{- .Values.postgresql.fullnameOverride -}}
{{- else -}}
{{- printf "%s-postgresql" .Release.Name -}}
{{- end -}}
{{- end -}}

{{- define "simple-books.postgresql.host" -}}
{{- include "simple-books.postgresql.secretName" . -}}
{{- end -}}

{{- define "simple-books.postgresql.userPasswordKey" -}}
{{- if .Values.postgresql.auth.secretKeys -}}
{{- .Values.postgresql.auth.secretKeys.userPasswordKey | default "password" -}}
{{- else -}}
password
{{- end -}}
{{- end -}}

{{/*
  DATABASE_URL env entries. Priority: database.existingSecretName > database.externalUrl > bundled Postgres.
*/}}
{{- define "simple-books.databaseEnv" -}}
{{- if .Values.database.existingSecretName -}}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ .Values.database.existingSecretName }}
      key: {{ .Values.database.existingSecretKey | default "DATABASE_URL" }}
{{- else if .Values.database.externalUrl -}}
- name: DATABASE_URL
  value: {{ .Values.database.externalUrl | quote }}
{{- else if .Values.postgresql.enabled -}}
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "simple-books.postgresql.secretName" . }}
      key: {{ include "simple-books.postgresql.userPasswordKey" . }}
- name: DATABASE_URL
  value: {{ printf "postgresql://%s:$(POSTGRES_PASSWORD)@%s:5432/%s" (.Values.postgresql.auth.username | default "simplebooks") (include "simple-books.postgresql.host" .) (.Values.postgresql.auth.database | default "simplebooks") | quote }}
{{- end -}}
{{- end -}}
