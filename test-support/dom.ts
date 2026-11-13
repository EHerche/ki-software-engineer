export function element<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const match = root.querySelector<T>(selector);
  if (!match) throw new Error(`Expected element: ${selector}`);
  return match;
}

export function labelledField(root: ParentNode, text: string): HTMLInputElement | HTMLTextAreaElement {
  const label = Array.from(root.querySelectorAll<HTMLLabelElement>('label')).find(label => label.textContent?.trim() === text);
  if (!label) throw new Error(`Expected label: ${text}`);
  return element<HTMLInputElement | HTMLTextAreaElement>(root, `[id="${label.htmlFor}"]`);
}
