"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";

export interface DisplaySettings {
  writingMode: "horizontal" | "vertical";
  fontSize: 1 | 2 | 3 | 4;
  characters: "auto" | number;
}
export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  writingMode: "horizontal",
  fontSize: 2,
  characters: "auto",
};

export function useDisplaySettings(storageKey: "reader" | "preview") {
  const key = `balloon-display-${storageKey}`;
  const [settings, setSettings] = useState(DEFAULT_DISPLAY_SETTINGS);
  useEffect(() => {
    try {
      const value = localStorage.getItem(key);
      if (value)
        setSettings({
          ...DEFAULT_DISPLAY_SETTINGS,
          ...(JSON.parse(value) as DisplaySettings),
        });
    } catch {
      /* defaults */
    }
  }, [key]);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(settings));
  }, [key, settings]);
  return [settings, setSettings] as const;
}

export function DisplaySettingsButton({
  settings,
  onChange,
}: {
  settings: DisplaySettings;
  onChange: (value: DisplaySettings) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings size={17} />
          表示設定
        </Button>
      </DialogTrigger>
      <DialogContent title="表示設定">
        <div className="grid gap-5">
          <fieldset>
            <legend className="mb-2 font-medium">方向</legend>
            <div className="flex gap-2">
              <Button
                variant={
                  settings.writingMode === "horizontal" ? "default" : "ghost"
                }
                onClick={() =>
                  onChange({ ...settings, writingMode: "horizontal" })
                }
              >
                横書き
              </Button>
              <Button
                variant={
                  settings.writingMode === "vertical" ? "default" : "ghost"
                }
                onClick={() =>
                  onChange({ ...settings, writingMode: "vertical" })
                }
              >
                縦書き
              </Button>
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-medium">文字サイズ</legend>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map((size) => (
                <Button
                  key={size}
                  size="sm"
                  variant={settings.fontSize === size ? "default" : "ghost"}
                  onClick={() => onChange({ ...settings, fontSize: size })}
                >
                  {size}
                </Button>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-2 font-medium">
            1行 / 1列の文字数
            <input
              className="input"
              type="number"
              min="10"
              max="100"
              placeholder="自動"
              value={settings.characters === "auto" ? "" : settings.characters}
              onChange={(event) =>
                onChange({
                  ...settings,
                  characters: event.target.value
                    ? Math.max(10, Math.min(100, Number(event.target.value)))
                    : "auto",
                })
              }
            />
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
