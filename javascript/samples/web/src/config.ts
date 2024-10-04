import { SessionUpdateMessage, Voice } from "rt-client";

export function createConfigMessage(options: { voice?: string }): SessionUpdateMessage {
  let configMessage: SessionUpdateMessage = {
    type: "session.update",
    session: {
     voice: options.voice || "shimmer", // Ensure this uses the passed voice
      modalities: ["audio", "text"],
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
  const temperature = getTemperature();
  const voice = getVoice();

  if (systemMessage) {
    configMessage.session.instructions = systemMessage;
  }
  if (!isNaN(temperature)) {
    configMessage.session.temperature = temperature;
  }
  

  return configMessage;
}

export function getSystemMessage(): string {
  return (document.querySelector<HTMLTextAreaElement>("#session-instructions")?.value || "");
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