import { useState, useEffect } from "react";
import { Settings, X, Eye, EyeOff } from "lucide-react";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";

export type LLMProvider = "gemini" | "openai" | "anthropic" | "ollama";

export interface LLMSettings {
  provider: LLMProvider;
  model: string;
  apiKey: string;
}

const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro"],
  openai: ["gpt-4o", "gpt-4o-mini"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
  ollama: ["llama3", "llama3.2-vision"],
};

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI GPT",
  anthropic: "Anthropic Claude",
  ollama: "Ollama (Local)",
};

function loadSettings(): LLMSettings {
  try {
    const s = localStorage.getItem("nexusdesk_llm_settings");
    if (s) return JSON.parse(s);
  } catch {}
  return { provider: "gemini", model: "gemini-2.5-flash", apiKey: "" };
}

function saveSettings(s: LLMSettings) {
  localStorage.setItem("nexusdesk_llm_settings", JSON.stringify(s));
}

export function getLLMSettings(): LLMSettings {
  return loadSettings();
}

export function getConnectivityStatus(): "server" | "custom" | "none" {
  const s = loadSettings();
  if (s.apiKey && s.apiKey.trim().length > 10) return "custom";
  return "server";
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<LLMSettings>(loadSettings);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setSaved(false);
    }
  }, [open]);

  const handleProviderChange = (provider: LLMProvider) => {
    setSettings(prev => ({
      ...prev,
      provider,
      model: PROVIDER_MODELS[provider][0],
    }));
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50">
      <div className="w-full max-w-lg bg-paper border-4 border-ink shadow-brutal-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b-2 border-ink bg-surface">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5" />
            <h2 className="font-heading text-xl font-bold uppercase tracking-tight">Settings</h2>
          </div>
          <button onClick={onClose} className="border-2 border-ink p-1 hover:bg-surfaceHover shadow-brutal-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-inkLight border-b-2 border-ink pb-2 mb-4">
              LLM Provider
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PROVIDER_LABELS) as [LLMProvider, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleProviderChange(key)}
                  className={`font-mono text-xs font-bold py-3 px-3 border-2 border-ink transition-all duration-100 text-left ${
                    settings.provider === key
                      ? "bg-ink text-paper shadow-brutal-sm -translate-x-[2px] -translate-y-[2px]"
                      : "bg-surface text-ink hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-inkLight border-b-2 border-ink pb-2 mb-4">
              Model
            </h3>
            <div className="flex flex-col gap-2">
              {PROVIDER_MODELS[settings.provider].map(model => (
                <button
                  key={model}
                  onClick={() => setSettings(prev => ({ ...prev, model }))}
                  className={`font-mono text-xs font-bold py-2 px-3 border-2 border-ink text-left transition-all duration-100 ${
                    settings.model === model
                      ? "bg-sage text-paper shadow-brutal-sm -translate-x-[1px] -translate-y-[1px]"
                      : "bg-surface hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutal-sm"
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          </div>

          {settings.provider !== "ollama" && (
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-inkLight border-b-2 border-ink pb-2 mb-4">
                API Key
              </h3>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={e => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={
                    settings.provider === "gemini" ? "AIzaSy..." :
                    settings.provider === "openai" ? "sk-..." :
                    "sk-ant-..."
                  }
                  className="w-full border-2 border-ink bg-paper p-2 pr-10 font-mono text-sm focus:outline-none focus:bg-surface"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-2.5 text-inkLight hover:text-ink"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="font-mono text-[10px] text-inkFaint mt-2 leading-relaxed">
                Stored locally in browser. If blank, the server's env key ({settings.provider === "gemini" ? "GEMINI_API_KEY" : settings.provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"}) is used automatically.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t-2 border-ink">
            <BrutalButton onClick={onClose}>Cancel</BrutalButton>
            <BrutalButton variant="primary" onClick={handleSave}>
              {saved ? "Saved!" : "Save Settings"}
            </BrutalButton>
          </div>
        </div>
      </div>
    </div>
  );
}
