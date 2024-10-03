export enum InputState {
  Working,
  ReadyToStart,
  ReadyToStop,
}

export function setFormInputState(state: InputState) {
  const formEndpointField = document.querySelector<HTMLInputElement>("#endpoint");
  const formApiKeyField = document.querySelector<HTMLInputElement>("#api-key");
  const formDeploymentOrModelField = document.querySelector<HTMLInputElement>("#deployment-or-model");
  const formStartButton = document.querySelector<HTMLButtonElement>("#start-recording");
  const formStopButton = document.querySelector<HTMLButtonElement>("#stop-recording");
  const formSessionInstructionsField = document.querySelector<HTMLTextAreaElement>("#session-instructions");
  const formAzureToggle = document.querySelector<HTMLInputElement>("#azure-toggle");

  if (formEndpointField) formEndpointField.disabled = state != InputState.ReadyToStart;
  if (formApiKeyField) formApiKeyField.disabled = state != InputState.ReadyToStart;
  if (formDeploymentOrModelField) formDeploymentOrModelField.disabled = state != InputState.ReadyToStart;
  if (formStartButton) formStartButton.disabled = state != InputState.ReadyToStart;
  if (formStopButton) formStopButton.disabled = state != InputState.ReadyToStop;
  if (formSessionInstructionsField) formSessionInstructionsField.disabled = state != InputState.ReadyToStart;
  if (formAzureToggle) formAzureToggle.disabled = state != InputState.ReadyToStart;
}

export function makeNewTextBlock(text: string = "") {
  const formReceivedTextContainer = document.querySelector<HTMLDivElement>("#received-text-container");
  if (formReceivedTextContainer) {
    let newElement = document.createElement("p");
    newElement.textContent = text;
    formReceivedTextContainer.appendChild(newElement);
  }
}

export function appendToTextBlock(text: string) {
  const formReceivedTextContainer = document.querySelector<HTMLDivElement>("#received-text-container");
  if (formReceivedTextContainer) {
    let textElements = formReceivedTextContainer.children;
    if (textElements.length == 0) {
      makeNewTextBlock();
    }
    textElements[textElements.length - 1].textContent += text;
  }
}