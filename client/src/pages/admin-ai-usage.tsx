import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminService } from "@/services/admin-service";
import { FilterBar, FilterValues } from "@/components/filter-bar";
import { AI_MODEL_LIST } from "@shared/ai-models";
import type { AIUsageMetadata } from "@shared/ai-usage";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString() + " " + time;
}

function truncate(value?: string, max = 80) {
  if (!value) return "—";
  return value.length > max ? value.slice(0, max) + "…" : value;
}

function formatDurationMs(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }
  return numberFormatter.format(value);
}

interface LanguageMeta {
  id?: string;
  code?: string;
  name: string;
  sourceSymbol: string;
  targetSymbol: string;
}

const LANGUAGE_LIBRARY: Record<string, LanguageMeta> = {
  "lang-kannada": { id: "lang-kannada", code: "kn", name: "Kannada", sourceSymbol: "A", targetSymbol: "ಅ" },
  "lang-hindi": { id: "lang-hindi", code: "hi", name: "Hindi", sourceSymbol: "A", targetSymbol: "अ" },
};

const LANGUAGE_CODE_LIBRARY: Record<string, LanguageMeta> = Object.values(LANGUAGE_LIBRARY).reduce(
  (acc, meta) => {
    if (meta.code) {
      acc[meta.code] = meta;
    }
    return acc;
  },
  {} as Record<string, LanguageMeta>
);

function titleize(value?: string) {
  if (!value) return undefined;
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function resolveLanguageMeta(languageId?: string, metadata?: AIUsageMetadata | null): LanguageMeta {
  if (languageId && LANGUAGE_LIBRARY[languageId]) {
    return LANGUAGE_LIBRARY[languageId];
  }

  const metadataRecord = metadata as Record<string, unknown> | undefined;
  const code = metadata?.languageCode ?? (typeof metadataRecord?.languageCode === "string" ? (metadataRecord.languageCode as string) : undefined);
  if (code && LANGUAGE_CODE_LIBRARY[code]) {
    return LANGUAGE_CODE_LIBRARY[code];
  }

  const fallbackName = typeof metadataRecord?.targetLang === "string"
    ? (metadataRecord.targetLang as string)
    : typeof metadataRecord?.languageName === "string"
      ? (metadataRecord.languageName as string)
      : undefined;

  return {
    id: languageId,
    code,
    name: fallbackName ?? languageId ?? code ?? "—",
    sourceSymbol: "A",
    targetSymbol: "अ",
  };
}

function formatModeDisplay(mode?: string, languageMeta?: LanguageMeta) {
  if (!mode) return "—";
  const source = languageMeta?.sourceSymbol ?? "A";
  const target = languageMeta?.targetSymbol ?? "अ";

  switch (mode) {
    case "lazy-listen":
    case "listen":
      return `Lazy Listen (${source} → ${target})`;
    case "guided-kn-en":
    case "guide-kn-en":
    case "guide-target-source":
      return `Guided (${target} → ${source})`;
    case "guided-en-kn":
    case "guide-en-kn":
    case "guide":
      return `Guided (${source} → ${target})`;
    default:
      return titleize(mode) ?? "—";
  }
}

function formatLevelDisplay(level?: string) {
  return level ? titleize(level) ?? level : "—";
}

function formatFeatureDisplay(functionality?: string, fallbackFeature?: string) {
  if (functionality === "translate") {
    return "Translation";
  }
  if (functionality === "learn" || functionality === "lesson") {
    return "Learn with Examples";
  }
  return titleize(fallbackFeature) ?? fallbackFeature ?? "—";
}

function formatDateTimeValue(timestamp?: string, dateOnly?: string) {
  if (timestamp) {
    return formatTimestamp(timestamp);
  }
  if (dateOnly) {
    return dateOnly;
  }
  return "—";
}

interface MandatoryFieldSet {
  datetime: string;
  model: string;
  language: string;
  feature: string;
  level: string;
  mode: string;
  user: string;
  languageMeta: LanguageMeta;
  functionality?: string;
  rawMode?: string;
}

interface MandatoryFieldInput {
  timestamp?: string;
  date?: string;
  modelId?: string;
  userId?: string;
  languageId?: string;
  metadata?: AIUsageMetadata | null;
  functionality?: string;
  fallbackFeature?: string;
  learningMode?: string;
  learningLevel?: string;
}

function computeMandatoryFields(input: MandatoryFieldInput): MandatoryFieldSet {
  const metadataRecord = input.metadata as (AIUsageMetadata & Record<string, unknown>) | undefined;
  const functionality = input.functionality ?? metadataRecord?.functionality ?? (typeof metadataRecord?.feature === "string" ? (metadataRecord.feature as string) : undefined);
  const learningMode =
    input.learningMode ??
    metadataRecord?.learningMode ??
    (typeof metadataRecord?.mode === "string" ? (metadataRecord.mode as string) : undefined);
  const learningLevel =
    input.learningLevel ??
    metadataRecord?.learningLevel ??
    (typeof metadataRecord?.level === "string" ? (metadataRecord.level as string) : undefined);
  const languageId = input.languageId ?? metadataRecord?.languageId ?? (typeof metadataRecord?.languageId === "string" ? (metadataRecord.languageId as string) : undefined);

  const languageMeta = resolveLanguageMeta(languageId, input.metadata);

  return {
    datetime: formatDateTimeValue(input.timestamp, input.date),
    model: input.modelId ?? "—",
    language: languageMeta.name,
    feature: formatFeatureDisplay(functionality, input.fallbackFeature),
    level: formatLevelDisplay(learningLevel),
    mode: formatModeDisplay(learningMode, languageMeta),
    user: input.userId ?? "—",
    languageMeta,
    functionality,
    rawMode: learningMode,
  };
}

export default function AdminAIUsagePage() {
  const [filters, setFilters] = useState<FilterValues>({});

  const queryFilters = useMemo(() => {
    const result: Record<string, string | number | undefined> = {};
    if (filters.languageId) result.languageId = filters.languageId;
    if (filters.modelId) result.modelId = filters.modelId;
    if (filters.start) result.start = filters.start;
    if (filters.end) result.end = filters.end;
    return result;
  }, [filters]);

  const logsQuery = useQuery({
    queryKey: ["/api/admin/ai-usage/logs", queryFilters],
    queryFn: () => AdminService.fetchAIUsageLogs({ limit: 100, ...queryFilters }),
  });

  const summaryQuery = useQuery({
    queryKey: ["/api/admin/ai-usage/daily-summary", queryFilters],
    queryFn: () => AdminService.fetchAIDailyUsage({ limit: 30, ...queryFilters }),
  });

  const feedbackLogsQuery = useQuery({
    queryKey: ["/api/admin/feedback/logs", queryFilters],
    queryFn: () => AdminService.fetchFeedbackLogs({ limit: 100, ...queryFilters }),
  });

  const feedbackSummaryQuery = useQuery({
    queryKey: ["/api/admin/feedback/summary", queryFilters],
    queryFn: () => AdminService.fetchFeedbackSummary({ limit: 30, ...queryFilters }),
  });

  const engagementSummaryQuery = useQuery({
    queryKey: ["/api/admin/engagement/summary", queryFilters],
    queryFn: () => AdminService.fetchEngagementSummary({ limit: 30, ...queryFilters }),
  });

  const engagementLogsQuery = useQuery({
    queryKey: ["/api/admin/engagement/logs", queryFilters],
    queryFn: () => AdminService.fetchEngagementLogs({ limit: 100, ...queryFilters }),
  });

  const languageOptions = useMemo<{ label: string; value: string }[]>(() => {
    const usageRecords = logsQuery.data?.records ?? [];
    const feedbackRecords = feedbackLogsQuery.data?.records ?? [];
    const engagementRecords = engagementLogsQuery.data?.records ?? [];
    const ids = new Set<string>();

    usageRecords.forEach((record) => {
      const id = (record.metadata?.languageId as string | undefined) ?? undefined;
      if (id) ids.add(id);
    });
    feedbackRecords.forEach((record) => {
      if (record.languageId) ids.add(record.languageId);
    });
    engagementRecords.forEach((record) => {
      if (record.languageId) ids.add(record.languageId);
    });

    return Array.from(ids.values()).map((value) => ({ label: value, value }));
  }, [logsQuery.data, feedbackLogsQuery.data, engagementLogsQuery.data]);

  const modelOptions = useMemo(() => {
    return AI_MODEL_LIST.map((model) => ({ label: model.label, value: model.id }));
  }, []);

  const pricingDetails = useMemo(() => {
    const source = logsQuery.data?.pricingSource || summaryQuery.data?.pricingSource;
    const effectiveDate =
      logsQuery.data?.pricingEffectiveDate || summaryQuery.data?.pricingEffectiveDate;
    if (!source && !effectiveDate) {
      return null;
    }
    return { source, effectiveDate };
  }, [logsQuery.data, summaryQuery.data]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">AI Usage Insights</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Track per-request token consumption, identify heavy features, and estimate operating costs.
          Use this data to tune limits, pricing, and subscription tiers.
        </p>
        {pricingDetails && (
          <p className="text-xs text-muted-foreground">
            Pricing source: {pricingDetails.source ?? "Unknown"}
            {pricingDetails.effectiveDate ? " (effective " + pricingDetails.effectiveDate + ")" : ""}
          </p>
        )}
      </header>

      <FilterBar
        languages={languageOptions}
        models={modelOptions}
        filters={filters}
        onChange={(next) => setFilters(next)}
        onReset={() => setFilters({})}
      />

     <Card>
       <CardHeader>
         <CardTitle className="text-xl">Recent AI Calls</CardTitle>
          <CardDescription>
            Latest 100 interactions across the platform. Costs include both prompt (input) and output tokens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading usage logs…</p>
          ) : logsQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load usage logs right now.</p>
          ) : logsQuery.data && logsQuery.data.records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Evaluation</TableHead>
                  <TableHead className="text-right">Response Time (ms)</TableHead>
                  <TableHead className="text-right">Input Tokens</TableHead>
                  <TableHead className="text-right">Output Tokens</TableHead>
                  <TableHead className="text-right">Total Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.data.records.map((record) => {
                  const metadata = record.metadata;
                  const inferredFunctionality =
                    metadata?.functionality ?? (record.feature === "translation" ? "translate" : record.feature === "language-content" ? "learn" : undefined);
                  const mandatory = computeMandatoryFields({
                    timestamp: record.timestamp,
                    modelId: record.modelId,
                    userId: record.userId,
                    languageId: metadata?.languageId,
                    metadata,
                    functionality: inferredFunctionality,
                    fallbackFeature: record.feature,
                    learningMode: metadata?.learningMode,
                    learningLevel: metadata?.learningLevel,
                  });

                  const operationLabel = titleize(record.operation) ?? record.operation;
                  const evaluationLabel = record.operation.includes("lesson-check-answer")
                    ? "Lesson Check Answer"
                    : record.operation.includes("check-answer")
                      ? (record.operation.includes("detailed") ? "Check Answer (Detailed)" : "Check Answer")
                      : "—";

                  return (
                    <TableRow key={record.id}>
                      <TableCell>{mandatory.datetime}</TableCell>
                      <TableCell>{mandatory.model}</TableCell>
                      <TableCell>{mandatory.language}</TableCell>
                      <TableCell>{mandatory.feature}</TableCell>
                      <TableCell>{mandatory.level}</TableCell>
                      <TableCell>{mandatory.mode}</TableCell>
                      <TableCell>{mandatory.user}</TableCell>
                      <TableCell>{operationLabel}</TableCell>
                      <TableCell>{evaluationLabel}</TableCell>
                      <TableCell className="text-right">{formatDurationMs(record.durationMs)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(record.inputTokens)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(record.outputTokens)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(record.totalTokens)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.totalCost, record.currency)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No usage has been recorded yet.</p>
          )}
        </CardContent>
     </Card>

     <Card>
       <CardHeader>
         <CardTitle className="text-xl">Daily Token Summary</CardTitle>
          <CardDescription>
            Aggregate tokens and spend by user/model to highlight trend lines over the last 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summaryQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Generating daily summary…</p>
          ) : summaryQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load daily summary right now.</p>
          ) : summaryQuery.data && summaryQuery.data.summaries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Input Tokens</TableHead>
                  <TableHead className="text-right">Output Tokens</TableHead>
                  <TableHead className="text-right">Total Tokens</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryQuery.data.summaries.map((summary) => {
                  const rowKey = summary.date + "-" + summary.userId + "-" + summary.modelId;
                  return (
                    <TableRow key={rowKey}>
                      <TableCell>{summary.date}</TableCell>
                      <TableCell>{summary.userId}</TableCell>
                      <TableCell>{summary.modelId}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(summary.inputTokens)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(summary.outputTokens)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(summary.totalTokens)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(summary.totalCost, summary.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No daily usage summary has been recorded yet.</p>
          )}
        </CardContent>
     </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Feedback Summary (Last 30 entries)</CardTitle>
          <CardDescription>
            Breakdown of positive vs negative signals by language/model. Use it to spot regressions quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackSummaryQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Summarising feedback…</p>
          ) : feedbackSummaryQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load feedback summary.</p>
          ) : feedbackSummaryQuery.data && feedbackSummaryQuery.data.buckets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Positive</TableHead>
                  <TableHead className="text-right">Negative</TableHead>
                  <TableHead className="text-right">Neutral</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackSummaryQuery.data.buckets.map((bucket, index) => {
                  const mandatory = computeMandatoryFields({
                    date: bucket.date,
                    modelId: bucket.modelId,
                    userId: bucket.userId,
                    languageId: bucket.languageId,
                    metadata: {
                      functionality: bucket.functionality,
                      learningMode: bucket.learningMode,
                      learningLevel: bucket.learningLevel,
                      languageId: bucket.languageId,
                    },
                    functionality: bucket.functionality,
                    fallbackFeature: bucket.feature,
                    learningMode: bucket.learningMode,
                    learningLevel: bucket.learningLevel,
                  });

                  return (
                    <TableRow key={`${bucket.date}-${bucket.modelId}-${bucket.feature}-${bucket.languageId ?? "all"}-${index}`}>
                      <TableCell>{mandatory.datetime}</TableCell>
                      <TableCell>{mandatory.model}</TableCell>
                      <TableCell>{mandatory.language}</TableCell>
                      <TableCell>{mandatory.feature}</TableCell>
                      <TableCell>{mandatory.level}</TableCell>
                      <TableCell>{mandatory.mode}</TableCell>
                      <TableCell>{mandatory.user}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(bucket.total)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(bucket.positive)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(bucket.negative)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(bucket.neutral)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No feedback received yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Latest Feedback</CardTitle>
          <CardDescription>
            Raw feedback entries (max 100). Scan comments to understand specific user pain points.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackLogsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading feedback logs…</p>
          ) : feedbackLogsQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load feedback logs.</p>
          ) : feedbackLogsQuery.data && feedbackLogsQuery.data.records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead>Touchpoint</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Translation</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackLogsQuery.data.records.map((record) => {
                  const metadata: AIUsageMetadata = {
                    functionality: record.functionality,
                    learningMode: record.learningMode,
                    learningLevel: record.learningLevel,
                    languageId: record.languageId,
                  };
                  const mandatory = computeMandatoryFields({
                    timestamp: record.createdAt,
                    modelId: record.modelId,
                    userId: record.userId,
                    languageId: record.languageId,
                    metadata,
                    functionality: record.functionality,
                    fallbackFeature: record.feature,
                    learningMode: record.learningMode,
                    learningLevel: record.learningLevel,
                  });

                  return (
                    <TableRow key={record.id}>
                      <TableCell>{mandatory.datetime}</TableCell>
                      <TableCell>{mandatory.model}</TableCell>
                      <TableCell>{mandatory.language}</TableCell>
                      <TableCell>{mandatory.feature}</TableCell>
                      <TableCell>{mandatory.level}</TableCell>
                      <TableCell>{mandatory.mode}</TableCell>
                      <TableCell>{mandatory.user}</TableCell>
                      <TableCell className={record.signal === "negative" ? "text-red-600" : record.signal === "positive" ? "text-green-600" : "text-gray-600"}>
                        {record.signal}
                      </TableCell>
                      <TableCell>{titleize(record.touchpoint) ?? record.touchpoint}</TableCell>
                      <TableCell>{record.reason ?? "—"}</TableCell>
                      <TableCell className="max-w-xs">
                        <span title={record.context?.sourceText}>{truncate(record.context?.sourceText)}</span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span title={record.context?.translationText}>{truncate(record.context?.translationText)}</span>
                      </TableCell>
                      <TableCell>{record.comment ?? ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No feedback records yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Engagement Summary</CardTitle>
          <CardDescription>
            Actions and XP relative to active minutes (90s idle cutoff). Track which languages and models keep learners engaged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {engagementSummaryQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Calculating engagement…</p>
          ) : engagementSummaryQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load engagement summary.</p>
          ) : engagementSummaryQuery.data && engagementSummaryQuery.data.buckets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-right">Active Min</TableHead>
                  <TableHead className="text-right">Actions / Min</TableHead>
                  <TableHead className="text-right">XP / Min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagementSummaryQuery.data.buckets.map((bucket) => {
                  const metadata: AIUsageMetadata = {
                    functionality: bucket.functionality,
                    learningMode: bucket.learningMode,
                    learningLevel: bucket.learningLevel,
                    languageId: bucket.languageId,
                  };
                  const mandatory = computeMandatoryFields({
                    date: bucket.date,
                    modelId: bucket.modelId,
                    userId: bucket.userId,
                    languageId: bucket.languageId,
                    metadata,
                    functionality: bucket.functionality,
                    fallbackFeature: bucket.feature,
                    learningMode: bucket.learningMode,
                    learningLevel: bucket.learningLevel,
                  });

                  return (
                    <TableRow key={`${bucket.date}-${bucket.userId}-${bucket.modelId}-${bucket.feature}-${bucket.languageId ?? "all"}`}>
                      <TableCell>{mandatory.datetime}</TableCell>
                      <TableCell>{mandatory.model}</TableCell>
                      <TableCell>{mandatory.language}</TableCell>
                      <TableCell>{mandatory.feature}</TableCell>
                      <TableCell>{mandatory.level}</TableCell>
                      <TableCell>{mandatory.mode}</TableCell>
                      <TableCell>{mandatory.user}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(bucket.actionCount)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(bucket.xpTotal)}</TableCell>
                      <TableCell className="text-right">{bucket.activeMinutes.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{bucket.actionsPerActiveMinute.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{bucket.xpPerActiveMinute.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No engagement data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recent Engagement Events</CardTitle>
          <CardDescription>
            Most recent interactions (max 100). Useful when you need session-level detail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {engagementLogsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading engagement logs…</p>
          ) : engagementLogsQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load engagement logs.</p>
          ) : engagementLogsQuery.data && engagementLogsQuery.data.records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">XP Δ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagementLogsQuery.data.records.map((record) => {
                  const metadata: AIUsageMetadata = {
                    functionality: record.functionality,
                    learningMode: record.learningMode,
                    learningLevel: record.learningLevel,
                    languageId: record.languageId,
                  };
                  const mandatory = computeMandatoryFields({
                    timestamp: record.timestamp,
                    modelId: record.modelId,
                    userId: record.userId,
                    languageId: record.languageId,
                    metadata,
                    functionality: record.functionality,
                    fallbackFeature: record.feature,
                    learningMode: record.learningMode,
                    learningLevel: record.learningLevel,
                  });

                  return (
                    <TableRow key={record.id}>
                      <TableCell>{mandatory.datetime}</TableCell>
                      <TableCell>{mandatory.model}</TableCell>
                      <TableCell>{mandatory.language}</TableCell>
                      <TableCell>{mandatory.feature}</TableCell>
                      <TableCell>{mandatory.level}</TableCell>
                      <TableCell>{mandatory.mode}</TableCell>
                      <TableCell>{mandatory.user}</TableCell>
                      <TableCell>{titleize(record.action) ?? record.action}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(record.xpDelta ?? 0)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No engagement events recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
