import { WEBUI_MODEL_PICKER_PREFIX } from '@/utils/modelPickerConstants';

export type ModelPickerPayload = {
  v: number;
  kind: 'model_picker';
  provider: string;
  provider_name: string;
  current?: string | null;
  options: string[];
};

export function parseModelPicker(content: string): ModelPickerPayload | null {
  if (!content.startsWith(WEBUI_MODEL_PICKER_PREFIX)) {
    return null;
  }
  try {
    const raw = JSON.parse(content.slice(WEBUI_MODEL_PICKER_PREFIX.length)) as ModelPickerPayload;
    if (raw?.kind === 'model_picker' && Array.isArray(raw.options)) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}
