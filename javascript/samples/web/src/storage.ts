const STORAGE_KEY_MESSAGE_UI = 'messageUI';
const STORAGE_KEY_ENDPOINT = 'endpoint';
const STORAGE_KEY_API_KEY = 'apiKey';
const STORAGE_KEY_DEPLOYMENT_OR_MODEL = 'deploymentOrModel';

export function saveToLocalStorage() {
  const formSessionInstructionsField = document.querySelector<HTMLTextAreaElement>("#session-instructions");
  const formEndpointField = document.querySelector<HTMLInputElement>("#endpoint");
  const formApiKeyField = document.querySelector<HTMLInputElement>("#api-key");
  const formDeploymentOrModelField = document.querySelector<HTMLInputElement>("#deployment-or-model");

  if (formSessionInstructionsField) localStorage.setItem(STORAGE_KEY_MESSAGE_UI, formSessionInstructionsField.value);
  if (formEndpointField) localStorage.setItem(STORAGE_KEY_ENDPOINT, formEndpointField.value);
  if (formApiKeyField) localStorage.setItem(STORAGE_KEY_API_KEY, formApiKeyField.value);
  if (formDeploymentOrModelField) localStorage.setItem(STORAGE_KEY_DEPLOYMENT_OR_MODEL, formDeploymentOrModelField.value);
}

export function loadFromLocalStorage() {
  const formSessionInstructionsField = document.querySelector<HTMLTextAreaElement>("#session-instructions");
  const formEndpointField = document.querySelector<HTMLInputElement>("#endpoint");
  const formApiKeyField = document.querySelector<HTMLInputElement>("#api-key");
  const formDeploymentOrModelField = document.querySelector<HTMLInputElement>("#deployment-or-model");

  if (formSessionInstructionsField) formSessionInstructionsField.value = localStorage.getItem(STORAGE_KEY_MESSAGE_UI) || '';
  if (formEndpointField) formEndpointField.value = localStorage.getItem(STORAGE_KEY_ENDPOINT) || '';
  if (formApiKeyField) formApiKeyField.value = localStorage.getItem(STORAGE_KEY_API_KEY) || '';
  if (formDeploymentOrModelField) formDeploymentOrModelField.value = localStorage.getItem(STORAGE_KEY_DEPLOYMENT_OR_MODEL) || '';
}