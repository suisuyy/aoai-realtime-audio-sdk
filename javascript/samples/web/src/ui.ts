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

  const disableInputs = state !== InputState.ReadyToStart;
  const elements = [formEndpointField, formApiKeyField, formDeploymentOrModelField, formSessionInstructionsField, formAzureToggle];
  
  elements.forEach(el => {
    if (el) {
      el.disabled = disableInputs;
      el.classList.toggle('input-disabled', disableInputs);
    }
  });

  if (formStartButton) {
    formStartButton.disabled = state !== InputState.ReadyToStart;
    formStartButton.classList.toggle('btn-disabled', state !== InputState.ReadyToStart);
  }
  if (formStopButton) {
    formStopButton.disabled = state !== InputState.ReadyToStop;
    formStopButton.classList.toggle('btn-disabled', state !== InputState.ReadyToStop);
  }
}

export function makeNewTextBlock(text: string = "") {
  const formReceivedTextContainer = document.querySelector<HTMLDivElement>("#received-text-container");
  if (formReceivedTextContainer) {
    let newElement = document.createElement("p");
    newElement.textContent = text;
    newElement.className = "mb-2";
    formReceivedTextContainer.appendChild(newElement);
    formReceivedTextContainer.scrollTop = formReceivedTextContainer.scrollHeight;
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
    formReceivedTextContainer.scrollTop = formReceivedTextContainer.scrollHeight;
  }
}