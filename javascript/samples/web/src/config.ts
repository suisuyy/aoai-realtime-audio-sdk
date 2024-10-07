import { SessionUpdateMessage, Voice } from "rt-client";

export function createConfigMessage(options: { voice?: string }): SessionUpdateMessage {
  let configMessage: SessionUpdateMessage = {
    type: "session.update",
    session: {
      voice: options.voice as Voice || "breeze", // Cast the voice to Voice type
      modalities: ["audio", "text"],
      temperature: getTemperature(),
      max_response_output_tokens: 600,
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 1000,
        silence_duration_ms: 2000,
      },
    }
  };

  const systemMessage = getSystemMessage();

  if (systemMessage) {
    configMessage.session.instructions = systemMessage;
  }

  return configMessage;
}

export function getSystemMessage(): string {
  const defaultMessage = `you are powerful voice assistant, you can make long pleasant melody and sing various songs, you can make nice and real  and long sound effect.

you can generate long(more than 10s), continuous melodies or extend them.

you can imitate different people voice`;

  const textarea = document.querySelector<HTMLTextAreaElement>("#session-instructions");
  const userMessage = textarea?.value.trim() || "";

  if (userMessage === "") {
    if (textarea) {
      textarea.value = defaultMessage;
    }
    return defaultMessage;
  }

  return userMessage;
}

export function getTemperature(): number {
  return parseFloat((document.querySelector<HTMLInputElement>("#temperature")?.value || "0.6"));
}

export function getVoice(): Voice {
  return (document.querySelector<HTMLSelectElement>("#voice-select")?.value as Voice) || "alloy";
}

export function isAzureOpenAI(): boolean {
  return (document.querySelector<HTMLInputElement>("#azure-toggle")?.checked || false);
}

export function guessIfIsAzureOpenAI() {
  const endpoint = (document.querySelector<HTMLInputElement>("#endpoint")?.value || "").trim();
  const azureToggle = document.querySelector<HTMLInputElement>("#azure-toggle");
  if (azureToggle) {
    azureToggle.checked = endpoint.indexOf('azure') > -1;
  }
}