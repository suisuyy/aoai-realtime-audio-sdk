const STORAGE_KEY_MESSAGE_UI = 'messageUI';
const STORAGE_KEY_ENDPOINT = 'endpoint';
const STORAGE_KEY_API_KEY = 'apiKey';
const STORAGE_KEY_DEPLOYMENT_OR_MODEL = 'deploymentOrModel';
const STORAGE_KEY_AUTO_STOP_TIME = 'autoStopTime';

export function saveToLocalStorage() {
  const formSessionInstructionsField = document.querySelector<HTMLTextAreaElement>("#session-instructions");
  const formEndpointField = document.querySelector<HTMLInputElement>("#endpoint");
  const formApiKeyField = document.querySelector<HTMLInputElement>("#api-key");
  const formDeploymentOrModelField = document.querySelector<HTMLInputElement>("#deployment-or-model");
  const formAutoStopTimeField = document.querySelector<HTMLInputElement>("#auto-stop-time");

  if (formSessionInstructionsField) localStorage.setItem(STORAGE_KEY_MESSAGE_UI, formSessionInstructionsField.value);
  if (formEndpointField) localStorage.setItem(STORAGE_KEY_ENDPOINT, formEndpointField.value);
  if (formApiKeyField) localStorage.setItem(STORAGE_KEY_API_KEY, formApiKeyField.value);
  if (formDeploymentOrModelField) localStorage.setItem(STORAGE_KEY_DEPLOYMENT_OR_MODEL, formDeploymentOrModelField.value);
  if (formAutoStopTimeField) localStorage.setItem(STORAGE_KEY_AUTO_STOP_TIME, formAutoStopTimeField.value);
}

export function loadFromLocalStorage() {
  const formSessionInstructionsField = document.querySelector<HTMLTextAreaElement>("#session-instructions");
  const formEndpointField = document.querySelector<HTMLInputElement>("#endpoint");
  const formApiKeyField = document.querySelector<HTMLInputElement>("#api-key");
  const formDeploymentOrModelField = document.querySelector<HTMLInputElement>("#deployment-or-model");
  const formAutoStopTimeField = document.querySelector<HTMLInputElement>("#auto-stop-time");

  if (formSessionInstructionsField) formSessionInstructionsField.value = localStorage.getItem(STORAGE_KEY_MESSAGE_UI) || '';
  if (formEndpointField) formEndpointField.value = localStorage.getItem(STORAGE_KEY_ENDPOINT) || '';
  if (formApiKeyField) formApiKeyField.value = localStorage.getItem(STORAGE_KEY_API_KEY) || '';
  if (formDeploymentOrModelField) formDeploymentOrModelField.value = localStorage.getItem(STORAGE_KEY_DEPLOYMENT_OR_MODEL) || '';
  if (formAutoStopTimeField) formAutoStopTimeField.value = localStorage.getItem(STORAGE_KEY_AUTO_STOP_TIME) || '30';
}