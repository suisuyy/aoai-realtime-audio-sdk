// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LowLevelRTClient } from "rt-client";
import { createConfigMessage, isAzureOpenAI, guessIfIsAzureOpenAI } from "./config";
import { InputState, setFormInputState, makeNewTextBlock, appendToTextBlock } from "./ui";
import { resetAudio, playAudio, clearAudio, saveAudioBlob, createAudioElement, getRecordedAudioBlob, clearRecordedAudio } from "./audio";
import { saveToLocalStorage, loadFromLocalStorage } from "./storage";
import "./style.css";

let realtimeStreaming: LowLevelRTClient;
let latestInputSpeechBlock: Element;

async function start_realtime(endpoint: string, apiKey: string, deploymentOrModel: string) {
  if (isAzureOpenAI()) {
    realtimeStreaming = new LowLevelRTClient(new URL(endpoint), { key: apiKey }, { deployment: deploymentOrModel });
  } else {
    realtimeStreaming = new LowLevelRTClient({ key: apiKey }, { model: deploymentOrModel });
  }

  try {
    console.log("sending session config");
    await realtimeStreaming.send(createConfigMessage());
  } catch (error) {
    console.log(error);
    makeNewTextBlock("[Connection error]: Unable to send initial config message. Please check your endpoint and authentication details.");
    setFormInputState(InputState.ReadyToStart);
    return;
  }
  console.log("sent");
  await Promise.all([resetAudio(true, sendAudioBuffer), handleRealtimeMessages()]);
}

function sendAudioBuffer(base64: string) {
  realtimeStreaming.send({
    type: "input_audio_buffer.append",
    audio: base64,
  });
}

async function handleRealtimeMessages() {
  let currentAudioChunks: Int16Array[] = [];

  for await (const message of realtimeStreaming.messages()) {
    let consoleLog = "" + message.type;

    switch (message.type) {
      case "session.created":
        setFormInputState(InputState.ReadyToStop);
        makeNewTextBlock("<< Session Started >>");
        makeNewTextBlock();
        break;
      case "response.audio_transcript.delta":
        appendToTextBlock(message.delta);
        break;
      case "response.audio.delta":
        const binary = atob(message.delta);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const pcmData = new Int16Array(bytes.buffer);
        currentAudioChunks.push(pcmData);
        playAudio(pcmData);
        break;

      case "response.created":
        console.log("response created");
        currentAudioChunks = []; // Reset audio chunks for new response
        break;
      case "input_audio_buffer.speech_started":
        makeNewTextBlock("<< Speech Started >>");
        let textElements = document.querySelector<HTMLDivElement>("#received-text-container")?.children;
        if (textElements) {
          latestInputSpeechBlock = textElements[textElements.length - 1];
        }
        makeNewTextBlock();
        clearAudio();
        break;
      case "input_audio_buffer.committed":
        console.log("HandleRealtimeMessages: input audio buffer committed");
        const recordedAudioBlob = getRecordedAudioBlob();
        const audioElement = createAudioElement(recordedAudioBlob);
        
        // Append the audio element to the latest input speech block
        if (latestInputSpeechBlock) {
          latestInputSpeechBlock.appendChild(audioElement);
        } else {
          document.querySelector<HTMLDivElement>("#received-text-container")?.appendChild(audioElement);
        }
        
        // Clear the recorded audio for the next recording
        clearRecordedAudio();
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (latestInputSpeechBlock) {
          latestInputSpeechBlock.textContent += " User: " + message.transcript;
        }
        break;
      case "response.done":
        console.log("response done");
        if (currentAudioChunks.length > 0) {
          const audioBlob = saveAudioBlob(currentAudioChunks);
          const audioElement = createAudioElement(audioBlob);
          document.querySelector<HTMLDivElement>("#received-text-container")?.appendChild(audioElement);
        }
        document.querySelector<HTMLDivElement>("#received-text-container")?.appendChild(document.createElement("hr"));
        break;
      default:
        consoleLog = JSON.stringify(message, null, 2);
        break;
    }
    if (consoleLog) {
      console.log(consoleLog);
    }
  }
  resetAudio(false, sendAudioBuffer);
}

// Event Listeners
document.querySelector<HTMLButtonElement>("#start-recording")?.addEventListener("click", async () => {
  setFormInputState(InputState.Working);

  const endpoint = (document.querySelector<HTMLInputElement>("#endpoint")?.value || "").trim();
  const key = (document.querySelector<HTMLInputElement>("#api-key")?.value || "").trim();
  const deploymentOrModel = (document.querySelector<HTMLInputElement>("#deployment-or-model")?.value || "").trim();

  if (isAzureOpenAI() && !endpoint && !deploymentOrModel) {
    alert("Endpoint and Deployment are required for Azure OpenAI");
    return;
  }

  if (!isAzureOpenAI() && !deploymentOrModel) {
    alert("Model is required for OpenAI");
    return;
  }

  if (!key) {
    alert("API Key is required");
    return;
  }

  saveToLocalStorage();

  try {
    start_realtime(endpoint, key, deploymentOrModel);
  } catch (error) {
    console.log(error);
    setFormInputState(InputState.ReadyToStart);
  }
});

document.querySelector<HTMLButtonElement>("#stop-recording")?.addEventListener("click", async () => {
  setFormInputState(InputState.Working);
  resetAudio(false, sendAudioBuffer);
  realtimeStreaming.close();
  setFormInputState(InputState.ReadyToStart);
});

document.querySelector<HTMLInputElement>("#endpoint")?.addEventListener('change', async () => {
  guessIfIsAzureOpenAI();
});

// Add event listeners for input changes
document.querySelector<HTMLTextAreaElement>("#session-instructions")?.addEventListener('input', saveToLocalStorage);
document.querySelector<HTMLInputElement>("#endpoint")?.addEventListener('input', saveToLocalStorage);
document.querySelector<HTMLInputElement>("#api-key")?.addEventListener('input', saveToLocalStorage);
document.querySelector<HTMLInputElement>("#deployment-or-model")?.addEventListener('input', saveToLocalStorage);

// Load saved data when the page opens
loadFromLocalStorage();
guessIfIsAzureOpenAI();