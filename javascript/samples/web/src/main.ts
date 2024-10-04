// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LowLevelRTClient } from "rt-client";
import { createConfigMessage, isAzureOpenAI, guessIfIsAzureOpenAI } from "./config";
import { InputState, setFormInputState, makeNewTextBlock, appendToTextBlock } from "./ui";
import { resetAudio, playAudio, clearAudio, saveAudioBlob, createAudioElement, getRecordedAudioBlob, clearRecordedAudio, getRecordedAudioBase64 } from "./audio";
import { saveToLocalStorage, loadFromLocalStorage } from "./storage";
import "./style.css";

let realtimeStreaming: LowLevelRTClient;
let latestInputSpeechBlock: Element;
let mutationTimer: NodeJS.Timeout | null = null;
let lastMutationTime: number = 0;
let autoStopTimer: NodeJS.Timeout | null = null;
let isOneTimeTalking = false;
let isWaitingForResponse = false;

async function start_realtime(endpoint: string, apiKey: string, deploymentOrModel: string) {
  if (isAzureOpenAI()) {
    realtimeStreaming = new LowLevelRTClient(new URL(endpoint), { key: apiKey }, { deployment: deploymentOrModel });
  } else {
    realtimeStreaming = new LowLevelRTClient({ key: apiKey }, { model: deploymentOrModel });
  }

  try {
    console.log("sending session config");
    //get voice from dropdown
    const voice = document.querySelector<HTMLSelectElement>("#voice-select")?.value;
    await realtimeStreaming.send(createConfigMessage({ voice: voice }));
    console.log("sent session config:", `voice: ${voice}`);
  } catch (error) {
    console.log(error);
    makeNewTextBlock("[Connection error]: Unable to send initial config message. Please check your endpoint and authentication details.");
    setFormInputState(InputState.ReadyToStart);
    return;
  }
  console.log("sent");
  await Promise.all([resetAudio(true, sendAudioBuffer), handleRealtimeMessages()]);
  startMutationObserver(); // Start observing mutations after initializing
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
        //clearRecordedAudio(); // dont clear here, because there is delay from server
        break;
      case "input_audio_buffer.committed":
        console.log("###### HandleRealtimeMessages: input audio buffer committed");
        const recordedAudioBlob = getRecordedAudioBlob();
        const audioElement = createAudioElement(recordedAudioBlob);
        
        // Append the audio element to the latest input speech block
        if (latestInputSpeechBlock) {
          latestInputSpeechBlock.appendChild(audioElement);
        } else {
          document.querySelector<HTMLDivElement>("#received-text-container")?.appendChild(audioElement);
        }
        
        // Clear the recorded audio for the next recording
        clearRecordedAudio(); // Clear recorded audio after committing
        break;

      case "input_audio_buffer.speech_stopped":
        console.log("###### HandleRealtimeMessages: input audio buffer speech stopped");
        //clearRecordedAudio(); // Clear recorded audio when speech stops
        break;
      case "conversation.item.input_audio_transcription.completed":
        console.log("###### HandleRealtimeMessages: conversation.item.input_audio_transcription.completed:", message);
        if (latestInputSpeechBlock) {
          latestInputSpeechBlock.textContent += "User: " + message.transcript;
          
          // Create a new paragraph for the audio element
          const audioContainer = document.createElement('p');
          const recordedAudioBlob = getRecordedAudioBlob();
          const audioElement = createAudioElement(recordedAudioBlob);
          audioContainer.appendChild(audioElement);
          
          // Insert the audio container after the text content
          latestInputSpeechBlock.parentNode?.insertBefore(audioContainer, latestInputSpeechBlock.nextSibling);
        }
        break;
      case "conversation.item.input_audio_transcription.failed":
        console.log("###### HandleRealtimeMessages: conversation.item.input_audio_transcription.failed:", message);
        break;
      case "response.done":
        console.log("###### HandleRealtimeMessages: response done");
        if (currentAudioChunks.length > 0) {
          const audioBlob = saveAudioBlob(currentAudioChunks);
          const audioElement = createAudioElement(audioBlob);
          document.querySelector<HTMLDivElement>("#received-text-container")?.appendChild(audioElement);
        }
        document.querySelector<HTMLDivElement>("#received-text-container")?.appendChild(document.createElement("hr"));
        
        // Close the connection if it was a one-time talk and we're waiting for a response
        if (isOneTimeTalking && isWaitingForResponse) {
          isOneTimeTalking = false;
          isWaitingForResponse = false;
          await realtimeStreaming.close();
          resetAudio(false, sendAudioBuffer);
          setFormInputState(InputState.ReadyToStart);
        }
        break;
      default:
        consoleLog = JSON.stringify(message, null, 2);
        break;
    }
    if (consoleLog) {
      console.log(consoleLog);
    }

    // Reset the mutation timer on each message
    if (mutationTimer) {
      clearTimeout(mutationTimer);
    }
    lastMutationTime = Date.now();
    mutationTimer = setTimeout(checkForInactivity, 30000);

    // Reset the auto-stop timer on each message
    resetAutoStopTimer();
  }
  resetAudio(false, sendAudioBuffer);
}

function startMutationObserver() {
  const targetNode = document.querySelector<HTMLDivElement>("#received-text-container");
  if (!targetNode) return;

  const observerOptions = {
    childList: true,
    subtree: true,
    characterData: true
  };

  const observer = new MutationObserver(() => {
    lastMutationTime = Date.now();
    if (mutationTimer) {
      clearTimeout(mutationTimer);
    }
    mutationTimer = setTimeout(checkForInactivity, getAutoStopTime() * 1000); 
  });

  observer.observe(targetNode, observerOptions);
  lastMutationTime = Date.now();
  mutationTimer = setTimeout(checkForInactivity, getAutoStopTime() * 1000); 
}

function checkForInactivity() {
  if (Date.now() - lastMutationTime >= getAutoStopTime() * 1000) {
    console.log("No mutations for " + getAutoStopTime() + " seconds. Stopping recording.");
    document.querySelector<HTMLButtonElement>("#stop-recording")?.click();
  }
}

// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    button.classList.add('active');
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
  });
});

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
    startAutoStopTimer(); // Start the auto-stop timer when recording starts
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

  // Clear the mutation observer timer
  if (mutationTimer) {
    clearTimeout(mutationTimer);
    mutationTimer = null;
  }

  // Clear the auto-stop timer
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
});

document.querySelector<HTMLInputElement>("#endpoint")?.addEventListener('change', async () => {
  guessIfIsAzureOpenAI();
});

// Add event listeners for input changes
document.querySelector<HTMLTextAreaElement>("#session-instructions")?.addEventListener('input', saveToLocalStorage);
document.querySelector<HTMLInputElement>("#endpoint")?.addEventListener('input', saveToLocalStorage);
document.querySelector<HTMLInputElement>("#api-key")?.addEventListener('input', saveToLocalStorage);
document.querySelector<HTMLInputElement>("#deployment-or-model")?.addEventListener('input', saveToLocalStorage);

// Add event listener for auto-stop time input changes
document.querySelector<HTMLInputElement>("#auto-stop-time")?.addEventListener('input', saveToLocalStorage);

// Load saved data when the page opens
loadFromLocalStorage();
guessIfIsAzureOpenAI();

function startAutoStopTimer() {
  const autoStopTime = getAutoStopTime();
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
  }
  autoStopTimer = setTimeout(() => {
    console.log(`Auto-stopping after ${autoStopTime} seconds of inactivity.`);
    document.querySelector<HTMLButtonElement>("#stop-recording")?.click();
  }, autoStopTime * 1000);
}

function getAutoStopTime(): number {
  const autoStopTimeInput = document.querySelector<HTMLInputElement>("#auto-stop-time");
  return autoStopTimeInput ? parseInt(autoStopTimeInput.value) : 30;
}

function resetAutoStopTimer() {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
  }
  startAutoStopTimer();
}

// Modify the handleOneTimeTalk function
async function handleOneTimeTalk() {
  if (isOneTimeTalking) return;
  isOneTimeTalking = true;

  const endpoint = (document.querySelector<HTMLInputElement>("#endpoint")?.value || "").trim();
  const key = (document.querySelector<HTMLInputElement>("#api-key")?.value || "").trim();
  const deploymentOrModel = (document.querySelector<HTMLInputElement>("#deployment-or-model")?.value || "").trim();

  if (isAzureOpenAI() && !endpoint && !deploymentOrModel) {
    alert("Endpoint and Deployment are required for Azure OpenAI");
    isOneTimeTalking = false;
    return;
  }

  if (!isAzureOpenAI() && !deploymentOrModel) {
    alert("Model is required for OpenAI");
    isOneTimeTalking = false;
    return;
  }

  if (!key) {
    alert("API Key is required");
    isOneTimeTalking = false;
    return;
  }

  saveToLocalStorage();

  try {
    await start_realtime(endpoint, key, deploymentOrModel);
    await resetAudio(true, sendAudioBuffer);
  } catch (error) {
    console.log(error);
    isOneTimeTalking = false;
    return;
  }
}

// Modify the stopOneTimeTalk function
async function stopOneTimeTalk() {
  if (!isOneTimeTalking) return;

  isWaitingForResponse = true;
  
  // Stop recording but don't reset the audio yet

  const remainingAudio = getRecordedAudioBase64();
  if (remainingAudio) {
    await realtimeStreaming.send({
      type: "input_audio_buffer.append",
      audio: remainingAudio,
    });
  }
  await realtimeStreaming.send({
    type: "input_audio_buffer.commit"
  });
  // Don't close the connection here, wait for the response
}

// Update event listeners for the "One-Time Talk" button
document.querySelector<HTMLButtonElement>("#one-time-talk")?.addEventListener("pointerdown", async (event) => {
  event.preventDefault();
  await handleOneTimeTalk();
});

document.querySelector<HTMLButtonElement>("#one-time-talk")?.addEventListener("pointerup", async (event) => {
  event.preventDefault();
  await stopOneTimeTalk();
});

document.querySelector<HTMLButtonElement>("#one-time-talk")?.addEventListener("pointerleave", async (event) => {
  event.preventDefault();
  if (isOneTimeTalking && !isWaitingForResponse) {
    await stopOneTimeTalk();
  }
});

function saveVoiceSelection() {
  const voiceSelect = document.querySelector<HTMLSelectElement>("#voice-select");
  if (voiceSelect) {
    localStorage.setItem("selectedVoice", voiceSelect.value);
  }
}

function loadVoiceSelection() {
  const voiceSelect = document.querySelector<HTMLSelectElement>("#voice-select");
  const savedVoice = localStorage.getItem("selectedVoice");
  if (voiceSelect && savedVoice) {
    voiceSelect.value = savedVoice;
  }
}

// Call loadVoiceSelection when the page loads
document.addEventListener("DOMContentLoaded", () => {
  loadVoiceSelection();
  // Add event listener to save voice selection on change
  const voiceSelect = document.querySelector<HTMLSelectElement>("#voice-select");
  if (voiceSelect) {
    voiceSelect.addEventListener("change", saveVoiceSelection);
  }
});