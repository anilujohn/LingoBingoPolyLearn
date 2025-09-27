import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminService, type AIModelListItem } from "@/services/admin-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const tierLabels: Record<string, string> = {
  budget: "Budget",
  standard: "Standard",
  premium: "Premium",
  enterprise: "Enterprise",
};

export default function AdminAIModels() {
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery({
    queryKey: ["/api/admin/ai-models"],
    queryFn: AdminService.listAIModels,
  });

  const selectModelMutation = useMutation({
    mutationFn: AdminService.selectAIModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-models"] });
    },
  });

  const models = data?.models ?? [];
  const activeModelId = data?.activeModelId;

  if (isPending) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground">Loading available AI models…</p>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Model Configuration</CardTitle>
            <CardDescription>
              Unable to load model catalogue. Try again later.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">AI Model Settings</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Choose which AI model powers lesson generation, translations, and feedback. The active
          model applies globally until subscription-based overrides are implemented.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Available Models</CardTitle>
          <CardDescription>
            Currently selected model: <span className="font-medium">{activeModelId}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {models.map((model) => {
            const isActive = model.isActive;
            return (
              <div key={model.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{model.label}</h2>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Active" : "Available"}
                      </Badge>
                      <Badge variant="outline">{tierLabels[model.tier] ?? model.tier}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
                    {model.costNote && (
                      <p className="text-xs text-muted-foreground mt-1">{model.costNote}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={isActive || selectModelMutation.isPending}
                    onClick={() => selectModelMutation.mutate(model.id)}
                  >
                    {isActive ? "Currently Active" : "Set as Active"}
                  </Button>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Provider: {model.provider}</span>
                  <span>Capabilities: {renderCapabilities(model)}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}

function renderCapabilities(model: AIModelListItem) {
  const capabilities: string[] = [];
  if (model.capabilities.contentGeneration) {
    capabilities.push("Content generation");
  }
  if (model.capabilities.translation) {
    capabilities.push("Translation");
  }
  if (model.capabilities.evaluation) {
    capabilities.push("Feedback & evaluation");
  }
  return capabilities.join(" · ");
}
