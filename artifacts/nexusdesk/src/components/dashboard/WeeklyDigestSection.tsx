import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";

interface DigestArtifact {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export function WeeklyDigestSection() {
  const [digest, setDigest] = useState<DigestArtifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchDigest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/digest/latest");
      if (res.ok) {
        setDigest(await res.json());
      } else {
        setDigest(null);
      }
    } catch {
      setDigest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/digest/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      toast({ title: "Digest generated", description: "Refreshing view..." });
      setTimeout(() => fetchDigest(), 3000);
    } catch (err: unknown) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Could not generate digest",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <BrutalCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold uppercase tracking-tight">Weekly Digest</h3>
        <BrutalButton
          variant="sage"
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2"
        >
          {generating && <Spinner className="size-3" />}
          Generate Now
        </BrutalButton>
      </div>

      {loading ? (
        <div className="h-32 bg-surface animate-pulse border-2 border-ink" />
      ) : digest ? (
        <div className="prose prose-sm max-w-none font-body border-2 border-ink p-4 bg-paper">
          <ReactMarkdown>{digest.content}</ReactMarkdown>
        </div>
      ) : (
        <p className="font-mono text-sm text-inkLight">
          No digest yet — click Generate Now to create your first one.
        </p>
      )}
    </BrutalCard>
  );
}
