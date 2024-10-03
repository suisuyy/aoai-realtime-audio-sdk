import { Recorder } from "./recorder";
import { Player } from "./player";

let audioRecorder: Recorder;
let audioPlayer: Player;
let recordingActive: boolean = false;
let buffer: Uint8Array = new Uint8Array();
let recordedAudioChunks: Int16Array[] = [];

export function combineArray(newData: Uint8Array) {
  const newBuffer = new Uint8Array(buffer.length + newData.length);
  newBuffer.set(buffer);
  newBuffer.set(newData, buffer.length);
  buffer = newBuffer;
}

export function processAudioRecordingBuffer(data: Buffer, sendAudioBuffer: (base64: string) => void) {
  const uint8Array = new Uint8Array(data);
  combineArray(uint8Array);
  if (buffer.length >= 4800) {
    const toSend = new Uint8Array(buffer.slice(0, 4800));
    buffer = new Uint8Array(buffer.slice(4800));
    const regularArray = String.fromCharCode(...toSend);
    const base64 = btoa(regularArray);
    if (recordingActive) {
      sendAudioBuffer(base64);
      // Store the recorded audio data
      recordedAudioChunks.push(new Int16Array(toSend.buffer));
    }
  }
}

export async function resetAudio(startRecording: boolean, sendAudioBuffer: (base64: string) => void) {
  recordingActive = false;
  if (audioRecorder) {
    audioRecorder.stop();
  }
  if (audioPlayer) {
    audioPlayer.clear();
  }
  audioRecorder = new Recorder((data) => processAudioRecordingBuffer(data, sendAudioBuffer));
  audioPlayer = new Player();
  await audioPlayer.init(24000);
  if (startRecording) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioRecorder.start(stream);
    recordingActive = true;
  }
}

export function playAudio(pcmData: Int16Array) {
  audioPlayer.play(pcmData);
}

export function clearAudio() {
  audioPlayer.clear();
}

export function saveAudioBlob(audioChunks: Int16Array[]): Blob {
  // Combine all audio chunks
  const combinedBuffer = new Int16Array(audioChunks.reduce((acc, chunk) => acc + chunk.length, 0));
  let offset = 0;
  for (const chunk of audioChunks) {
    combinedBuffer.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert Int16Array to Float32Array
  const floatArray = new Float32Array(combinedBuffer.length);
  for (let i = 0; i < combinedBuffer.length; i++) {
    floatArray[i] = combinedBuffer[i] / 32768.0;
  }

  // Create WAV file
  const wavBuffer = createWavFile(floatArray, 24000);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

export function createAudioElement(audioBlob: Blob): HTMLAudioElement {
  const audioUrl = URL.createObjectURL(audioBlob);
  const audioElement = document.createElement('audio');
  audioElement.src = audioUrl;
  audioElement.controls = true;
  return audioElement;
}

function createWavFile(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write audio data
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

export function getRecordedAudioBlob(): Blob {
  return saveAudioBlob(recordedAudioChunks);
}

export function clearRecordedAudio() {
  recordedAudioChunks = [];
}